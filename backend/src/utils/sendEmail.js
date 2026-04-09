import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendEmail = async ({ email: to, subject, html }) => {
  const mailOptions = {
    from: `"RouteMate RideMatch" <${process.env.EMAIL}>`,
    to,
    subject,
    html,
  };
  await transporter.sendMail(mailOptions);
};
