const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String },
  name: String,
  email: String,
  linkedin: {
    access_token: String,
    refresh_token: String,
    expires_at: Date,
    profile_urn: String
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);