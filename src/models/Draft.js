const mongoose = require('mongoose');

const draftSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  status: { type: String, enum: ['DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','POSTED','FAILED'], default: 'DRAFT' },
  sentAt: Date,
  approvalDeadline: Date,
  externalPostId: String,
  embedding: { type: [Number], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Draft', draftSchema);