export const getEmailTemplate = ({ title, message, otp, expiry }) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RouteMate - ${title}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=Inter:wght@400;600&display=swap');
            
            body {
                background-color: #030712;
                margin: 0;
                padding: 0;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #e5e7eb;
            }
            .wrapper {
                width: 100%;
                background-color: #030712;
                padding: 20px 0;
            }
            .container {
                max-width: 500px;
                margin: 40px auto;
                background: #0f172a;
                border: 1px solid #1e293b;
                border-radius: 28px;
                overflow: hidden;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                position: relative;
            }
            .accent-bar {
                height: 4px;
                background: linear-gradient(90deg, #ffcc00, #e6b800);
            }
            .header {
                padding: 40px 30px 20px;
                text-align: center;
            }
            .logo {
                font-family: 'Outfit', sans-serif;
                font-size: 32px;
                font-weight: 900;
                color: #ffffff;
                letter-spacing: -2px;
                font-style: italic;
            }
            .logo span {
                color: #ffcc00;
            }
            .content {
                padding: 20px 40px 40px;
                text-align: center;
            }
            .status-icon {
                font-size: 48px;
                margin-bottom: 20px;
            }
            .title {
                font-family: 'Outfit', sans-serif;
                font-size: 24px;
                font-weight: 700;
                color: #ffffff;
                margin-bottom: 12px;
                letter-spacing: -0.5px;
            }
            .message {
                font-size: 15px;
                line-height: 1.6;
                color: #94a3b8;
                margin-bottom: 30px;
            }
            .otp-box {
                background: rgba(255, 204, 0, 0.05);
                border: 1px solid rgba(255, 204, 0, 0.2);
                border-radius: 20px;
                padding: 30px;
                margin-bottom: 30px;
                position: relative;
            }
            .otp-code {
                font-family: 'Outfit', sans-serif;
                font-size: 48px;
                font-weight: 900;
                color: #ffcc00;
                letter-spacing: 12px;
                margin: 0;
                padding-left: 12px; /* For centering letter spacing */
            }
            .expiry-pill {
                display: inline-block;
                background: rgba(255, 204, 0, 0.1);
                color: #ffcc00;
                padding: 4px 12px;
                border-radius: 9999px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-top: 15px;
            }
            .footer {
                padding: 30px;
                background-color: #020617;
                text-align: center;
                border-top: 1px solid #1e293b;
            }
            .footer p {
                font-size: 12px;
                color: #475569;
                margin: 4px 0;
            }
            .social-links {
                margin-top: 20px;
            }
            .social-links a {
                color: #94a3b8;
                text-decoration: none;
                margin: 0 10px;
                font-size: 12px;
            }
            .security-msg {
                font-size: 11px;
                color: #334155;
                margin-top: 20px;
                font-style: italic;
            }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="accent-bar"></div>
                <div class="header">
                    <div class="logo">Route<span>Mate</span></div>
                </div>
                <div class="content">
                    <div class="title">${title}</div>
                    <div class="message">${message}</div>
                    <div class="otp-box">
                        <div class="otp-code">${otp}</div>
                        <span class="expiry-pill">Expires in ${expiry} mins</span>
                    </div>
                    <p style="font-size: 13px; color: #475569; margin: 0;">
                        Secure Verification Protocol Active 🛡️
                    </p>
                </div>
                <div class="footer">
                    <p>Propelled by RouteMate Urban Core</p>
                    <p>© 2026 RouteMate. All intellectual property secured.</p>
                    <div class="security-msg">
                        Identity verification is required for all administrative actions. 
                        If you did not initiate this, please secure your account.
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};

/**
 * Account Status Email Template (suspension / reinstatement)
 * @param {Object} params
 * @param {string} params.userName  - Recipient's full name
 * @param {string} params.type      - "suspended" | "reinstated"
 * @param {string} params.reason    - Human-readable reason for the action
 */
export const getAccountStatusTemplate = ({ userName, type, reason }) => {
    const isSuspended = type === "suspended";
    const accentColor  = isSuspended ? "#ef4444" : "#22c55e";
    const icon         = isSuspended ? "🚫" : "✅";
    const headline     = isSuspended ? "Account Suspended" : "Account Reinstated";
    const subheading   = isSuspended
        ? `Hi ${userName}, your RouteMate account has been temporarily suspended by our Trust & Safety team.`
        : `Hi ${userName}, great news! Your RouteMate account has been fully reinstated and is active again.`;
    const cta = isSuspended
        ? "If you believe this was a mistake, please contact our support team immediately."
        : "You can now sign in and continue using RouteMate as normal.";

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RouteMate — ${headline}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=Inter:wght@400;600&display=swap');
            body { background-color: #030712; margin: 0; padding: 0;
                   font-family: 'Inter', sans-serif; color: #e5e7eb; }
            .wrapper { width: 100%; background-color: #030712; padding: 20px 0; }
            .container { max-width: 500px; margin: 40px auto; background: #0f172a;
                         border: 1px solid #1e293b; border-radius: 28px; overflow: hidden;
                         box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
            .accent-bar { height: 4px; background: ${accentColor}; }
            .header { padding: 40px 30px 20px; text-align: center; }
            .logo { font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 900;
                    color: #fff; letter-spacing: -2px; font-style: italic; }
            .logo span { color: #ffcc00; }
            .content { padding: 20px 40px 40px; text-align: center; }
            .icon { font-size: 56px; margin-bottom: 16px; }
            .title { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 900;
                     color: ${accentColor}; margin-bottom: 12px; letter-spacing: -0.5px; }
            .subheading { font-size: 15px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }
            .reason-box { background: rgba(255,255,255,0.03); border: 1px solid #1e293b;
                          border-left: 4px solid ${accentColor}; border-radius: 12px;
                          padding: 20px 24px; margin-bottom: 24px; text-align: left; }
            .reason-label { font-size: 10px; font-weight: 700; text-transform: uppercase;
                            letter-spacing: 1.5px; color: ${accentColor}; margin-bottom: 8px; }
            .reason-text { font-size: 14px; color: #cbd5e1; line-height: 1.6; }
            .cta { font-size: 13px; color: #64748b; margin-top: 20px; }
            .footer { padding: 24px 30px; background: #020617; text-align: center;
                      border-top: 1px solid #1e293b; }
            .footer p { font-size: 12px; color: #475569; margin: 4px 0; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="accent-bar"></div>
                <div class="header"><div class="logo">Route<span>Mate</span></div></div>
                <div class="content">
                    <div class="icon">${icon}</div>
                    <div class="title">${headline}</div>
                    <div class="subheading">${subheading}</div>
                    <div class="reason-box">
                        <div class="reason-label">Reason for this action</div>
                        <div class="reason-text">${reason || "Violation of RouteMate Community Guidelines and Terms of Service."}</div>
                    </div>
                    <p class="cta">${cta}</p>
                </div>
                <div class="footer">
                    <p>© 2026 RouteMate. All rights reserved.</p>
                    <p>This is an automated message from RouteMate Trust &amp; Safety.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};
