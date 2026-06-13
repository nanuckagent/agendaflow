# Pagamentos — MercadoPago PIX por tenant

AgendaFlow implementa **PIX upfront** (cobrança antes do agendamento ser confirmado) via MercadoPago. Cada workspace configura seu **próprio access token** — não há token global.

## Por que por tenant, não global?

1. **Receita do salão vai direto para o salão** — Nada passa pela conta da plataforma.
2. **Compliance** — Cada negócio é responsável pela própria emissão fiscal.
3. **Trial sem cartão** — Workspaces sem token funcionam normalmente (sem cobrança PIX), pagam só pelo plano da plataforma quando aplicável.
4. **Sem custódia** — A plataforma nunca toca o dinheiro do cliente final.

## Arquitetura

```
┌─────────────────┐                          ┌──────────────────┐
│  Cliente final  │  POST /appointments/book │   AgendaFlow     │
│  (browser)      │ ───────────────────────► │   backend        │
└─────────────────┘                          └────────┬─────────┘
                                                      │
                                                      │ 1. Cria appointment (pending)
                                                      │ 2. Lê workspace.mp_token_enc
                                                      │ 3. decryptPII com chave
                                                      │    ${JWT_SECRET}:${workspaceId}
                                                      ▼
                                            ┌──────────────────┐
                                            │   MercadoPago    │
                                            │   API            │
                                            └────────┬─────────┘
                                                     │ 4. Payment.create({pix, qr})
                                                     ▼
                                     ┌────────────────────────────────┐
                                     │  appointment.status =          │
                                     │    'pending_payment'           │
                                     │  payment record (pending)      │
                                     │  resposta: { qrCode,           │
                                     │             qrCodeBase64 }     │
                                     └────────────────────────────────┘

Cliente paga PIX → MercadoPago → webhook
                                  │
                                  ▼
            POST /v1/payments/mercadopago/webhook?workspaceId=...
                                  │
                                  │ 1. Lê workspace token
                                  │ 2. Re-busca Payment.get({id})
                                  │    (NUNCA confia no body)
                                  │ 3. Se approved:
                                  │    - UPDATE payment SET status='approved'
                                  │    - UPDATE appointment SET status='confirmed'
                                  │ 4. Sempre retorna { received: true }, 200
                                  ▼
                          Cliente final (polling)
                          GET /v1/public/payments/:id/status
                          → { status: 'approved', appointmentStatus: 'confirmed' }
                          → BookingFlow mostra tela de sucesso
```

## Configuração (por workspace)

### Frontend

`Configurações → Pagamentos`:
1. Toggle "Ativar pagamentos online (PIX)".
2. Campo password "Access Token do Mercado Pago" (write-only).
3. Salvar → `PUT /v1/workspaces/:id/mercadopago-token`.
4. Token mascarado é exibido como `APP_USR-••••••••` depois de salvo.
5. Botão "Remover" → `DELETE /v1/workspaces/:id/mercadopago-token` (zera o token E desliga o toggle).

### Endpoints (owner-only)

```
PUT  /v1/workspaces/:id/mercadopago-token   { accessToken: string }
DELETE /v1/workspaces/:id/mercadopago-token
GET  /v1/workspaces/:id                      → inclui { onlinePaymentsEnabled, mercadopagoConfigured }
PATCH /v1/workspaces/:id                     { onlinePaymentsEnabled: boolean }
```

Apenas o `owner_user_id` do workspace pode chamar PUT/DELETE — retorna 403 caso contrário.

### Criptografia do token

O token é criptografado com chave derivada **por workspace**:

```ts
// src/backend/src/services/payment.service.ts
export const mercadopagoTokenKey = (workspaceId: string) =>
  `${env.JWT_SECRET}:${workspaceId}`;

// Salvar
const enc = encryptPII(token.trim(), mercadopagoTokenKey(workspaceId));

// Ler
const token = decryptPII(workspace.mercadopagoAccessTokenEnc, mercadopagoTokenKey(workspaceId));
```

**Por que não `workspaceId` puro como chave?** Workspace IDs são UUIDs públicos (aparecem em logs, headers, URLs). Concatenar com `JWT_SECRET` garante que mesmo um vazamento do banco sem o secret seja inútil.

## Fluxo de booking com PIX

### Request

```bash
POST /v1/appointments/book
X-Workspace-Id: <uuid>
Content-Type: application/json

{
  "clientName": "Maria",
  "clientEmail": "maria@cliente.com",
  "clientPhone": "11999991111",
  "professionalId": "<uuid>",
  "serviceId": "<uuid>",
  "appointmentDate": "2026-06-20",
  "appointmentTime": "14:30"
}
```

### Response (com PIX habilitado)

```json
{
  "id": "<uuid>",
  "code": "K0Y3VBEH",
  "status": "pending_payment",
  "appointmentDate": "2026-06-20T00:00:00.000Z",
  "appointmentTime": "14:30",
  "payment": {
    "id": "<uuid>",
    "qrCode": "00020101021243650016COM.MERCADOLIBRE...",
    "qrCodeBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "amountInCents": 5000
  }
}
```

### Response (sem PIX — fallback ou MP falhou)

```json
{
  "id": "<uuid>",
  "code": "ABC12345",
  "status": "pending",
  "appointmentDate": "...",
  "appointmentTime": "...",
  "payment": null
}
```

### Degradação graceful

Se a API do MercadoPago falhar (token errado, MP fora do ar), o booking **não é perdido**:
1. `appointment` continua como `pending` (não `pending_payment`).
2. `payment: null` na resposta.
3. Erro logado: `'PIX payment creation failed - booking kept as pending'`.
4. Cliente final vê tela de sucesso normal (sem QR).

Isso evita uma classe inteira de bugs onde uma falha do gateway impede agendamentos. O salão pode cobrar presencialmente.

## Status polling

Enquanto o cliente final está olhando o QR Code, o `BookingFlow` faz polling:

```ts
// src/frontend/src/components/booking/BookingFlow.tsx
useQuery({
  queryKey: ['public-payment-status', payment.id],
  queryFn: () => apiClient.get(`/v1/public/payments/${payment.id}/status`),
  refetchInterval: (query) => {
    const data = query.state.data;
    if (data?.status === 'approved' ||
        data?.appointmentStatus === 'confirmed' ||
        data?.appointmentStatus === 'cancelled') {
      return false; // para o polling
    }
    return 4000;
  },
});
```

- **Intervalo:** 4 segundos.
- **Para automaticamente** quando `approved` ou quando o appointment é confirmado/cancelado.
- **Endpoint:** `GET /v1/public/payments/:id/status` (público, valida UUID, retorna `{ status, appointmentStatus }`).

## Webhook

```
POST /v1/payments/mercadopago/webhook?workspaceId=<uuid>
Body: { "type": "payment", "data": { "id": "<mp_payment_id>" } }
```

### Por que `workspaceId` vem na query, não no body?

O webhook é configurado **na criação do pagamento** (`notification_url`). Naquele momento, o backend sabe qual workspace está cobrando. O MercadoPago apenas repete a URL ao notificar — então a query string carrega o roteamento.

### Por que re-buscar o pagamento na API?

```ts
// services/payment.service.ts → processMercadopagoNotification
const mpPayment = await new Payment(mpClient).get({ id: externalId });
// nunca confia em body.data.status, body.data.transaction_amount, etc.
```

Sem assinatura HMAC (MercadoPago não oferece), qualquer um pode forjar um POST. Re-buscar com o **token do tenant** garante que:
1. Só pagamentos reais daquele workspace afetam estado.
2. O status retornado é o estado atual (não o do momento da notificação).
3. Não há vetor para "aprovar" pagamentos forjados.

### Idempotência

- Payments aprovados **nunca regridem** (early-return se já está `approved`).
- Appointments confirmados não viram `pending_payment` novamente.
- Múltiplos webhooks para o mesmo payment id são absorvidos sem efeito.

### Sempre 200

```ts
return c.json({ received: true }, 200);
```

Mesmo em erro. O MercadoPago re-envia agressivamente em qualquer não-200, gerando spam. A lógica é: aceitamos o aviso, processamos best-effort, falhas internas são problema nosso para resolver via reprocessamento manual (se necessário).

## Expiração automática de reservas

Reservas `pending_payment` seguram o slot do profissional. Sem expiração, um cliente que abandonou o checkout bloquearia a agenda indefinidamente.

Job repetível no worker (`src/backend/src/worker/index.ts`):

```ts
const PENDING_PAYMENT_TIMEOUT_MINUTES = 40;

// Maintenance queue, repeat every 10 min
maintenanceQueue.add('expire-pending-payments', {}, {
  repeat: { every: 10 * 60 * 1000 },
  jobId: 'expire-pending-payments',  // idempotente
});

// Worker processa:
const cutoff = new Date(Date.now() - PENDING_PAYMENT_TIMEOUT_MINUTES * 60 * 1000);
await db.update(appointments)
  .set({ status: 'cancelled', updatedAt: new Date() })
  .where(and(
    eq(appointments.status, 'pending_payment'),
    lt(appointments.createdAt, cutoff)
  ))
  .returning({ id: appointments.id });
```

- **Timeout:** 40 minutos do tempo de criação.
- **Polling:** A cada 10 minutos (janela de 40-50 min na prática).
- **jobId fixo:** Garante que o `repeat` não acumule entradas duplicadas se o worker reiniciar.

## Disponibilidade considera `pending_payment`

```ts
// src/backend/src/services/appointment.service.ts → calculateAvailability
inArray(appointments.status, ['pending', 'pending_payment', 'confirmed'])
```

Slots em `pending_payment` aparecem como ocupados até a expiração. Isso evita overbooking.

## Schema (Drizzle)

```ts
// src/backend/src/db/schema/index.ts
workspaces: {
  mercadopagoAccessTokenEnc: text(),    // base64 do AES-GCM
  onlinePaymentsEnabled: boolean().default(false).notNull(),
  ownerUserId: uuid(),
}

payments: {
  id: uuid PK,
  workspaceId,
  appointmentId,
  externalId: varchar(255),    // MercadoPago payment id
  status: varchar(20),         // pending | approved | rejected | cancelled
  amountInCents: integer,
  currency,
  paymentMethod: 'pix',
  clientEmail,
  metadata: jsonb,             // { qrCode, qrCodeBase64, ticketUrl }
}

appointments.status: 'pending' | 'pending_payment' | 'confirmed' | 'cancelled'
```

## Teste E2E sem credenciais reais

Validado em produção com token fake (ver commit `a744054`):

```bash
WS=<workspace-uuid>
TOKEN=<access-token>

# 1. Configura token fake
curl -X PUT https://agendaflow.nanuck.com.br/v1/workspaces/$WS/mercadopago-token \
  -H "Authorization: Bearer $TOKEN" -H "X-Workspace-Id: $WS" \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"APP_USR-FAKE-TOKEN-1234567890"}'

# 2. Ativa pagamentos
curl -X PATCH https://agendaflow.nanuck.com.br/v1/workspaces/$WS \
  -H "Authorization: Bearer $TOKEN" -H "X-Workspace-Id: $WS" \
  -H "Content-Type: application/json" \
  -d '{"onlinePaymentsEnabled":true}'

# 3. Tenta booking → deve degradar para pending
curl -X POST https://agendaflow.nanuck.com.br/v1/appointments/book \
  -H "X-Workspace-Id: $WS" -H "Content-Type: application/json" \
  -d '{...}'
# Expect: { status: 'pending', payment: null }

# 4. Webhook forjado → 200 sem efeito
curl -X POST "https://agendaflow.nanuck.com.br/v1/payments/mercadopago/webhook?workspaceId=$WS" \
  -H "Content-Type: application/json" \
  -d '{"data":{"id":"99999999"},"type":"payment"}'
# Expect: 200 { received: true }
# Log: { "result": { "handled": false, "reason": "payment-not-found" } }

# 5. Remove token → restaura estado limpo
curl -X DELETE https://agendaflow.nanuck.com.br/v1/workspaces/$WS/mercadopago-token \
  -H "Authorization: Bearer $TOKEN" -H "X-Workspace-Id: $WS"
```
