const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendAccessRequestEmail({ locationId, name, email, phone, website, approveUrl, rejectUrl }) {
  const subject = 'ProjectScoutIQ access request';
  const html = `
    <h2>New ProjectScoutIQ access request</h2>
    <p><strong>Sub-account (Location ID):</strong> ${locationId}</p>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Phone:</strong> ${phone || '-'}</p>
    <p><strong>Website:</strong> ${website || '-'}</p>
    <hr/>
    <p>
      <a href="${approveUrl}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;margin-right:10px;">Approve</a>
      <a href="${rejectUrl}" style="background:#dc2626;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Reject</a>
    </p>
  `;
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.OWNER_EMAIL,
    subject,
    html
  });
}

async function sendDecisionEmail({ to, name, approved }) {
  const subject = approved ? 'Your ProjectScoutIQ access has been approved' : 'Your ProjectScoutIQ access request';
  const html = approved
    ? `<p>Hi ${name || ''},</p><p>Your access request has been approved. You can now open the ProjectScoutIQ calculator from the app menu inside your GHL sub-account.</p>`
    : `<p>Hi ${name || ''},</p><p>Thanks for your interest in ProjectScoutIQ. At this time we're unable to approve your access request.</p>`;
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html
  });
}

module.exports = { sendAccessRequestEmail, sendDecisionEmail };
