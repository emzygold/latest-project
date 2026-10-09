# Ease Estate

AI property assistant and lead capture for real estate agents and brokers in Nigeria.

Buyers and renters message your listings, on a web chat or WhatsApp. The assistant answers instantly using **only your real listings**, qualifies them (buy or rent, budget, area, timeline, name, phone), and alerts you the moment a lead is callable. You manage listings and track leads in a simple dashboard.

## Run it

Needs Node 22.13+. No dependencies to install.

```bash
cp .env.example .env      # set ADMIN_TOKEN at minimum
set -a; . ./.env; set +a
npm run seed              # optional: sample Lagos/Abuja listings
npm start
```

- Chat: http://localhost:3000/chat
- Dashboard: http://localhost:3000/dashboard (sign in with `ADMIN_TOKEN`)

Without `ANTHROPIC_API_KEY` a rule-based fallback bot runs (good for demos and tests). With a key, Claude handles the conversation and saves lead details through a `capture_lead` tool.

## Connect WhatsApp (Twilio)

Point your Twilio WhatsApp number's "When a message comes in" webhook at `POST https://YOUR_HOST/api/whatsapp`. The prospect's WhatsApp number is saved as the lead's phone automatically.

## Connect n8n

Set `N8N_WEBHOOK_URL` to your n8n webhook. When a lead has a phone number and a known intent, Ease Estate POSTs once:

```json
{ "event": "lead.qualified", "agency": "Ease Estate", "message": "New lead: ...", "lead": { "name": "...", "phone": "...", "budget": 3000000 } }
```

Import `n8n/lead-to-whatsapp.json` for a starter flow that WhatsApps the agent. Swap the node for Google Sheets, a CRM, email, etc.

## Embed on a website

```html
<iframe src="https://YOUR_HOST/chat" style="width:380px;height:560px;border:0;border-radius:12px"></iframe>
```

## API

Public: `POST /api/chat {message, session_id?}`, `POST /api/whatsapp` (Twilio form post).
Admin (header `Authorization: Bearer ADMIN_TOKEN`): `GET/POST /api/listings`, `PATCH/DELETE /api/listings/:id`, `GET /api/leads[?status=]`, `PATCH /api/leads/:id {status}`, `GET /api/leads/:id/messages`, `GET /api/stats`.

## Tests

```bash
npm test
```

## Roadmap

- Multi-agent accounts (each agent or agency gets their own listings, leads and login)
- Photo uploads per listing and sending them in WhatsApp
- Inspection booking with calendar and reminders
- Paystack/Flutterwave rent payments
- Light rental management: tenants, rent reminders, maintenance requests
- Validate Twilio request signatures on `/api/whatsapp` and add rate limiting on `/api/chat` before going public
