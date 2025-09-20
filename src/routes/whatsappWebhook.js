const express = require('express');
const router = express.Router();
const Draft = require('../models/Draft');
const User = require('../models/User');
const { sendWhatsApp } = require('../services/whatsapp');
const { postToLinkedIn } = require('../services/linkedin');
const { generateDraftForUser } = require('../services/langchainAgent');
const { enqueueApprovalTimeout } = require('../queues/approvalQueue');

router.post(
  "/webhook",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    try {
      const from = req.body.From || req.body.from;
      const body = (req.body.Body || req.body.body || "").trim();
      const userPhone = (from || "").replace("whatsapp:", "");
      console.log("whatsapp message about to send");

      const user = await User.findOne({ phone: userPhone });
      if (!user) {
        await sendWhatsApp(userPhone, "No account found for this phone.");
        return res.send("<Response></Response>");
      }

      const draft = await Draft.findOne({
        user: user._id,
        status: "PENDING_APPROVAL",
      }).sort({ sentAt: -1 });
      
      const upper = body.toUpperCase();

      // 📝 POST command - Direct content posting (no LLM)
      if (upper.startsWith("POST")) {
        console.log("inside post");
        try {
          const content = body.substring(4).trim(); // Remove "POST " prefix
          
          if (!content) {
            await sendWhatsApp(userPhone, "❌ Please provide content after 'POST '. Example: POST Your post content here");
            return res.send("<Response></Response>");
          }
          await sendWhatsApp(userPhone, "🔄 Sending it to linkedin...");

          // Create draft with user's content
          const draft = new Draft({
            user: user._id,
            content: content,
            status: 'PENDING_APPROVAL',
            sentAt: new Date(),
            approvalDeadline: new Date(Date.now() + 10 * 60 * 1000)
          });
          await draft.save();

          const message = `�� Your Content Ready (ID: ${draft._id}):\n\n${draft.content}\n\nReply:\nA - Accept & post now\nR - Reject\nE: <your edited text> - Edit and post\nAuto-post in 10 minutes if no reply.`;
          await sendWhatsApp(userPhone, message);
          await enqueueApprovalTimeout(draft._id.toString(), 10 * 60 * 1000);
          
          return res.send("<Response></Response>");
        } catch (error) {
          console.error('POST command error:', error);
          await sendWhatsApp(userPhone, "❌ Failed to process your content. Please try again.");
          return res.send("<Response></Response>");
        }
      }

      // 🎓 TRAIN command - Save content for LLM training (no posting)
      if (upper.startsWith("TRAIN ") || upper.startsWith("T ")) {
        console.log("inside train");
        try {
          const content = body.startsWith("TRAIN ") ? body.substring(6).trim() : body.substring(2).trim();
          
          if (!content) {
            await sendWhatsApp(userPhone, "❌ Please provide content after 'TRAIN ' or 'T '. Example: TRAIN Your joke content here");
            return res.send("<Response></Response>");
          }

          // Create draft for training purposes (status: POSTED to be used as examples)
          const draft = new Draft({
            user: user._id,
            content: content,
            status: 'POSTED', // Mark as POSTED so it's used as training example
            sentAt: new Date(),
            externalPostId: `TRAIN-${Date.now()}` // Mark as training data
          });
          await draft.save();

          await sendWhatsApp(userPhone, `🎓 Training data saved! (ID: ${draft._id})\n\nContent: "${content}"\n\nThis will be used to improve future AI-generated content.`);
          
          return res.send("<Response></Response>");
        } catch (error) {
          console.error('TRAIN command error:', error);
          await sendWhatsApp(userPhone, "❌ Failed to save training data. Please try again.");
          return res.send("<Response></Response>");
        }
      }


      if (upper === "GENERATE" || upper === "GEN" || upper === "NEW") {
        try {
          await sendWhatsApp(userPhone, "🔄 Generating new draft for you...");
          
          const draft = await generateDraftForUser(user);
          draft.status = 'PENDING_APPROVAL';
          draft.sentAt = new Date();
          draft.approvalDeadline = new Date(Date.now() + 10 * 60 * 1000);
          await draft.save();

          const message = `📝 New Draft Ready (ID: ${draft._id}):\n\n${draft.content}\n\nReply:\nA - Accept & post now\nR - Reject\nE: <your edited text> - Edit and post\nAuto-post in 10 minutes if no reply.`;
          await sendWhatsApp(userPhone, message);
          await enqueueApprovalTimeout(draft._id.toString(), 10 * 60 * 1000);
          
          return res.send("<Response></Response>");
        } catch (error) {
          console.error('Generate command error:', error);
          await sendWhatsApp(userPhone, "❌ Failed to generate draft. Please try again later.");
          return res.send("<Response></Response>");
        }
      }

      // Check for pending draft for approval commands
      const draft2 = await Draft.findOne({
        user: user._id,
        status: "PENDING_APPROVAL",
      }).sort({ sentAt: -1 });

      if (!draft2) {
        await sendWhatsApp(userPhone, "No pending draft found. Send 'GENERATE' to create a new draft.");
        return res.send("<Response></Response>");
      }

      // if (!draft) {
      //   await sendWhatsApp(userPhone, "No pending draft found.");
      //   return res.send("<Response></Response>");
      // }

      // ✅ Accept
      if (upper === "A" || upper === "ACCEPT" || upper === "YES") {
        const resp = await postToLinkedIn(draft.content, user);
        draft.status = "POSTED";
        draft.externalPostId = resp.external_post_id;
        await draft.save();

        await sendWhatsApp(
          userPhone,
          `Posted ✅ ${resp.external_post_id}`
        );
        return res.send("<Response></Response>");
      }

      // ❌ Reject
      if (upper === "R" || upper === "REJECT" || upper === "NO") {
        draft.status = "REJECTED";
        await draft.save();

        await sendWhatsApp(userPhone, "Rejected — draft discarded.");
        return res.send("<Response></Response>");
      }

      // ✏️ Edited content
      let edited = body;
      if (edited.match(/^E:\s*/i)) {
        edited = edited.replace(/^E:\s*/i, "");
      }

      draft.content = edited;
      await draft.save();

      if (edited.length > 3000) {
        draft.status = "FAILED";
        await draft.save();

        await sendWhatsApp(
          userPhone,
          "Edited draft too long, not posted."
        );
        return res.send("<Response></Response>");
      }

      // Post edited draft
      const resp = await postToLinkedIn(edited, user);
      draft.status = "POSTED";
      draft.externalPostId = resp.external_post_id;
      await draft.save();

      await sendWhatsApp(
        userPhone,
        `Edited post published ✅ ${resp.external_post_id}`
      );
      return res.send("<Response></Response>");
    } catch (err) {
      console.error("whatsapp webhook error", err);
      res.status(500).send("<Response></Response>");
    }
  }
);


module.exports = router;