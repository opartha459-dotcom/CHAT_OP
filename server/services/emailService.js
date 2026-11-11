const nodemailer = require("nodemailer");

// ============================================================
// 1. NODEMAILER SMTP CONFIGURATION
// ============================================================

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;

  if (!host || !user || !pass || !from) {
    throw new Error(
      "SMTP configuration is incomplete. Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM."
    );
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    from,
  };
}

// ============================================================
// 2. CENTRAL EMAIL SENDER
// ============================================================

async function sendEmail(mailOptions) {
  let transporter;
  try {
    const config = getSmtpConfig();

    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      connectionTimeout: config.connectionTimeout,
      greetingTimeout: config.greetingTimeout,
      socketTimeout: config.socketTimeout,
    });

    const info = await transporter.sendMail({
      from: config.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      text: mailOptions.text,
      html: mailOptions.html,
    });

    if (!info?.messageId) {
      throw new Error("SMTP server did not return an email message ID.");
    }

    console.log(`[EMAIL SUCCESS] Gmail SMTP | ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      provider: "Gmail SMTP",
    };
  } catch (error) {
    console.warn("[EMAIL NOTICE] SMTP delivery failed/bypassed (manual code dispatch is active):", error.message || error);
    return {
      success: false,
      fallback: true,
      error: error.message || error,
      provider: "Manual Admin Dispatch"
    };
  } finally {
    if (transporter && typeof transporter.close === 'function') {
      try {
        transporter.close();
      } catch {}
    }
  }
}

// ============================================================
// 3. COMMON HELPERS
// ============================================================

const getClientBaseUrl = () => {
  return process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",")[0].trim().replace(/\/+$/, "")
    : "http://localhost:5173";
};

// Escape HTML to prevent HTML injection.
const escapeHtml = (value = "") => {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
};

// ============================================================
// 4. COLOR THEMES
// ============================================================

const EMAIL_THEMES = {
  default: {
    primary: "#4f46e5",
    secondary: "#7c3aed",
    light: "#eef2ff",
    text: "#3730a3",
  },

  admin: {
    primary: "#b7791f",
    secondary: "#d69e2e",
    light: "#fffbeb",
    text: "#92400e",
  },

  danger: {
    primary: "#e11d48",
    secondary: "#f43f5e",
    light: "#fff1f2",
    text: "#be123c",
  },

  success: {
    primary: "#15803d",
    secondary: "#22c55e",
    light: "#f0fdf4",
    text: "#166534",
  },

  info: {
    primary: "#2563eb",
    secondary: "#3b82f6",
    light: "#eff6ff",
    text: "#1d4ed8",
  },

  security: {
    primary: "#6d28d9",
    secondary: "#9333ea",
    light: "#f5f3ff",
    text: "#5b21b6",
  },
};

// ============================================================
// 5. BASE HTML TEMPLATE
// ============================================================

const renderBaseTemplate = ({
  title,
  bodyHtml,
  actionUrl,
  actionText,
  warningText = "",
  theme = "default",
}) => {
  const colors = EMAIL_THEMES[theme] || EMAIL_THEMES.default;

  const safeTitle = escapeHtml(title);
  const safeUrl = actionUrl ? escapeHtml(actionUrl) : "";
  const safeActionText = escapeHtml(actionText || "");
  const safeWarning = escapeHtml(warningText);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">

  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>${safeTitle}</title>

  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
      Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 20px;
      color: #1e293b;
    }

    .container {
      max-width: 560px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }

    .header {
      background: linear-gradient(
        135deg,
        ${colors.primary},
        ${colors.secondary}
      );
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }

    .header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .content {
      padding: 32px 24px;
      font-size: 14px;
      line-height: 1.7;
    }

    .content h2 {
      color: #1e293b;
      font-size: 21px;
      margin-top: 0;
    }

    .btn {
      display: inline-block;
      padding: 13px 28px;
      background-color: ${colors.primary};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 9px;
      font-weight: 600;
      font-size: 14px;
      margin: 20px 0;
      text-align: center;
    }

    .warning {
      font-size: 12px;
      color: ${colors.text};
      background-color: ${colors.light};
      border-left: 4px solid ${colors.primary};
      padding: 14px;
      border-radius: 7px;
      margin-top: 24px;
    }

    .footer {
      padding: 20px 24px;
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>

<body>

  <div class="container">

    <div class="header">
      <h1>PulseChat Messenger</h1>
    </div>

    <div class="content">

      ${bodyHtml}

      ${actionUrl && actionText
      ? `
            <div style="text-align:center;">
              <a href="${safeUrl}" class="btn">
                ${safeActionText}
              </a>
            </div>
          `
      : ""
    }

      ${actionUrl
      ? `
            <p style="font-size:12px;color:#94a3b8;word-break:break-all;">
              If the button doesn't work, copy and paste this URL:
              <br>
              <a href="${safeUrl}" style="color:${colors.primary};">
                ${safeUrl}
              </a>
            </p>
          `
      : ""
    }

      ${warningText
      ? `<div class="warning">${safeWarning}</div>`
      : ""
    }

    </div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} PulseChat. All rights reserved.
      <br>
      End-to-End Encrypted Real-Time Messaging.
    </div>

  </div>

</body>
</html>
`;
};

// ============================================================
// 6. EMAIL VERIFICATION - GREEN
// ============================================================

const sendVerificationEmail = async (email, username, token) => {
  const verifyUrl =
    `${getClientBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;

  const bodyHtml = `
    <h2>Welcome to PulseChat, ${escapeHtml(username)}!</h2>

    <p>Please confirm your email address to activate all messaging
    features and secure your account.</p>
  `;

  const html = renderBaseTemplate({
    title: "Verify your PulseChat email",
    bodyHtml,
    actionUrl: verifyUrl,
    actionText: "Verify Email Address",
    warningText:
      "This verification link will expire in 24 hours. If you did not sign up for PulseChat, you can safely ignore this email.",
    theme: "success",
  });

  return sendEmail({
    to: email,
    subject: "Verify your PulseChat email address",
    text: `Welcome to PulseChat, ${username}!
Please verify your email: ${verifyUrl}
This link expires in 24 hours.`,
    html,
  });
};

// ============================================================
// 7. PASSWORD RESET - PURPLE
// ============================================================

const sendPasswordResetEmail = async (email, username, token) => {
  const resetUrl =
    `${getClientBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  const bodyHtml = `
    <h2>Password Reset Request</h2>

    <p>Hello ${escapeHtml(username)}, we received a request to reset
    your PulseChat password. Click below to create a new password:</p>
  `;

  const html = renderBaseTemplate({
    title: "Reset your PulseChat password",
    bodyHtml,
    actionUrl: resetUrl,
    actionText: "Reset Password",
    warningText:
      "This single-use reset link expires in 1 hour. If you did not make this request, your account remains secure and no changes have been made.",
    theme: "security",
  });

  return sendEmail({
    to: email,
    subject: "Reset your PulseChat password",
    text: `Hello ${username},
Reset your password: ${resetUrl}
Expires in 1 hour.`,
    html,
  });
};

// ============================================================
// 8. ADMIN-DELETED ACCOUNT - GOLDEN
// ============================================================

const sendAdminDeletionEmail = async (
  email,
  username,
  reason = "",
  appealUrl = ""
) => {
  const bodyHtml = `
    <h2>Your PulseChat Account Has Been Removed</h2>

    <p>Hello <strong>${escapeHtml(username)}</strong>,</p>

    <p>An administrator has
    <strong>permanently removed</strong>
    your PulseChat account.</p>

    <div style="
      background:#fffbeb;
      border-left:4px solid #d69e2e;
      padding:14px 16px;
      border-radius:6px;
      margin:16px 0;
    ">

      <p style="margin:0;font-weight:600;color:#92400e;">
        Reason provided by administrator:
      </p>

      <p style="margin:8px 0 0;color:#374151;">
        ${escapeHtml(reason || "No specific reason provided.")}
      </p>

    </div>

    <p>If you believe this action was made in error,
    you can submit an appeal below. An administrator
    will review your case.</p>
  `;

  const html = renderBaseTemplate({
    title: "PulseChat Account Removed",
    bodyHtml,
    actionUrl: appealUrl || undefined,
    actionText: appealUrl ? "Submit an Appeal" : undefined,
    warningText:
      "If this was not a mistake, no further action is required.",
    theme: "admin",
  });

  return sendEmail({
    to: email,
    subject: "Your PulseChat account has been removed",
    text: `Hello ${username},

Your account has been removed by an administrator.
Reason: ${reason || "No reason provided."}
To appeal: ${appealUrl || "Contact support."}`,
    html,
  });
};

// ============================================================
// 9. ACCOUNT DELETION CONFIRMATION - ROSE RED
// ============================================================

const sendDeletionConfirmationEmail = async (
  email,
  username,
  token,
  retentionDays = 14
) => {
  const confirmUrl =
    `${getClientBaseUrl()}/confirm-deletion?token=${encodeURIComponent(token)}`;

  const bodyHtml = `
    <h2>Account Deletion Confirmation</h2>

    <p>Hello ${escapeHtml(username)},</p>

    <p>A request was made to delete your PulseChat account.
    Your account remains <strong>fully active</strong>
    until you confirm this action via the link below.</p>

    <p>After confirmation, your account will enter a
    <strong>${escapeHtml(retentionDays)}-day retention period</strong>
    during which you may request account recovery.</p>
  `;

  const html = renderBaseTemplate({
    title: "Confirm PulseChat Account Deletion",
    bodyHtml,
    actionUrl: confirmUrl,
    actionText: "Confirm Account Deletion",
    warningText:
      "Important: Your account is NOT deleted yet. You must click the button above to confirm. This confirmation link expires in 2 hours.",
    theme: "danger",
  });

  return sendEmail({
    to: email,
    subject: "Confirm your PulseChat account deletion request",
    text: `Hello ${username},
Confirm deletion: ${confirmUrl}
Your account remains active until confirmed.`,
    html,
  });
};

// ============================================================
// 10. ACCOUNT RECOVERY REQUEST - BLUE
// ============================================================

const sendRecoveryNotificationEmail = async (
  email,
  username,
  requestId
) => {
  const bodyHtml = `
    <h2>Account Recovery Request Submitted</h2>

    <p>Hello ${escapeHtml(username)},</p>

    <p>Your request to restore your retained PulseChat account
    has been submitted to the moderation administration queue.</p>

    <p>Reference:
    <code>${escapeHtml(requestId)}</code></p>

    <p>An administrator will review your account ownership.
    You will receive an email once the request has been approved
    or rejected.</p>
  `;

  const html = renderBaseTemplate({
    title: "Account Recovery Request Received",
    bodyHtml,
    warningText:
      "Your account remains in retention mode until an administrator completes review.",
    theme: "info",
  });

  return sendEmail({
    to: email,
    subject: `PulseChat Recovery Request Received (Ref: ${String(requestId).substring(0, 8)})`,
    text: `Hello ${username},
Your recovery request (Ref: ${requestId}) has been submitted for administrative review.`,
    html,
  });
};

// ============================================================
// 11. RECOVERY APPROVAL / REJECTION
// APPROVED = GREEN | REJECTED = ROSE RED
// ============================================================

const sendRecoveryDecisionEmail = async (
  email,
  username,
  approved,
  reason = ""
) => {
  const loginUrl = `${getClientBaseUrl()}/login`;

  const bodyHtml = approved
    ? `
      <h2>Account Restored Successfully!</h2>

      <p>Hello ${escapeHtml(username)},</p>

      <p>Your account recovery request has been
      <strong>approved</strong> by an administrator.
      Your account profile, groups, and message records
      have been restored.</p>
    `
    : `
      <h2>Account Recovery Request Not Approved</h2>

      <p>Hello ${escapeHtml(username)},</p>

      <p>Your account recovery request could not be approved
      for the following reason:</p>

      <blockquote style="
        background:#fff1f2;
        padding:12px;
        border-left:4px solid #e11d48;
        margin:12px 0;
        border-radius:6px;
      ">
        ${escapeHtml(
      reason || "Could not verify registered account ownership."
    )}
      </blockquote>
    `;

  const html = renderBaseTemplate({
    title: approved
      ? "PulseChat Account Restored"
      : "Recovery Request Status",

    bodyHtml,

    actionUrl: approved ? loginUrl : undefined,

    actionText: approved ? "Log In to PulseChat" : undefined,

    warningText: approved
      ? "Your account has been successfully restored. We recommend reviewing your security settings upon login."
      : "Please contact support if you need further assistance.",

    theme: approved ? "success" : "danger",
  });

  return sendEmail({
    to: email,

    subject: approved
      ? "Your PulseChat account has been restored!"
      : "Update on your PulseChat recovery request",

    text: approved
      ? `Hello ${username},
Your account has been restored! Log in at: ${loginUrl}`
      : `Hello ${username},
Your recovery request was not approved: ${reason}`,

    html,
  });
};

// ============================================================
// 12. EXPORTS
// ============================================================

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendDeletionConfirmationEmail,
  sendRecoveryNotificationEmail,
  sendRecoveryDecisionEmail,
  sendAdminDeletionEmail,
};