const axios = require('axios');
const { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI, BASE_URL } = require('../config');

function getLinkedInAuthUrl(state){
  const scope = encodeURIComponent('profile email w_member_social openid');
  // const scope = encodeURIComponent('r_liteprofile r_emailaddress w_member_social');
  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&scope=${scope}&state=${encodeURIComponent(state)}`;
}

async function exchangeCodeForToken(code){
  const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
  const params = new URLSearchParams();
  params.append('grant_type','authorization_code');
  params.append('code', code);
  params.append('redirect_uri', LINKEDIN_REDIRECT_URI);
  params.append('client_id', LINKEDIN_CLIENT_ID);
  params.append('client_secret', LINKEDIN_CLIENT_SECRET);
  const resp = await axios.post(tokenUrl, params.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  return resp.data;
}

async function fetchLinkedInProfile(access_token){
  // const me = await axios.get('https://api.linkedin.com/v2/me', { headers: { Authorization: `Bearer ${access_token}` } });
  const me = await axios.get('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${access_token}` } });
  return me.data;
}

async function postToLinkedIn(draftContent, user) {
  if (!user || !user.linkedin || !user.linkedin.access_token) {
    console.log("[LinkedIn simulate] no token — returning simulated id");
    return {
      external_post_id: `SIM-${Date.now()}`,
      link: null,
    };
  }

  // const payload = {
  //   author: user.linkedin.profile_urn,
  //   lifecycleState: "PUBLISHED",
  //   specificContent: {
  //     "com.linkedin.ugc.ShareContent": {
  //       shareCommentary: { text: draftContent },
  //       shareMediaCategory: "NONE",
  //     },
  //   },
  //   visibility: {
  //     "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
  //   },
  // };

  const payload = {
    "author": `${user.linkedin.profile_urn}`,
    "commentary": draftContent,
    "visibility": "PUBLIC",
    "distribution": {
      "feedDistribution": "MAIN_FEED",
      "targetEntities": [],
      "thirdPartyDistributionChannels": []
    },
    "lifecycleState": "PUBLISHED"
  };

  const resp = await axios.post(
    // "https://api.linkedin.com/v2/ugcPosts",
    "https://api.linkedin.com/rest/posts",
    payload,
    {
      headers: {
        Authorization: `Bearer ${user.linkedin.access_token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202509"
      },
    }
  );

  return {
    external_post_id: resp.data || `LINKEDIN-${Date.now()}`,
    link: null,
  };
}


module.exports = { getLinkedInAuthUrl, exchangeCodeForToken, fetchLinkedInProfile, postToLinkedIn };