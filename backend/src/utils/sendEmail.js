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

/**
 * Universal email sender — Nodemailer Gmail SMTP.
 * Signature kept identical so no callers need to change.
 *
 * @param {{ email: string, subject: string, html: string }} params
 */
export const sendEmail = async ({ email: to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"RouteMate" <${process.env.GMAIL_USER || process.env.EMAIL}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error(`❌ Email failed to ${to}:`, err.message);
    throw err;
  }
};
