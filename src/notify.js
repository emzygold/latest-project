const naira = (n) => (n ? '₦' + Number(n).toLocaleString('en-NG') : 'n/a');

/** Push a qualified lead to n8n (or any webhook). n8n then does WhatsApp/email/CRM/Sheets. */
export async function notifyLead(lead) {
  const url = process.env.N8N_WEBHOOK_URL;
  const payload = {
    event: 'lead.qualified',
    agency: process.env.AGENCY_NAME || 'Ease Estate',
    lead: { ...lead, budget_formatted: naira(lead.budget) },
    message: `New lead: ${lead.name || 'Unknown'} (${lead.phone}) wants to ${lead.intent || '?'} · budget ${naira(lead.budget)} · ${lead.location || 'any area'}`,
  };
  if (!url) {
    console.log('[lead]', payload.message);
    return;
  }
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`webhook ${res.status}`);
}
