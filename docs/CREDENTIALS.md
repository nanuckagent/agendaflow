# Guia de credenciais externas

Passo a passo para configurar **Brevo (SMTP)**, **Google Cloud Console (OAuth)** e **MercadoPago (PIX)**. Todas as três são **opcionais** — o AgendaFlow funciona sem nenhuma, com fallbacks documentados.

## 1. Brevo — SMTP grátis (300 emails/dia)

### Por que Brevo?

- Free tier de 300 emails/dia (suficiente para SaaS pequeno/médio).
- Sem necessidade de cartão de crédito para começar.
- IP de saída dedicado no plano free (boa entregabilidade vs Gmail SMTP).
- Suporte a SPF/DKIM via subdomínio.

### Passo a passo

**1.** Crie uma conta em https://www.brevo.com (antiga Sendinblue).

**2.** Confirme seu email e complete o onboarding.

**3.** No painel: **Settings (canto superior direito) → SMTP & API → SMTP**.

**4.** Anote:
- **SMTP server:** `smtp-relay.brevo.com`
- **Port:** `587`
- **Login:** seu email da conta (ex: `usuario@dominio.com.br`)
- **SMTP key:** clique em "Generate a new SMTP key" → **copie e guarde** (só é mostrada uma vez).

**5.** Configure em `infra/.env.production`:

```bash
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=seu-email@dominio.com.br
SMTP_PASS=xkeysib-...
MAIL_FROM=AgendaFlow <noreply@agendaflow.nanuck.com.br>
```

**Atenção ao escape de `$`:** se a SMTP key tiver caracteres `$`, **duplique** no `.env` (`$$`). Caso contrário, o `env_file` do compose interpreta como variável e a auth quebra.

**6.** Reinicie o worker:

```bash
docker restart agendaflow-worker
docker logs agendaflow-worker | grep SMTP
# Esperado: "SMTP configured - emails will be sent"
```

**7.** Teste o fluxo de reset:

```bash
curl -X POST https://agendaflow.nanuck.com.br/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"seu-email@dominio.com.br"}'
# Verifique sua inbox em ~30 segundos
```

### Sem Brevo configurado

O worker continua processando os jobs, mas em vez de enviar:

```
docker logs agendaflow-worker | grep "SMTP not configured"
# ...{ to: '...', subject: '...', text: '... reset-password?token=abc123...' }
```

Útil para desenvolvimento e testes. Os links de reset/verificação ficam visíveis no log.

### Subdomínio dedicado (recomendado para produção)

Para melhorar entregabilidade, configure SPF/DKIM em um subdomínio:

1. No Brevo: **Senders → Domains → Add a domain** → `mail.agendaflow.nanuck.com.br`.
2. Brevo gera registros DKIM/SPF para adicionar no Cloudflare.
3. Após verificação (~24h), use `MAIL_FROM=AgendaFlow <noreply@mail.agendaflow.nanuck.com.br>`.

---

## 2. Google OAuth — Cloud Console

### Pré-requisitos

- Conta Google (gratuita).
- Domínio configurado (`agendaflow.nanuck.com.br`).

### Passo a passo

**1.** Acesse https://console.cloud.google.com.

**2.** Topo da página: **Select a project → New Project**.
   - Nome: `agendaflow-oauth` (ou o que preferir).
   - Organization: deixe em branco se for conta pessoal.
   - Clique em **Create**.

**3.** Após criar, certifique-se que o projeto está selecionado no topo.

**4.** Menu lateral: **APIs & Services → OAuth consent screen**.
   - **User Type:** External → Create.
   - **App information:**
     - App name: `AgendaFlow`
     - User support email: seu email
     - App logo: opcional (a Google permite PNG quadrado).
   - **App domain:**
     - Application home page: `https://agendaflow.nanuck.com.br`
     - Privacy policy: `https://agendaflow.nanuck.com.br/privacy` (crie se ainda não houver)
     - Terms of service: `https://agendaflow.nanuck.com.br/terms`
   - **Authorized domains:** adicione `nanuck.com.br`.
   - **Developer contact:** seu email.
   - **Save and continue**.

**5.** **Scopes:** clique em **Add or remove scopes** e selecione:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
   - **Save and continue**.

**6.** **Test users:** pule (vamos publicar logo).
   - **Save and continue → Back to dashboard**.

**7.** Topo: **Publish app → Confirm** (modo Production, sem verificação — funciona para todos os usuários Google, com banner amarelo de "unverified" no primeiro consent).

> **Verificação opcional:** para remover o banner amarelo, complete a verificação Google. Leva 4-6 semanas, exige privacy policy real, e é necessário só se você atingir 100+ usuários. Comece sem.

**8.** Menu lateral: **APIs & Services → Credentials → Create Credentials → OAuth client ID**.

**9.** Configuração do client:
   - **Application type:** Web application.
   - **Name:** `AgendaFlow Web`.
   - **Authorized JavaScript origins:**
     - `https://agendaflow.nanuck.com.br`
   - **Authorized redirect URIs:**
     - `https://agendaflow.nanuck.com.br/oauth/callback`
   - **Create**.

**10.** Um modal mostra **Client ID** e **Client Secret** — copie ambos.

**11.** Configure em `infra/.env.production`:

```bash
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_CALLBACK_URL=https://agendaflow.nanuck.com.br/oauth/callback
```

**12.** Reinicie o backend:

```bash
docker restart agendaflow-backend
curl https://agendaflow.nanuck.com.br/v1/public/config
# Esperado: {"googleOAuthEnabled":true}
```

**13.** Os botões "Continuar com Google" aparecem automaticamente em `/login` e `/register` (o componente `GoogleAuthButton` consulta `/v1/public/config` no mount).

### Fluxos validados

| Fluxo | Comportamento |
|---|---|
| Conta nova (email não cadastrado) | Cria workspace + user admin, login automático |
| Email já cadastrado com senha | Vincula o `google_id` à conta existente, marca `email_verified=true` |
| Conta com Google já vinculada | Login direto |

Ver [AUTH.md](AUTH.md#google-oauth) para detalhes do callback.

---

## 3. MercadoPago — PIX por workspace

### Como funciona

Diferente do SMTP e do OAuth, o MercadoPago **não é configurado globalmente**. Cada dono de salão configura seu próprio access token na tela `Configurações → Pagamentos`. A receita do PIX vai direto para a conta MercadoPago do dono.

### Passo a passo (para o dono do salão)

**1.** Acesse https://www.mercadopago.com.br e faça login (ou crie conta).

**2.** Vá em **Desenvolvedores** (topo) → **Suas integrações** → **Criar aplicação**.
   - **Nome:** `Meu Salão` (ou o nome do estabelecimento).
   - **Modelo de integração:** Pagamentos online.
   - **Produtos a integrar:** marque **Checkout API** ou **Pagamento via PIX**.
   - **Tipo de plataforma:** Não estou usando.
   - **Aceito os termos** → **Criar aplicação**.

**3.** Dentro da aplicação: **Credenciais de produção** (não de teste).
   - Você verá:
     - **Public Key:** `APP_USR-...` (não usado pelo AgendaFlow)
     - **Access Token:** `APP_USR-...` (este é o que importa)
   - Clique em **Copiar** ao lado do Access Token.

> **Atenção:** o token de **produção** começa com `APP_USR-`. O token de **teste** começa com `TEST-` e só funciona em sandbox. Para receber dinheiro real, use o de produção.

**4.** No AgendaFlow, logado como dono do workspace:
   - **Configurações → Pagamentos**.
   - Marque **"Ativar pagamentos online (PIX)"**.
   - Cole o Access Token no campo.
   - Clique em **Salvar**.
   - O campo passa a exibir `APP_USR-••••••••••••••••` (token mascarado).
   - Clique em **Salvar alterações** no rodapé do card.

**5.** Pronto. A partir de agora:
   - O fluxo de booking público em `/b/{slug}` mostra QR PIX para serviços com preço > 0.
   - Pagamento aprovado → appointment vira `confirmed` automaticamente (via webhook).
   - Sem pagamento em 40 minutos → appointment é cancelado e o slot é liberado.

### Webhook (configurado automaticamente)

Na criação do pagamento, o backend já passa o `notification_url`:

```
notification_url: https://agendaflow.nanuck.com.br/v1/payments/mercadopago/webhook?workspaceId=<uuid>
```

O dono do salão **não precisa** configurar webhook no painel MercadoPago.

### Testando com valor real

Crie um serviço com preço baixo (ex: R$ 1,00), abra `/b/{slug}` em modo anônimo, agende e pague de verdade. Após o PIX cair, o appointment vira `confirmed` em poucos segundos.

### Remover token

**Configurações → Pagamentos → Remover** → o token é apagado e o toggle é desativado. Bookings futuros voltam ao fluxo `pending` sem cobrança.

### Limitações

- **Apenas PIX:** Cartão de crédito não foi implementado (PIX é instantâneo e sem chargeback).
- **Apenas BRL:** A moeda é fixa em reais.
- **Sem parcelamento:** PIX é à vista por natureza.

Ver [PAYMENTS.md](PAYMENTS.md) para arquitetura completa.

---

## Checklist rápido para production-ready

Após configurar todas as credenciais, verifique:

```bash
# 1. Config público mostra OAuth ativo
curl https://agendaflow.nanuck.com.br/v1/public/config
# Esperado: {"googleOAuthEnabled":true}

# 2. Worker tem SMTP configurado
docker logs agendaflow-worker 2>&1 | grep -i smtp | tail -3
# Esperado: "SMTP configured - emails will be sent"

# 3. Backend healthy
curl https://agendaflow.nanuck.com.br/v1/health
# Esperado: {"status":"ok"}

# 4. Containers todos healthy
docker ps --filter "name=agendaflow" --format "table {{.Names}}\t{{.Status}}"
```

Para cada workspace que ativar PIX, valide o fluxo end-to-end com uma transação de R$ 1,00 antes de divulgar.
