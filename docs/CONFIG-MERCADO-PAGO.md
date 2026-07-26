# Configuração Mercado Pago — Mensalidades PIX

Guia para ligar o PIX dinâmico das mensalidades da plataforma (conta receptora = sua conta MP).  
Implementação já existe no código; este doc cobre só o que falta **configurar** para funcionar em ambiente real/teste.

## Pré-requisitos

- Conta Mercado Pago (PF ok no início; PJ recomendado se o volume crescer)
- Chave Pix cadastrada no app Mercado Pago
- API (`mpn-api`) com a migration de `payment_company` aplicada
- Variáveis no `.env` da API (ver abaixo)

## Variáveis de ambiente

Arquivo: `mpn-api/.env` (modelo também em `mpn-api/.env.examples`)

```bash
# Access Token da aplicação (backend only — nunca no admin/manager)
# Teste: Suas integrações > app > Testes > Credenciais de teste
# Produção: Suas integrações > app > Produção > Credenciais de produção
MERCADOPAGO_ACCESS_TOKEN='APP_USR-xxxxxxxx'

# Secret do webhook (Your integrations > Webhooks).
# Sem ele, o endpoint aceita notificações sem validar assinatura (ok em dev, ruim em prod).
MERCADOPAGO_WEBHOOK_SECRET='your_webhook_secret'
```

Recomendado no deploy da API:

```bash
TZ=America/Sao_Paulo
```

(o cron de parcelas e o cálculo de vencimento usam fuso de Brasília)

Após alterar o `.env`, **reinicie a API**.

## Passo a passo no painel MP

1. Acesse [Suas integrações](https://www.mercadopago.com.br/developers/panel/app) e faça login.
2. Crie uma aplicação (se ainda não tiver), ex.: `MPN Mensalidades` — pagamentos online / loja própria.
3. Copie o **Access Token**:
   - Para analisar sem dinheiro real → credenciais de **teste**
   - Para cobrar de verdade → ative e use credenciais de **produção**
4. Cole em `MERCADOPAGO_ACCESS_TOKEN` no `.env`.
5. Confirme chave **Pix** ativa na conta Mercado Pago (app).

### Webhook (conciliação automática)

Opcional para só gerar/exibir PIX (o manager faz polling; o admin ainda pode “marcar como pago”).

Quando for ligar:

1. URL pública HTTPS: `https://<sua-api>/webhooks/mercadopago`
2. Em local: use tunnel (ngrok, Cloudflare Tunnel, etc.)
3. No painel da aplicação MP → Webhooks → evento **`payment`**
4. Copie o secret gerado → `MERCADOPAGO_WEBHOOK_SECRET`
5. Reinicie a API

## Como validar que está ligado

1. API no ar com token preenchido.
2. No manager, cliente com parcela aberta → **Mensalidades**.
3. Botão deve aparecer como **“Pagar com PIX”** (não “PIX indisponível”).
   - `pixEnabled` vem de `MercadoPagoService.isConfigured()` (= token presente).
4. Ao pagar: QR + copia-e-cola; se o pagador não tiver CPF cadastrado, o fluxo pede uma vez.
5. Com webhook: pagamento aprovado no MP → parcela marca `dt_payment` sozinha.
6. Sem webhook: marcar pago no **admin** (fallback já existente).

## Endpoints relevantes

| Método | Rota | Quem |
|--------|------|------|
| `GET` | `/companies/:companyPublicId/billing` | Manager (owner) |
| `POST` | `/companies/:companyPublicId/billing/:paymentId/pix` | Manager — gera/reusa PIX |
| `GET` | `/companies/:companyPublicId/billing/:paymentId` | Manager — polling de status |
| `POST` | `/webhooks/mercadopago` | Mercado Pago (público) |
| `PATCH` | `/platform/clients/:id/payments/:paymentId/mark-paid` | Admin — fallback |

## Código de referência

- Cliente MP: `mpn-api/src/mercado-pago/mercado-pago.service.ts`
- Billing + cron de parcelas: `mpn-api/src/billing/billing.service.ts`
- Webhook: `mpn-api/src/billing/mercado-pago-webhook.controller.ts`
- UI manager: `mpn-manager/src/pages/Billing/`

## Checklist rápido

- [ ] Aplicação criada no MP Developers
- [ ] Chave Pix cadastrada na conta
- [ ] `MERCADOPAGO_ACCESS_TOKEN` no `.env` + API reiniciada
- [ ] Botão “Pagar com PIX” aparece no manager
- [ ] (Depois) Webhook `payment` + `MERCADOPAGO_WEBHOOK_SECRET`
- [ ] (Depois) Teste end-to-end: gerar PIX → pagar → parcela marcada paga

## Fora deste guia

- Tela **Planos** / “iniciar plano” pós-trial (produto em discussão)
- Bloqueio de login por inadimplência
- Migração de conta PF → PJ
