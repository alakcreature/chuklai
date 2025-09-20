const twilio = require('twilio');
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, TWILIO_WHATSAPP_TO } = require('../config');
let client = null; if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

async function sendWhatsApp(toPhone, body){
  const to = TWILIO_WHATSAPP_TO || toPhone; if (!client) { console.log('[WA simulate] to=', to, 'body=', body); return { sid: 'SIMULATED' }; }
  return client.messages.create({ from: TWILIO_WHATSAPP_FROM, to: `whatsapp:${to.replace(/^whatsapp:/,'')}`, body });
}

module.exports = { sendWhatsApp };