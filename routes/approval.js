const express = require('express');
const router = express.Router();
const supabase = require('../db/connection');
const { sendDecisionEmail } = require('../mailer');

async function handleDecision(req, res, decision) {
  const { id: locationId, token } = req.query;

  if (!locationId || !token) {
    return res.status(400).send('Invalid or expired link.');
  }

  const { data: record, error: findError } = await supabase
    .from('installs')
    .select('*')
    .eq('location_id', locationId)
    .eq('approve_token', token)
    .maybeSingle();

  if (findError) {
    console.error('Supabase error finding record:', findError.message);
    return res.status(500).send('Database error. Please try again.');
  }

  if (!record) {
    return res.status(404).send('Request not found, or this link has already been used.');
  }

  const { error: updateError } = await supabase
    .from('installs')
    .update({
      status: decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'Richard',
      approve_token: null
    })
    .eq('location_id', locationId);

  if (updateError) {
    console.error('Supabase error updating record:', updateError.message);
    return res.status(500).send('Database error. Please try again.');
  }

  try {
    await sendDecisionEmail({ to: record.email, name: record.name, approved: decision === 'approved' });
  } catch (err) {
    console.error('Failed to send decision email to builder:', err.message);
  }

  res.send(`
    <html>
      <body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h2>Request ${decision === 'approved' ? 'approved' : 'rejected'}</h2>
        <p>Location: ${locationId}</p>
        <p>The applicant has been notified by email.</p>
      </body>
    </html>
  `);
}

// GET /api/approve?id=xxx&token=yyy  (clicked from the owner's email)
router.get('/approve', (req, res) => handleDecision(req, res, 'approved'));

// GET /api/reject?id=xxx&token=yyy
router.get('/reject', (req, res) => handleDecision(req, res, 'rejected'));

module.exports = router;
