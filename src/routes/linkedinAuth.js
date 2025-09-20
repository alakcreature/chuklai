const express = require('express');
const router = express.Router();
const { getLinkedInAuthUrl, exchangeCodeForToken, fetchLinkedInProfile } = require('../services/linkedin');
const User = require('../models/User');

router.get('/auth', (req, res) => {
  const { state } = req.query;
  const url = getLinkedInAuthUrl(state || '{}');
  res.redirect(url);
});

router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query; 
    const parsed = state ? JSON.parse(state) : {}; 
    const phone = parsed.phone;
    const tokenData = await exchangeCodeForToken(code);
    //  console.log(tokenData, "token");
     
    const profile = await fetchLinkedInProfile(tokenData.access_token);
    const profileUrn = profile.sub ? `urn:li:person:${profile?.sub}` : null;
    console.log("profileData fetched");
    
    let user = null; 
    if (profileUrn) {
      user = await User.findOne({ 'linkedin.profile_urn': profileUrn }); 
      if (!user && phone) {
        user = await User.findOne({ phone }); 
        if (!user){
          user = new User({ phone, name: profile?.name, email: profile?.email });
          user.name = profile.localizedFirstName ? `${profile.localizedFirstName} ${profile.localizedLastName || ''}`.trim() : user.name;
          user.linkedin = { 
            access_token: tokenData.access_token, 
            refresh_token: tokenData.refresh_token || null, 
            expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null, 
            profile_urn: profileUrn 
          };
          await user.save();
        } 
      }
    } 
    
    
    return res.redirect(`/after_auth.html?userId=${encodeURIComponent(user._id.toString())}`);

    // res.send(`<h3>LinkedIn connected for ${user.phone || 'unknown phone'}</h3><p>You can close this window.</p>`);
  } catch (err) { console.error('linkedin callback error', err); res.status(500).send('LinkedIn connection failed'); }
});

module.exports = router;
