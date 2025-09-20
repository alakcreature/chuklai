const { Worker } = require('bullmq');
const { createClient } = require('redis');
const { REDIS_URL } = require('../config');
const Draft = require('../models/Draft');
const User = require('../models/User');
const { postToLinkedIn } = require('../services/linkedin');
const { sendWhatsApp } = require('../services/whatsapp');

let workerInstance = null;

async function startApprovalWorker(){
  if(workerInstance) return workerInstance;
  const connection = createClient({ url: REDIS_URL });
  await connection.connect();
  const worker = new Worker('approvalQueue', async job => {
    const { draftId } = job.data;
    const draft = await Draft.findById(draftId).populate('user');
    if(!draft) return;
    if(draft.status !== 'PENDING_APPROVAL') return;
    if((draft.content||'').length > 3000){ draft.status='FAILED'; await draft.save(); await sendWhatsApp(draft.user.phone, 'Draft failed moderation and was not posted.'); return; }
    const resp = await postToLinkedIn(draft.content, draft.user);
    draft.status = 'POSTED'; draft.externalPostId = resp.external_post_id; await draft.save();
    await sendWhatsApp(draft.user.phone, `Auto-posted ✅ ${resp.external_post_id}`);
  }, { connection });

  worker.on('completed', job => console.log('approval worker completed', job.id));
  worker.on('failed', (job, err) => console.error('approval worker failed', job.id, err));
  console.log('Approval worker started');
  workerInstance = worker;
  return worker;
}

module.exports = { startApprovalWorker };