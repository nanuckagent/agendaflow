# Autenticação e Verificação

Cobre os fluxos de autenticação: signup, login, **reset de senha**, **verificação de email** e **Google OAuth**.

## Visão geral

| Fluxo | Endpoint | Auth |
|---|---|---|
| Signup self-service | `POST /v1/auth/register` | Público |
| Login email/senha | `POST /v1/auth/login` | Público |
| Refresh access token | `POST /v1/auth/refresh` | Cookie httpOnly |
| Logout | `POST /v1/auth/logout` | Cookie httpOnly |
| Esqueci a senha | `POST /v1/auth/forgot-password` | Público (rate 5/15min) |
| Redefinir senha | `POST /v1/auth/reset-password` | Token único (rate 10/15min) |
| Verificar email | `POST /v1/auth/verify-email` | Token único |
| Reenviar verificação | `POST /v1/auth/resend-verification` | Bearer (rate 3/15min) |
| Dados do usuário | `GET /v1/auth/me` | Bearer |
| Iniciar Google OAuth | `GET /v1/auth/google` | Público |
| Callback Google | `POST /v1/auth/google/callback` | Público |
| Config público | `GET /v1/public/config` | Público |

## Tokens e sessões

- **Access token:** JWT HS256, expira em **15 minutos**, retornado no body e usado como `Authorization: Bearer ...`.
- **Refresh token:** Armazenado em cookie httpOnly `SameSite=Strict`, expira em **7 dias**, persistido na tabela `refresh_tokens` (revogável).
- **Revogação:** Ao redefinir senha, todas as linhas de `refresh_tokens` do usuário recebem `revoked_at = now()`.

## Reset de senha

### Por que tokens em Redis?

Tokens de reset ficam apenas em Redis (não em Postgres) por três razões:
1. **TTL nativo** — 30 minutos automáticos.
2. **Single-use atômico** — `redis.getdel` retorna e apaga o token na mesma operação, eliminando race condition.
3. **Sem schema** — Não polui o banco com tabela transitória.

### Fluxo

```
1. Usuário: POST /v1/auth/forgot-password { email }
   → Server: sempre 200 (anti-enumeração)
   → Se user existe: gera token hex(32), salva pwreset:<token> = userId (TTL 30min),
     enfileira email com link ${FRONTEND_URL}/reset-password?token=...

2. Usuário recebe email → clica no link → preenche nova senha
   → POST /v1/auth/reset-password { token, password }
   → Server: redis.getdel('pwreset:' + token)
     - missing/expired → 401
     - found → bcrypt/argon2 hash → UPDATE users + revokeAllUserTokens(userId)
   → Resposta: { message: "Password updated successfully" }

3. Frontend redireciona para /login depois de 2.5s
```

### Segurança

- **Anti-enumeração:** A resposta é idêntica (200 + mesmo body) para emails que existem e não existem.
- **Token de alta entropia:** `generateToken(32)` → 64 chars hex (256 bits).
- **Rate limit:** 5 requisições por IP em 15 minutos (`forgot-password`), 10 por IP em 15 minutos (`reset-password`).
- **Sessões invalidadas:** Todas as sessões ativas são revogadas para forçar re-login após o reset.

### Sem SMTP configurado

Quando `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` estão vazios em `.env.production`, o worker degrada para log:

```bash
docker logs agendaflow-worker | grep "reset-password?token="
# reset-password?token=a71305205dcb52ad67b51d02e2702444c7872d4633b86f976deddbf2e878f744
```

Útil para testes E2E antes da integração com Brevo. Ver [CREDENTIALS.md](CREDENTIALS.md) para configurar SMTP.

## Verificação de email

### Decisão de design: não-bloqueante

Diferente de muitos SaaS, **login não exige email verificado**. Isso evita um bug clássico onde:
- O usuário se cadastra com email errado de propósito,
- Não recebe o email de verificação,
- Não consegue mais fazer nada,
- Pede suporte para corrigir.

Em vez disso:
- O cadastro envia o email de verificação automaticamente.
- O usuário pode **logar normalmente**.
- Um banner amber aparece no dashboard até a verificação ser concluída.
- O banner tem botão "Reenviar email" (rate-limited).

### Fluxo

```
1. Registro: POST /v1/auth/register cria user com email_verified=false,
   gera token hex(32), salva verifyemail:<token> = userId (TTL 48h),
   enfileira email com link ${FRONTEND_URL}/verify-email?token=...

2. Login: GET /v1/auth/me retorna { ..., emailVerified: false }
   → Dashboard renderiza <EmailVerificationBanner /> entre Header e <main>

3. Usuário clica no email → POST /v1/auth/verify-email { token }
   → Server: redis.getdel('verifyemail:' + token)
     - missing/expired → 401
     - found → UPDATE users SET email_verified=true, email_verified_at=now()
   → Banner some na próxima re-hidratação (/auth/me)

Alternativa: usuário clica em "Reenviar" no banner
   → POST /v1/auth/resend-verification (Bearer)
   → Early-return se já verificado, senão re-gera token e enfileira novo email
```

### Banner

Renderizado em `src/frontend/src/components/layout/EmailVerificationBanner.tsx`:
- Cor amber para não assustar (não é erro, é aviso).
- Mostra o email do usuário.
- Botão "Reenviar" com estado sending/sent inline.
- Hidden quando `user.emailVerified === true`.

## Google OAuth

### Configuração

1. Sem `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` no `.env.production`, o fluxo retorna 503 e os botões "Continuar com Google" são ocultos automaticamente.
2. O frontend detecta a disponibilidade via `GET /v1/public/config`:

```ts
// src/frontend/src/components/auth/GoogleAuthButton.tsx
const cachedEnabled = await apiClient.get('/v1/public/config');
if (!cachedEnabled.googleOAuthEnabled) return null;
```

Ver [CREDENTIALS.md](CREDENTIALS.md) para obter as credenciais no Google Cloud Console.

### Três fluxos no callback

```
POST /v1/auth/google/callback { code }
  → google-auth-library: getToken(code) → verifyIdToken
  → { sub, email, given_name, family_name }
  → emailHash = sha256(email.toLowerCase())

Caso 1 (usuário recorrente): user com google_id = sub
  → atualiza last_login_at, gera tokens, retorna login normal

Caso 2 (vínculo): user com email_hash = hash mas sem google_id
  → vincula: UPDATE users SET google_id, google_email, email_verified=true
  → gera tokens, retorna login normal

Caso 3 (signup): nenhum user encontrado
  → transação: cria workspace (slug único via generateUniqueSlug(personName))
  → cria user admin com role='admin', emailVerified=true
  → gera tokens, retorna 201 + workspace
```

### Por que `email_verified=true` no Caso 2?

Se o Google já validou o email do usuário (que é dono do email), confiamos. Isso melhora a UX: usuários que se cadastraram por email/senha sem verificar e depois clicam em "Continuar com Google" não precisam mais ver o banner.

### Callback URL

```
GOOGLE_CALLBACK_URL=https://agendaflow.nanuck.com.br/oauth/callback
```

A rota é do **frontend** (`src/frontend/src/routes/oauth.callback.tsx`). Ela extrai `?code=...` da URL e faz `POST /v1/auth/google/callback` para o backend. Isso evita expor o code via redirect.

## Signup self-service

```
POST /v1/auth/register
{
  "name": "Maria da Silva",
  "email": "maria@salao.com.br",
  "password": "MinhaSenha123",
  "businessName": "Salão da Maria"
}
```

- Email globalmente único: checagem por `lower(email)` E `email_hash` (sha256). Conflito → 409 RFC7807.
- Reservados (não viram slug): `demo`, `admin`, `api`, `app`, `www`, `b`.
- `generateUniqueSlug("Salão da Maria")` → `salao-da-maria`, `salao-da-maria-2`, etc.
- Resposta inclui access token, refresh cookie e o workspace criado.

## Rate limits

Configurados em `src/backend/src/routes/index.ts` via Redis fixed-window (fail-open):

| Endpoint | Limite | Janela | Prefix |
|---|---|---|---|
| `/auth/register` | 5 | 15 min | `register` |
| `/auth/login` | 10 | 15 min | `login` |
| `/auth/forgot-password` | 5 | 15 min | `forgotpw` |
| `/auth/reset-password` | 10 | 15 min | `resetpw` |
| `/auth/resend-verification` | 3 | 15 min | `resendverify` |
| `/payments/mercadopago/webhook` | 60 | 1 min | `mpwebhook` |

Chave Redis: `ratelimit:<prefix>:<ip>` (fail-open: se Redis cair, requests passam).
