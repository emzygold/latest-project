# Lead Outreach

Upload a CSV of leads. The app:

- sends each lead a personalised **email** and **WhatsApp** message
- lists every lead that can't be reached on WhatsApp in a downloadable **report CSV**, with their email status so you can still follow up by email

> ⚖️ **Only message people you have a lawful basis to contact.** Read [Rules you must follow](#rules-you-must-follow) before your first real send. This app helps you stay compliant, but it cannot make cold messaging legal where it isn't.

---

## What it does

| Step | What happens |
|---|---|
| **1. Upload & clean** | Reads your CSV in memory and never changes the original file. It maps headers in any case or style (`Phone`, `Phone Number`, `phone_number`, `Mobile`, `E-mail`…). It trims whitespace, validates emails, converts phone numbers to international format (`+2348031234567`) using a default country you choose, and flags duplicates. A preview shows the row count and every validation issue before anything is sent. |
| **2. Messages** | One email template (subject + body) and one WhatsApp message, with merge fields and graceful fallbacks. Optional AI variation per lead. |
| **3. Review & test** | Renders the real personalised messages for the first leads and sends a test to your own email and WhatsApp. |
| **4. Send** | A **dry run** renders every message and sends nothing. A **real send** only starts after you tick the lawful-basis box and type `SEND <number of leads>`. |
| **Dashboard** | Live sent / failed / skipped / pending counts, a status log for each lead, and Pause / Resume / Retry failed. Downloads the **WhatsApp report CSV** and a **full results CSV**. |
| **Do-not-contact list** | A suppression list checked right before every send. Unsubscribe links and WhatsApp "STOP" replies are added automatically. |

### Stack, and why

- **Node.js 22 + Express**: a small long-running server is needed for throttled background jobs, pause/resume and WhatsApp webhooks. (The portfolio site in this repo is a static export with no server, so the tool is a separate app.)
- **Plain HTML/CSS/JS front end**: nothing to build. Live updates use Server-Sent Events.
- **Libraries:**
  - `libphonenumber-js`: Google's phone-number rules
  - `nodemailer`: SMTP
  - `csv-parse` / `csv-stringify`: reading and writing CSVs
  - `@anthropic-ai/sdk`: optional AI variation
- **Tests:** Node's built-in test runner (`node --test`), so no test framework to install.
- **Storage:** JSON files in `data/` (git-ignored). No database to set up.

---

## Setup

Requires **Node.js 20 or newer**.

```bash
cd lead-outreach
npm install
cp .env.example .env     # then edit .env
npm start                # http://127.0.0.1:3100
```

Out of the box both providers are set to **mock**, so you can try everything safely. Nothing is really sent, and the top bar shows "Email: mock" and "WhatsApp: mock". Mock behaviour you can use for testing:

| Mock input | Result |
|---|---|
| Email address ending `@fail.test` | Permanent failure |
| Email address ending `@flaky.test` | Fails once, then succeeds on retry |
| WhatsApp number ending in `00` | Reported as "Not active on WhatsApp" |

**Try it with the sample file:**
1. Upload `samples/leads-sample.csv` and set **Default country** to **United States**. The sample uses the fictional 555-01xx range and `example.com` addresses, so it never reaches real people.
2. Set a WhatsApp template name (any name works in mock mode) and press **Start dry run**.
3. Then try a "real" send, which still goes nowhere because the providers are mock.

`samples/report-sample.csv` and `samples/results-sample.csv` are the exact output of that run.

Run the tests:

```bash
npm test
```

### Folder structure

```
lead-outreach/
├── src/
│   ├── server.js              HTTP API, unsubscribe page, WhatsApp webhook
│   ├── config.js              reads .env
│   ├── csv.js                 CSV parsing, header mapping, safe CSV export
│   ├── clean.js               trimming, email validation, phone normalisation, duplicates
│   ├── template.js            merge fields, fallbacks, opt-out lines, email HTML
│   ├── messages.js            builds each lead's email + WhatsApp (shared by preview, test and send)
│   ├── jobs.js                job engine: throttling, retries, pause/resume, live events
│   ├── report.js              report CSV and results CSV
│   ├── suppression.js         do-not-contact list, signed unsubscribe links
│   ├── ai.js                  optional Claude variation with a "no new facts" check
│   ├── util.js                redacting logger, retry, delays, hourly limiter
│   └── providers/
│       ├── email.js           SMTP, Resend, SendGrid, mock
│       └── whatsapp.js        WhatsApp Cloud API, mock, webhook parsing
├── public/                    the dashboard (index.html, app.js, styles.css)
├── samples/                   sample leads CSV, sample report and results CSVs
├── test/                      tests for parsing, phones, templates, reports, API
├── data/                      created at runtime: jobs + suppression list (git-ignored)
├── .env.example
└── README.md
```

---

## Your CSV

Required columns: **Name**, **Email** and **Phone Number**. **Socials** is optional. Header names are matched case-insensitively, and many spellings work:

| Field | Header names that work (examples) |
|---|---|
| Name | Name, Full Name, full_name, Contact Name (or First Name + Last Name) |
| Email | Email, E-mail, email_address, Mail |
| Phone | Phone, Phone Number, phone_number, Mobile, WhatsApp, Cell, Tel |
| Socials | Socials, Social Media, Instagram, LinkedIn, X, Handle, Links |

If a column isn't detected, pick it by hand in the mapping step. Comma, semicolon and tab delimiters all work.

**How phone numbers are cleaned:**
- `0803 123 4567` with country NG becomes `+2348031234567`.
- `+44 7911 123456`, `00447911123456` and `447911123456` are all understood.
- Numbers that can't be valid are marked **"Invalid number format"**.
- A landline is flagged with a warning, since it may not be on WhatsApp.

**Duplicates are flagged per channel:**
- The same email (in any case) as an earlier row: that row's email is skipped.
- The same phone number (in any format) as an earlier row: that row's WhatsApp is skipped.

---

## Templates and merge fields

| Field | Value | Fallback when empty |
|---|---|---|
| `{{name}}` | Full name | "there" |
| `{{first_name}}` | First word of the name (skips Mr/Dr/…) | "there" |
| `{{email}}`, `{{phone}}` | The cleaned values | empty |
| `{{socials}}` | Socials column | empty |

- `{{socials|your page}}` uses your own fallback.
- `{{#socials}} (I saw {{socials}}){{/socials}}` only shows when the lead has socials. `{{^socials}}…{{/socials}}` shows only when they don't.
- A line that ends up empty, such as `Socials: ` with no value, is removed. A message never contains `Hi ,` or a leftover `{{placeholder}}`.
- **Opt-out lines:**
  - Every email gets an unsubscribe footer you can't remove. It's a one-click link if `PUBLIC_BASE_URL` and `UNSUBSCRIBE_SECRET` are set, otherwise "reply UNSUBSCRIBE".
  - Emails also carry `List-Unsubscribe` headers.
  - Free-text WhatsApp messages get "Reply STOP to opt out." unless they already say how to opt out.
  - WhatsApp templates must contain the opt-out line in the approved text (see below).

### Optional AI variation

Set `ANTHROPIC_API_KEY` to enable it. The default model is `claude-opus-5-5`; change it with `AI_MODEL`.

What it does:
- Rewords each email body, and free-text WhatsApp messages, so leads don't all get identical text.
- The model only sees the already-rendered message and that lead's own CSV fields.

How the "no new facts" check works:
- Every variation is checked automatically.
- The original is used instead if the variation adds any link, email, @handle or number that isn't in your message or the lead's data, drops the opt-out line, or changes length a lot. The same happens if the API fails or declines.
- The dashboard notes which leads got an AI version.
- WhatsApp **templates** are never varied, because Meta only delivers the approved wording.

---

## Configure email

Set `EMAIL_PROVIDER` in `.env` to one of the options below. Credentials only ever live in `.env`, which is git-ignored.

**SMTP** (`EMAIL_PROVIDER=smtp`): works with Gmail / Google Workspace, Zoho, Outlook, Brevo, Mailgun and others.
- **Gmail:** turn on 2-step verification, create an **App password**, then set:
  - `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`
  - `SMTP_USER` = your address, `SMTP_PASS` = the app password
- Gmail allows roughly 500 messages a day; Workspace allows more.

**Resend** (`EMAIL_PROVIDER=resend`): verify your domain at resend.com, then set `RESEND_API_KEY`.

**SendGrid** (`EMAIL_PROVIDER=sendgrid`): complete Sender Authentication, then set `SENDGRID_API_KEY`.

Also set `EMAIL_FROM`, `EMAIL_FROM_NAME` and `SENDER_POSTAL_ADDRESS`.

**Deliverability checklist:**
- Send from your own domain with SPF, DKIM and DMARC set up.
- Keep the default throttling: a random 5–15 s between emails and at most 200 an hour.
- Warm a new domain up slowly: a few dozen emails a day at first.
- Gmail and Yahoo require one-click unsubscribe for bulk senders. Set `PUBLIC_BASE_URL` and `UNSUBSCRIBE_SECRET` so emails carry it.

**Retries:**
- Temporary failures are retried up to `MAX_SEND_ATTEMPTS` times with backoff: SMTP 4xx, HTTP 429/5xx and network errors.
- Permanent failures are marked failed (bad address, SMTP 5xx).
- Authentication errors pause the job so you can fix the settings.

---

## Configure WhatsApp (official Cloud API)

The app uses Meta's official **WhatsApp Business Cloud API**.

### One-time setup
1. Create a Meta developer app (type **Business**), add the **WhatsApp** product and connect a business phone number. Use a number that is not already active in the WhatsApp app.
2. In Business Settings, create a **System User**, give it the app and the WhatsApp account, and generate a **permanent token** with the `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
3. Fill in `.env`:
   - `WHATSAPP_PROVIDER=cloud`
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`
4. **Webhooks.** They're needed to learn which numbers aren't on WhatsApp, and to receive STOP replies.
   1. Expose the app over HTTPS, for example with `ngrok http 3100`.
   2. Set `PUBLIC_BASE_URL` to that URL. **Also set `ADMIN_TOKEN`** so the dashboard is password-protected.
   3. Set `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (any string) and `WHATSAPP_APP_SECRET` (App Dashboard → Settings → Basic).
   4. In the app's WhatsApp → Configuration, enter the callback URL `https://<your-url>/webhooks/whatsapp` and the same verify token.
   5. Subscribe to the **messages** field.
5. With a **test number**, Meta only delivers to up to 5 numbers you've added to its allowed list. Other numbers fail with error 131030, which the app explains.

### Template approval: required for cold leads
WhatsApp only lets a business start a conversation with an **approved message template**.
- Create one in **WhatsApp Manager → Message templates** with category **Marketing**. Review usually takes from minutes to a day.
- Example to submit:
  - **Name:** `lead_intro` · **Language:** English (`en`)
  - **Body:** `Hi {{1}}, this is Your Name from Your Business. I just emailed you about a website idea for your business. Would you like me to share it here? Reply STOP to opt out.`
  - Optionally add a "Stop promotions" quick-reply button.
- In the app, enter the template name and language. Map each `{{1}}`, `{{2}}`… to a merge field, one per line (for example `{{first_name}}`).
- Empty values become `-`, because Meta rejects empty parameters.
- **Check template** shows the approval status and warns if the text has no opt-out line.
- **Use the exact approved wording.** You can't personalise beyond the template's variables.

### The 24-hour window
When a lead messages you, a **24-hour customer-service window** opens.
- Inside it you may send free-form text: the app's "Free text" mode.
- Outside it, free text fails with error 131047. For first contact, always use **Approved template** mode.

### "Is this number on WhatsApp?"
The Cloud API has **no endpoint to check registration before sending**. The old contacts check only existed in the retired On-Premises API. This app uses the official signal:
1. It formats and validates the number. Impossible numbers go straight to the report as "Invalid number format".
2. It sends the approved template.
3. If the number isn't on WhatsApp, Meta sends a **failed** status webhook with error **131026**. The lead is marked **"Not active on WhatsApp"** and added to the report.

You need webhooks set up for step 3. Error 131026 can also mean the person hasn't accepted WhatsApp's latest terms or uses a very old app. Other delivery failures, such as Meta's per-user marketing limit (131049), show as "failed" but don't go in the report.

### Limits and costs
- **Messaging limit:** new accounts can start conversations with a limited number of unique people per 24 hours (for example 250). The limit grows as your quality rating stays high. Keep `WHATSAPP_MAX_PER_HOUR` comfortably under it.
- **Cost:** Meta charges per delivered template message, and marketing messages cost the most. Check Meta's current pricing for your recipients' countries.
- **Restricted countries:** Meta has at times restricted marketing templates to some countries (for example US numbers in 2025), so check the current rules before you send.
- **Quality rating:** if many people block or report you, your rating drops, then your limits fall and the number can be restricted. The app throttles sends (random 8–20 s apart) and pauses the job on account-level errors such as spam rate limits or a bad token.

### Unofficial WhatsApp tools: not included
Tools like `whatsapp-web.js` or Baileys automate WhatsApp Web. They can check registration and send free text without templates. **This app does not include them, and I recommend against them:**
- They break WhatsApp's Terms of Service.
- Bulk messages to people who haven't saved your number are exactly what WhatsApp's spam detection looks for.
- **Expect the number to be banned, often permanently, and often within the first few dozen messages.**

If you still want that risk, it would have to be a separate provider you add yourself. Never use your main business number for it.

---

## Rules you must follow

- **Lawful basis.** Only contact leads you have a lawful basis to contact, such as consent or, where the law allows it, legitimate interest for business contacts. Scraped or bought lists are usually not acceptable.
- **WhatsApp Business Policy.** You need the person's **opt-in** before messaging them on WhatsApp, and you must honour opt-outs. Messaging cold leads without opt-in breaks the policy and puts your number at risk. Use WhatsApp for leads who agreed to it, and email for the rest.
- **CAN-SPAM (US).**
  - No misleading From lines or subjects.
  - Identify the message as an advertisement where relevant.
  - Include your physical postal address (`SENDER_POSTAL_ADDRESS`).
  - Honour unsubscribes within 10 business days. This app honours them immediately.
- **GDPR / UK GDPR and PECR (EU/UK).** Have a lawful basis and tell people where you got their data. Honour objections to direct marketing. Consent rules for marketing to individuals and sole traders are strict.
- **NDPR / Nigeria Data Protection Act 2023.** Have a lawful basis, be transparent, and let people object to direct marketing at any time.

This is general information, not legal advice. Check the rules that apply to you and your leads' countries.

---

## Safety controls built in

- **Dry run:** renders every personalised message and sends nothing.
- **Test-send:** goes to your own email and number, with a `[TEST]` subject prefix.
- **Explicit confirmation:** a real send needs the lawful-basis checkbox and the typed phrase `SEND <n>`. The server checks the phrase too.
- **Throttling:** random delays between sends, hourly caps per channel, and backoff on rate limits.
- **Suppression list:** checked immediately before every send, so someone who unsubscribes mid-job isn't contacted.
- **No secrets or lead data in logs:** console output masks emails, phone numbers and tokens. Secrets only come from `.env`, which is git-ignored.
- **Lead data stays local:** jobs and the suppression list are stored in `data/`, which is git-ignored. Delete old job files when you're done with them.
- **Original file untouched:** uploads are read in memory, and the file you uploaded is never written to.
- **Restart-safe:** if the server stops mid-job, the job comes back **paused**. Press Resume to continue where it left off.
- **CSV export safety:** exported cells that look like spreadsheet formulas are neutralised.

## Report CSV format

| Column | Meaning |
|---|---|
| Name, Email, Phone Number, Socials | As in your file (the phone number as you wrote it) |
| Reason | `No phone number`, `Invalid number format` or `Not active on WhatsApp` |
| Email Status | `Sent`, `Failed: …`, `Skipped: …`, `Pending`, `Not sent (dry run)`, `Not sent yet`, `No email address` or `Invalid email` |

You can download a "before sending" version from the preview step. It covers missing and invalid numbers. "Not active on WhatsApp" can only be known after a real send.
