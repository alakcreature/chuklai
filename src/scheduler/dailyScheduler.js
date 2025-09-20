const CronJob = require('cron').CronJob;
const User = require('../models/User');
const { generateDraftForUser } = require('../services/langchainAgent');
const { sendWhatsApp } = require('../services/whatsapp');
const { enqueueApprovalTimeout } = require('../queues/approvalQueue');

function scheduleDailyJob(){
  // Morning job at 8:50 AM IST
  const morningJob = new CronJob('50 8 * * *', async () => {
    try{
      console.log('Running morning job at 8:50 AM IST');
      const users = await User.find({ 'linkedin.access_token': { $exists: true, $ne: null } });
      for(const user of users){
        try{
          const draft = await generateDraftForUser(user);
          draft.status='PENDING_APPROVAL'; draft.sentAt=new Date(); draft.approvalDeadline=new Date(Date.now()+10*60*1000); await draft.save();
          const message = ` Morning Draft ready (id: ${draft._id}):\n\n${draft.content}\n\nReply:\nA - Accept & post now\nR - Reject\nE: <your edited text> - Edit and post\nAuto-post in 10 minutes if no reply.`;
          await sendWhatsApp(user.phone, message);
          await enqueueApprovalTimeout(draft._id.toString(), 10*60*1000);
        }catch(err){ console.error('failed per-user morning job', err); }
      }
    }catch(err){ console.error('morning job error', err); }
  }, null, true, 'Asia/Kolkata');

  // Evening job at 5:50 PM IST
  const eveningJob = new CronJob('50 17 * * *', async () => {
    try{
      console.log('Running evening job at 5:50 PM IST');
      const users = await User.find({ 'linkedin.access_token': { $exists: true, $ne: null } });
      for(const user of users){
        try{
          const draft = await generateDraftForUser(user);
          draft.status='PENDING_APPROVAL'; draft.sentAt=new Date(); draft.approvalDeadline=new Date(Date.now()+10*60*1000); await draft.save();
          const message = ` Evening Draft ready (id: ${draft._id}):\n\n${draft.content}\n\nReply:\nA - Accept & post now\nR - Reject\nE: <your edited text> - Edit and post\nAuto-post in 10 minutes if no reply.`;
          await sendWhatsApp(user.phone, message);
          await enqueueApprovalTimeout(draft._id.toString(), 10*60*1000);
        }catch(err){ console.error('failed per-user evening job', err); }
      }
    }catch(err){ console.error('evening job error', err); }
  }, null, true, 'Asia/Kolkata');

  morningJob.start();
  eveningJob.start();
  console.log('Daily scheduler set for 8:50 AM and 5:50 PM IST');
}

module.exports = { scheduleDailyJob };
