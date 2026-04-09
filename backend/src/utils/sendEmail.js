import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use SSL/TLS
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    // Do not fail on invalid certs (helpful for some server environments)
    rejectUnauthorized: false
  }
});

export const sendEmail = async ({ email: to, subject, html }) => {
  try {
    const mailOptions = {
      from: `"RouteMate RideMatch" <${process.env.EMAIL}>`,
      to,
      subject,
      html,
    };
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error(`❌ [Nodemailer] CRITICAL ERROR sending to ${to}:`, error.message);
    throw error;
  }
};
