const nodemailer = require("nodemailer");

/**
 * Send an email using SMTP transport or console fallback.
 *
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text fallback
 */
const sendEmail = async (options) => {
  const isSmtpConfigured =
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (isSmtpConfigured) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      family: 4, // Force IPv4 resolution to prevent IPv6 ENETUNREACH errors on cloud hosts like Render
    });

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || "Fashion House"}" <${process.env.SMTP_FROM_EMAIL || "noreply@fashionhouse.com"}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error("❌ nodemailer sendMail Error:", err);
      throw err;
    }
  } else {
    // ── FALLBACK FOR LOCAL DEV / NO SMTP CONFIG ──
    console.log("\n====================================================================");
    console.log("📧  [SMTP NOT CONFIGURED] - EMAIL OUTBOX LOG:");
    console.log(`To:      ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log("--------------------------------------------------------------------");
    console.log(`Text fallback:\n${options.text}`);
    console.log("====================================================================\n");
  }
};

module.exports = sendEmail;
