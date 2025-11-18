import nodemailer from "nodemailer";

const emailConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "bytebuddies.assemble@gmail.com",
    pass: process.env.SMTP_PASS || "qmts avpx jtfa nowm",
  },
};

let transporter = null;

/**
 * Initialize email transporter
 */
export function initEmailTransporter() {
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.warn(
      "⚠️  Email configuration incomplete. Email sending will be disabled."
    );
    return null;
  }

  transporter = nodemailer.createTransport(emailConfig);

  // Verify email configuration
  transporter.verify((error, success) => {
    if (error) {
      console.warn("⚠️  Email configuration error:", error.message);
      console.warn("⚠️  Email sending will not work until configured properly");
    } else {
      console.log("✅ Email server is ready to send messages");
    }
  });

  return transporter;
}

/**
 * Get email transporter instance
 */
export function getTransporter() {
  if (!transporter) {
    return initEmailTransporter();
  }
  return transporter;
}

/**
 * Get email configuration
 */
export function getEmailConfig() {
  return emailConfig;
}

export default { initEmailTransporter, getTransporter, getEmailConfig };
