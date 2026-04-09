import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

// Initialize Resend with the new API key
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email using Resend (Highly reliable for Live Sites)
 */
export const sendEmail = async (options) => {
    try {
        const { data, error } = await resend.emails.send({
            from: "RouteMate RideMatch <onboarding@resend.dev>", // DO NOT CHANGE THIS TO GMAIL OR A DUMMY EMAIL
            to: options.email,
            subject: options.subject,
            html: options.html,
        });

        if (error) {
            console.error("📧 [Resend] Error:", error);
            throw error;
        }

        return data;
    } catch (err) {
        console.error("📧 sendEmail Error:", err);
        throw err;
    }
};
