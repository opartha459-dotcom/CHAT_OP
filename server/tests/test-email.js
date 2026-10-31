const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const nodemailer = require("nodemailer");

async function main() {
    try {
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!user || !pass) {
            throw new Error("SMTP_USER or SMTP_PASS is missing from .env");
        }

        console.log("SMTP_USER loaded:", user);
        console.log("SMTP_PASS loaded:", pass ? "***" + pass.slice(-4) : "(empty)");

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: { user, pass },
            tls: { rejectUnauthorized: false },
        });

        console.log("Checking Gmail SMTP connection...");
        await transporter.verify();
        console.log("✅ SMTP authentication successful.");

        const info = await transporter.sendMail({
            from: `"PulseChat" <${user}>`,
            to: user,
            subject: "PulseChat SMTP Test",
            text: "Success! Your PulseChat email service can send email.",
        });

        console.log("✅ Email sent!");
        console.log("Message ID:", info.messageId);
        console.log("Accepted:", info.accepted);
        console.log("Rejected:", info.rejected);
    } catch (error) {
        console.error("❌ EMAIL TEST FAILED");
        console.error("Code:", error.code || "N/A");
        console.error("Response:", error.response || "N/A");
        console.error("Message:", error.message);
        process.exit(1);
    }
}

main();
