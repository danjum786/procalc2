const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const supabase = require('../db/connection');
const { sendAccessRequestEmail } = require('../mailer');
require('dotenv').config();

// GET /api/status?locationId=xxx
router.get('/status', async (req, res) => {
  const { locationId } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });

  const { data, error } = await supabase
    .from('installs')
    .select('status, name')
    .eq('location_id', locationId)
    .maybeSingle();

  if (error) {
    console.error('Supabase error in /status:', error.message);
    return res.status(500).json({ error: 'Database error', detail: error.message });
  }

  if (!data) {
    return res.json({ status: 'none' });
  }
  res.json({ status: data.status, name: data.name });
});

// POST /api/submit
// Body: { locationId, name, email, phone, website }
router.post('/submit', express.json(), async (req, res) => {
  const { locationId, name, email, phone, website } = req.body;

  if (!locationId || !name || !email) {
    return res.status(400).json({ error: 'locationId, name and email are required' });
  }

  const approveToken = crypto.randomBytes(24).toString('hex');
  const submittedAt = new Date().toISOString();

  const { error } = await supabase
    .from('installs')
    .upsert(
      {
        location_id: locationId,
        name,
        email,
        phone: phone || null,
        website: website || null,
        status: 'pending',
        approve_token: approveToken,
        submitted_at: submittedAt
      },
      { onConflict: 'location_id' }
    );

  if (error) {
    console.error('Supabase error in /submit:', error.message);
    return res.status(500).json({ error: 'Database error', detail: error.message });
  }

  const base = process.env.APP_BASE_URL;
  const approveUrl = `${base}/api/approve?id=${encodeURIComponent(locationId)}&token=${approveToken}`;
  const rejectUrl = `${base}/api/reject?id=${encodeURIComponent(locationId)}&token=${approveToken}`;

  try {
    await sendAccessRequestEmail({ locationId, name, email, phone, website, approveUrl, rejectUrl });
  } catch (err) {
    console.error('Failed to send owner notification email:', err.message);
    // Submission is already saved - don't fail the request just because email had an issue.
  }

  res.json({ ok: true, status: 'pending' });
});

module.exports = router;
