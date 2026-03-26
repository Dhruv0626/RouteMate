import nodemailer from "nodemailer";

export const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // Use SSL/TLS
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    // Verify connection on startup (this will log error if credentials fail)
    transporter.verify((error, success) => {
        if (error) {
            console.error("📧 Mailer Connection Error:", error);
        } else {
            console.log("📧 Mailer is ready to send messages");
        }
    });

    const mailOptions = {
        from: `"RouteMate" <${process.env.EMAIL}>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
    };

    await transporter.sendMail(mailOptions);
};
