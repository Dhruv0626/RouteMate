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
