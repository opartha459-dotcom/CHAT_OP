const nodemailer = require('nodemailer');

// Do NOT cache the transporter as a module-level singleton —
// env vars may not be loaded yet when this module is first required.
// Instead, create it fresh on every call (nodemailer handles connection pooling internally).

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }

  // Development / Mock fallback: logs email securely without exposing credentials
  return {
    sendMail: async (options) => {
      console.log(`\n================== [EMAIL DISPATCHED - MOCK] ==================`);
      console.log(`⚠️  SMTP not configured — email was NOT sent. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env`);
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`From: ${options.from || 'PulseChat <noreply@pulsechat.io>'}`);
      if (options.text) console.log(`Text: ${options.text}`);
      console.log(`===============================================================\n`);
      return { messageId: `mock_${Date.now()}` };
    }
  };
}

const getClientBaseUrl = () => {
  return process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0].trim() : 'http://localhost:5173';
};

// Base HTML Template Layout
const renderBaseTemplate = ({ title, bodyHtml, actionUrl, actionText, warningText = '' }) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 32px 24px; font-size: 14px; line-height: 1.6; }
    .btn { display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; margin: 20px 0; text-align: center; }
    .btn:hover { background-color: #4338ca; }
    .warning { font-size: 12px; color: #64748b; background-color: #f1f5f9; padding: 12px; border-radius: 8px; margin-top: 24px; }
    .footer { padding: 20px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PulseChat Messenger</h1>
    </div>
    <div class="content">
      ${bodyHtml}
      ${actionUrl && actionText ? `<div style="text-align: center;"><a href="${actionUrl}" class="btn">${actionText}</a></div>` : ''}
      ${actionUrl ? `<p style="font-size: 12px; color: #94a3b8; word-break: break-all;">If the button doesn't work, copy and paste this URL into your browser:<br><a href="${actionUrl}" style="color: #4f46e5;">${actionUrl}</a></p>` : ''}
      ${warningText ? `<div class="warning">${warningText}</div>` : ''}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} PulseChat. All rights reserved.<br>End-to-End Encrypted Real-Time Messaging.
    </div>
  </div>
</body>
</html>
  `;
};

// 1. Email Verification
const sendVerificationEmail = async (email, username, token) => {
  const verifyUrl = `${getClientBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const bodyHtml = `
    <h2>Welcome to PulseChat, ${username}!</h2>
    <p>Please confirm your email address to activate all messaging features and secure your account.</p>
  `;
  const html = renderBaseTemplate({
    title: 'Verify your PulseChat email',
    bodyHtml,
    actionUrl: verifyUrl,
    actionText: 'Verify Email Address',
    warningText: 'This verification link will expire in 24 hours. If you did not sign up for PulseChat, you can safely ignore this email.'
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"PulseChat" <noreply@pulsechat.io>',
    to: email,
    subject: 'Verify your PulseChat email address',
    text: `Welcome to PulseChat, ${username}!\nPlease verify your email by clicking: ${verifyUrl}\nThis link expires in 24 hours.`,
    html
  };

  return getTransporter().sendMail(mailOptions);
};

// 2. Password Reset
const sendPasswordResetEmail = async (email, username, token) => {
  const resetUrl = `${getClientBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const bodyHtml = `
    <h2>Password Reset Request</h2>
    <p>Hello ${username}, we received a request to reset your PulseChat password. Click the button below to create a new password:</p>
  `;
  const html = renderBaseTemplate({
    title: 'Reset your PulseChat password',
    bodyHtml,
    actionUrl: resetUrl,
    actionText: 'Reset Password',
    warningText: 'This single-use reset link expires in 1 hour. If you did not make this request, your account remains secure and no changes have been made.'
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"PulseChat Security" <security@pulsechat.io>',
    to: email,
    subject: 'Reset your PulseChat password',
    text: `Hello ${username},\nReset your password using this link: ${resetUrl}\nExpires in 1 hour.`,
    html
  };

  return getTransporter().sendMail(mailOptions);
};

// ── Admin-deleted account notification ──────────────────────────────────────
const sendAdminDeletionEmail = async (email, username, reason = '', appealUrl = '') => {
  const bodyHtml = `
    <h2>Your PulseChat Account Has Been Removed</h2>
    <p>Hello <strong>${username}</strong>,</p>
    <p>An administrator has <strong>permanently removed</strong> your PulseChat account.</p>
    <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:14px 16px;border-radius:6px;margin:16px 0;">
      <p style="margin:0;font-weight:600;color:#b91c1c;">Reason provided by administrator:</p>
      <p style="margin:8px 0 0;color:#374151;">${reason || 'No specific reason provided.'}</p>
    </div>
    <p>If you believe this action was made in error, you can submit an appeal below. An administrator will review your case.</p>
  `;

  const html = renderBaseTemplate({
    title: 'PulseChat Account Removed',
    bodyHtml,
    actionUrl: appealUrl || undefined,
    actionText: appealUrl ? 'Submit an Appeal' : undefined,
    warningText: 'If this was not a mistake, no further action is required.'
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"PulseChat Support" <support@pulsechat.io>',
    to: email,
    subject: 'Your PulseChat account has been removed',
    text: `Hello ${username},\n\nYour account has been removed by an administrator.\nReason: ${reason || 'No reason provided.'}\n\nTo appeal: ${appealUrl || 'Contact support.'}`,
    html
  };

  return getTransporter().sendMail(mailOptions);
};

// 3. Account Deletion Confirmation
const sendDeletionConfirmationEmail = async (email, username, token, retentionDays = 14) => {
  const confirmUrl = `${getClientBaseUrl()}/confirm-deletion?token=${encodeURIComponent(token)}`;
  const bodyHtml = `
    <h2>Account Deletion Confirmation</h2>
    <p>Hello ${username},</p>
    <p>A request was made to delete your PulseChat account. Your account remains <strong>fully active</strong> until you confirm this action via the link below.</p>
    <p>After confirmation, your account will enter a <strong>${retentionDays}-day retention period</strong> during which you may request account recovery.</p>
  `;
  const html = renderBaseTemplate({
    title: 'Confirm PulseChat Account Deletion',
    bodyHtml,
    actionUrl: confirmUrl,
    actionText: 'Confirm Account Deletion',
    warningText: `Important: Your account is NOT deleted yet. You must click the button above to confirm. This confirmation link will expire in 2 hours.`
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"PulseChat Account Services" <accounts@pulsechat.io>',
    to: email,
    subject: 'Confirm your PulseChat account deletion request',
    text: `Hello ${username},\nConfirm deletion of your account: ${confirmUrl}\nYour account remains active until confirmed.`,
    html
  };

  return getTransporter().sendMail(mailOptions);
};

// 4. Account Recovery Request Notification (Sent to user when they request recovery)
const sendRecoveryNotificationEmail = async (email, username, requestId) => {
  const bodyHtml = `
    <h2>Account Recovery Request Submitted</h2>
    <p>Hello ${username},</p>
    <p>Your request to restore your retained PulseChat account has been submitted to the moderation administration queue (Reference: <code>${requestId}</code>).</p>
    <p>An administrator will review your account ownership. You will receive an email once the request has been approved or rejected.</p>
  `;
  const html = renderBaseTemplate({
    title: 'Account Recovery Request Received',
    bodyHtml,
    warningText: 'Your account remains in retention mode until an administrator completes review.'
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"PulseChat Support" <support@pulsechat.io>',
    to: email,
    subject: `PulseChat Recovery Request Received (Ref: ${requestId.substring(0, 8)})`,
    text: `Hello ${username},\nYour recovery request (Ref: ${requestId}) has been submitted for administrative review.`,
    html
  };

  return getTransporter().sendMail(mailOptions);
};

// 5. Recovery Approval or Rejection Decision Email
const sendRecoveryDecisionEmail = async (email, username, approved, reason = '') => {
  const loginUrl = `${getClientBaseUrl()}/login`;
  const bodyHtml = approved
    ? `
      <h2>Account Restored Successfully!</h2>
      <p>Hello ${username},</p>
      <p>Your account recovery request has been <strong>approved</strong> by an administrator. Your account profile, groups, and message records have been restored.</p>
    `
    : `
      <h2>Account Recovery Request Not Approved</h2>
      <p>Hello ${username},</p>
      <p>Your account recovery request could not be approved for the following reason:</p>
      <blockquote style="background: #f1f5f9; padding: 12px; border-left: 4px solid #ef4444; margin: 12px 0;">
        ${reason || 'Could not verify registered account ownership.'}
      </blockquote>
    `;

  const html = renderBaseTemplate({
    title: approved ? 'PulseChat Account Restored' : 'Recovery Request Status',
    bodyHtml,
    actionUrl: approved ? loginUrl : undefined,
    actionText: approved ? 'Log In to PulseChat' : undefined,
    warningText: approved ? 'Welcome back! We recommend reviewing your security settings upon login.' : ''
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"PulseChat Support" <support@pulsechat.io>',
    to: email,
    subject: approved ? 'Your PulseChat account has been restored!' : 'Update on your PulseChat recovery request',
    text: approved ? `Hello ${username},\nYour account has been restored! Log in at: ${loginUrl}` : `Hello ${username},\nYour recovery request was not approved: ${reason}`,
    html
  };

  return getTransporter().sendMail(mailOptions);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendDeletionConfirmationEmail,
  sendRecoveryNotificationEmail,
  sendRecoveryDecisionEmail,
  sendAdminDeletionEmail
};
