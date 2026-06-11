# AgendaFlow

Plataforma de agendamento inteligente com suporte a multi-tenancy, calendários compartilhados e integração com sistemas externos.

**Pipeline e regras:** https://github.com/nanuckagent/saas-constructor
**Arquitetura, ADRs, skills:** `/root/saas-constructor/`
**Vault de conhecimento:** `/root/saas-constructor/knowledge/products/agendaflow.md`

## Regras não-negociáveis herdadas da plataforma

1. Triple sync ao final de cada fase: GitHub + Obsidian (via pull) + Notion (MCP)
2. `ip-whitelist-admin` NUNCA em rotas `/api` ou `/v1` (apenas `/metrics`)
3. HEALTHCHECK sempre `127.0.0.1`, nunca `localhost`
4. Design ACRA: sidebar #1a2d7a, primary #3b5bdb, Inter, cards rounded-2xl
5. Auth com senha + Argon2id (ADR-005), PIX Brcode para pagamentos (não Stripe)
6. Build real + `curl` 200 antes de declarar PASS
7. CSRF: confia em `SameSite=Strict` (cookies) + `Content-Type: application/json` (API), sem double-submit tokens

## Estrutura de docs (14 fases do pipeline)

Ver `docs/README.md` para o mapa completo.
