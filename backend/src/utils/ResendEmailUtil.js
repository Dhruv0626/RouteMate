import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER || process.env.EMAIL,
    pass: process.env.GMAIL_APP_PASS || process.env.EMAIL_PASSWORD,
  },
});

const FROM_EMAIL = `"RouteMate Safety" <${process.env.GMAIL_USER || process.env.EMAIL}>`;

// ─── SOS Emergency Email Template ─────────────────────────────────────────────
const getSOSEmailTemplate = ({ passengerName, emergencyLink, triggerMethod }) => {
  const methodLabels = {
    manual_button:   "Passenger triggered SOS manually",
    shake_gesture:   "Passenger shook device (distress signal)",
    auto_timeout:    "Driver stopped for 15+ minutes with no progress",
    route_deviation: "Driver moved away from destination for 6+ minutes",
  };
  const reason = methodLabels[triggerMethod] || "Emergency triggered";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🆘 RouteMate Emergency Alert</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=Inter:wght@400;600&display=swap');
    body { background-color: #030712; margin: 0; padding: 0;
           font-family: 'Inter', sans-serif; color: #e5e7eb; }
    .wrapper { width: 100%; background-color: #030712; padding: 20px 0; }
    .container { max-width: 520px; margin: 40px auto; background: #0f172a;
                 border: 1px solid #7f1d1d; border-radius: 24px; overflow: hidden;
                 box-shadow: 0 25px 50px -12px rgba(239,68,68,0.2); }
    .danger-bar { height: 6px; background: linear-gradient(90deg, #dc2626, #ef4444, #dc2626); }
    .header { padding: 36px 30px 16px; text-align: center; }
    .logo { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 900;
            color: #fff; letter-spacing: -2px; font-style: italic; }
    .logo span { color: #ffcc00; }
    .sos-badge { display: inline-block; background: rgba(239,68,68,0.15);
                 border: 2px solid #ef4444; border-radius: 50px;
                 padding: 8px 24px; margin: 16px auto;
                 font-family: 'Outfit', sans-serif; font-size: 22px;
                 font-weight: 900; color: #ef4444; letter-spacing: 4px; }
    .content { padding: 8px 40px 36px; text-align: center; }
    .title { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 900;
             color: #fca5a5; margin-bottom: 10px; }
    .subtitle { font-size: 15px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }
    .reason-box { background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.2);
                  border-left: 4px solid #ef4444; border-radius: 12px;
                  padding: 14px 20px; margin-bottom: 28px; text-align: left; }
    .reason-label { font-size: 10px; font-weight: 700; text-transform: uppercase;
                    letter-spacing: 1.5px; color: #ef4444; margin-bottom: 6px; }
    .reason-text { font-size: 14px; color: #cbd5e1; }
    .cta-btn { display: block; background: linear-gradient(135deg, #dc2626, #ef4444);
               color: #fff; text-decoration: none; padding: 16px 32px;
               border-radius: 14px; font-family: 'Outfit', sans-serif;
               font-size: 17px; font-weight: 900; letter-spacing: -0.5px;
               margin: 0 auto 20px; box-shadow: 0 8px 24px rgba(239,68,68,0.35); }
    .expiry-note { font-size: 12px; color: #475569; margin-top: 16px; }
    .footer { padding: 24px 30px; background: #020617; text-align: center;
              border-top: 1px solid #1e293b; }
    .footer p { font-size: 12px; color: #475569; margin: 4px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="danger-bar"></div>
      <div class="header">
        <div class="logo">Route<span>Mate</span></div>
        <div class="sos-badge">🆘 SOS ALERT</div>
      </div>
      <div class="content">
        <div class="title">${passengerName} needs help!</div>
        <div class="subtitle">
          An emergency alert has been triggered during their RouteMate ride.
          Their live location is being shared with you right now.
        </div>
        <div class="reason-box">
          <div class="reason-label">Trigger Reason</div>
          <div class="reason-text">${reason}</div>
        </div>
        <a href="${emergencyLink}" class="cta-btn">📍 View Live Location</a>
        <p class="expiry-note">This link is active for 24 hours. Open it immediately.</p>
      </div>
      <div class="footer">
        <p>© 2026 RouteMate. Emergency Safety System.</p>
        <p>This is an automated emergency alert. Do not reply.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

// ─── Send SOS Emergency Email ─────────────────────────────────────────────────
/**
 * @param {Object} params
 * @param {string} params.toEmail      - Recipient email address
 * @param {string} params.toName       - Recipient name
 * @param {string} params.passengerName
 * @param {string} params.emergencyLink
 * @param {string} params.triggerMethod
 */
export const sendSOSEmail = async ({ toEmail, toName, passengerName, emergencyLink, triggerMethod }) => {
  try {
    await transporter.sendMail({
      from:    FROM_EMAIL,
      to:      toEmail,
      subject: `🆘 Emergency Alert — ${passengerName} needs help right now`,
      html:    getSOSEmailTemplate({ passengerName, emergencyLink, triggerMethod }),
    });

    console.log(`📧 SOS email sent to ${toName} <${toEmail}>`);
    return true;
  } catch (err) {
    console.error(`[EmailUtil] Failed to send SOS email to ${toEmail}:`, err.message);
    return false;
  }
};

// ─── Send Test Email ──────────────────────────────────────────────────────────
export const sendTestSOSEmail = async ({ toEmail, toName, passengerName }) => {
  const testLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/emergency/test-token`;
  return sendSOSEmail({
    toEmail,
    toName,
    passengerName,
    emergencyLink: testLink,
    triggerMethod: "manual_button",
  });
};
