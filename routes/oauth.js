const express = require('express');
const axios = require('axios');
const router = express.Router();
const supabase = require('../db/connection');
require('dotenv').config();

// GHL redirects here after the user installs the app and authorizes it.
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }

  let tokenData;
  try {
    const tokenResponse = await axios.post(
      'https://services.leadconnectorhq.com/oauth/token',
      new URLSearchParams({
        client_id: process.env.GHL_CLIENT_ID,
        client_secret: process.env.GHL_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.GHL_REDIRECT_URI
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    tokenData = tokenResponse.data;
  } catch (err) {
    console.error('Token exchange error:', err.response?.data || err.message);
    return res.status(500).send('Something went wrong during installation. Please try again or contact support.');
  }

  const { access_token, refresh_token, expires_in, locationId, companyId } = tokenData;

  if (!locationId) {
    console.error('No locationId returned from token exchange:', tokenData);
    return res.status(400).send('Install did not return a location. Please contact support.');
  }

  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  const { error } = await supabase
    .from('installs')
    .upsert(
      {
        location_id: locationId,
        company_id: companyId || null,
        access_token,
        refresh_token,
        token_expires_at: expiresAt
      },
      { onConflict: 'location_id' }
    );

  if (error) {
    console.error('Supabase error saving install:', error.message);
    return res.status(500).send('Something went wrong saving the install. Please contact support.');
  }

  res.redirect(`${process.env.APP_BASE_URL}/?locationId=${locationId}`);
});

module.exports = router;
