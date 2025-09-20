const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateDraftForUser } = require('../services/langchainAgent');
const { sendWhatsApp } = require('../services/whatsapp');
const { enqueueApprovalTimeout } = require('../queues/approvalQueue');

router.post('/manual', async (req,res)=>{
  try{
    const { userId } = req.body; 
    if(!userId) return res.status(400).json({ error: 'userId required' });
    const user = await User.findById(userId); 
    if(!user) return res.status(404).json({ error: 'user not found' });
    const draft = await generateDraftForUser(user);
    draft.status = 'PENDING_APPROVAL'; 
    draft.sentAt = new Date(); 
    draft.approvalDeadline = new Date(Date.now()+10*60*1000); 
    
    await draft.save();
    const message = `Draft ready (id: ${draft._id}):\n\n${draft.content}\n\nReply:\nA - Accept & post now\nR - Reject\nE: <your edited text> - Edit and post\nAuto-post in 10 minutes if no reply.`;
    await sendWhatsApp(user.phone, message);
    await enqueueApprovalTimeout(draft._id.toString(), 10*60*1000);
    res.json({ ok:true, draftId: draft._id });
  }catch(err){ console.error(err); res.status(500).json({ error: err.message }); }
});

module.exports = router;