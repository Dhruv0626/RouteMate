import nodemailer from "nodemailer";

// Initialize transporter ONCE outside the request to prevent connection overhead
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use SSL/TLS
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Verify connection once on startup
transporter.verify((error, success) => {
    if (error) {
        console.error("📧 Mailer Connection Error:", error);
    } else {
        console.log("📧 Mailer is ready to send messages");
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
