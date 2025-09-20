const { Queue } = require('bullmq');
const { createClient } = require('redis');
const { REDIS_URL } = require('../config');

let approvalQueue = null;

async function getApprovalQueue(){
  if(approvalQueue) return approvalQueue;
  const connection = createClient({ url: REDIS_URL });
  await connection.connect();
  approvalQueue = new Queue('approvalQueue', { connection });
  return approvalQueue;
}

async function enqueueApprovalTimeout(draftId, delayMs = 10 * 60 * 1000){
  const q = await getApprovalQueue();
  return q.add('approvalTimeout', { draftId }, { delay: delayMs, attempts: 1 });
}

module.exports = { getApprovalQueue, enqueueApprovalTimeout };