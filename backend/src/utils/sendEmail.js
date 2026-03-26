import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables immediately to avoid "Missing Credentials" errors
dotenv.config();

// Initialize transporter ONCE outside the request to prevent connection overhead
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 seconds timeout
});

// Verify connection once on startup
transporter.verify((error, success) => {
    if (error) {
        console.error("📧 [Mailer] Connection Error:", error.message);
        console.error("📧 [Mailer] Ensure EMAIL and EMAIL_PASSWORD are correct in .env");
    } else {
        console.log("📧 [Mailer] Ready to send messages via smtp.gmail.com:587");
    }
});

export const sendEmail = async (options) => {
    try {
        const mailOptions = {
            from: `"RouteMate" <${process.env.EMAIL}>`,
            to: options.email,
            subject: options.subject,
            html: options.html,
        };

        // Added timeout protection
        const info = await transporter.sendMail(mailOptions);
        console.log("📧 Email sent successfully:", info.messageId);
        return info;
    } catch (err) {
        console.error("📧 sendEmail Error:", err);
        throw err;
    }
};
