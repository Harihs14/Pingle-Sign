import { getTransporter, getEmailConfig } from "../config/email.js";

const LOGO_URL = "https://i.ibb.co/B5JYw8Yk/pingle-logo.png";
const COMPANY_NAME = "Pingle";

export class EmailService {
  constructor() {
    this.transporter = getTransporter();
    this.config = getEmailConfig();
  }

  /**
   * Send document signing request email
   */
  async sendSigningRequest({
    to,
    signerName,
    templateName,
    signingUrl,
    expiresIn = "30 days",
  }) {
    if (!this.transporter) {
      console.warn("Email transporter not available. Skipping email send.");
      return false;
    }

    try {
      const mailOptions = {
        from: `"${COMPANY_NAME} Signatures" <${this.config.auth.user}>`,
        to,
        subject: `Action Required: Sign ${templateName || "Document"}`,
        html: this.getSigningEmailTemplate({
          signerName,
          templateName,
          signingUrl,
          expiresIn,
        }),
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Signing email sent to ${to}`);
      return true;
    } catch (error) {
      console.error("❌ Error sending email:", error);
      return false;
    }
  }

  /**
   * Send acknowledgement email to user with signed PDF
   */
  async sendSigningAcknowledgement({ to, signerName, templateName, pdfPath }) {
    if (!this.transporter) {
      console.warn("Email transporter not available. Skipping email send.");
      return false;
    }

    try {
      const mailOptions = {
        from: `"${COMPANY_NAME} Signatures" <${this.config.auth.user}>`,
        to,
        subject: `✓ Signed: ${templateName || "Document"}`,
        html: this.getAcknowledgementEmailTemplate({
          signerName,
          templateName,
        }),
        attachments: [
          {
            filename: `signed-${templateName || "document"}.pdf`,
            path: pdfPath,
            contentType: "application/pdf",
          },
        ],
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Acknowledgement email sent to ${to}`);
      return true;
    } catch (error) {
      console.error("❌ Error sending acknowledgement email:", error);
      return false;
    }
  }

  /**
   * Send notification email to admin
   */
  async sendAdminNotification({
    adminEmail,
    signerName,
    signerEmail,
    templateName,
    documentId,
  }) {
    if (!this.transporter) {
      console.warn("Email transporter not available. Skipping email send.");
      return false;
    }

    if (!adminEmail) {
      console.warn(
        "⚠️  Admin email not configured. Skipping admin notification."
      );
      return false;
    }

    try {
      const mailOptions = {
        from: `"${COMPANY_NAME} Signatures" <${this.config.auth.user}>`,
        to: adminEmail,
        subject: `✓ Document Signed: ${templateName || "Untitled Document"}`,
        html: this.getAdminNotificationTemplate({
          signerName,
          signerEmail,
          templateName,
          documentId,
        }),
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Admin notification email sent to ${adminEmail}`);
      return true;
    } catch (error) {
      console.error("❌ Error sending admin notification:", error);
      return false;
    }
  }

  /**
   * Get email template for signing request
   */
  getSigningEmailTemplate({ signerName, templateName, signingUrl, expiresIn }) {
    const bodySections = `
      <div style="margin:0 0 40px 0;">
        <p style="margin:0 0 12px 0;color:#0f172a;font-size:28px;font-weight:600;line-height:1.2;letter-spacing:-0.02em;">
          ${templateName || "Document"}
        </p>
        <p style="margin:0;color:#64748b;font-size:15px;line-height:1.5;">
          Action required: Your signature is needed
        </p>
      </div>

      <div style="margin:0 0 40px 0;">
        <p style="margin:0 0 20px 0;color:#0f172a;font-size:16px;line-height:1.7;">
          Hello ${signerName || "there"},
        </p>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.7;">
          You've been requested to review and sign <strong style="color:#0f172a;font-weight:600;">${
            templateName || "a document"
          }</strong>. Please use the secure link below to complete the signing process.
        </p>
      </div>

      <div style="background:#f8fafc;border-left:3px solid #3b82f6;padding:16px 20px;margin:0 0 40px 0;border-radius:0 4px 4px 0;">
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">
          <span style="color:#64748b;font-weight:500;">This link expires in:</span> 
          <span style="color:#0f172a;font-weight:600;">${expiresIn}</span>
        </p>
      </div>
    `;

    return this.buildEmailLayout({
      title: "Signature Request",
      bodyContent: bodySections,
      ctaLabel: "Review & Sign Document",
      ctaUrl: signingUrl,
      signingUrl: signingUrl,
      footerNote:
        "This is an automated message from Pingle Sign. If you have questions, please reply to this email.",
    });
  }

  /**
   * Get email template for signing acknowledgement
   */
  getAcknowledgementEmailTemplate({ signerName, templateName }) {
    const bodySections = `
      <div style="text-align:center;margin:0 0 40px 0;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:#f0fdf4;margin:0 auto 24px auto;border:2px solid #dcfce7;">
          <span style="color:#16a34a;font-size:32px;font-weight:600;">✓</span>
        </div>
        <p style="margin:0 0 8px 0;color:#0f172a;font-size:24px;font-weight:600;line-height:1.2;">
          Document Signed
        </p>
        <p style="margin:0;color:#64748b;font-size:15px;line-height:1.5;">
          ${templateName || "Your document"}
        </p>
      </div>

      <div style="margin:0 0 32px 0;">
        <p style="margin:0 0 20px 0;color:#0f172a;font-size:16px;line-height:1.7;">
          Hello ${signerName || "there"},
        </p>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.7;">
          Your signature for <strong style="color:#0f172a;font-weight:600;">${
            templateName || "this document"
          }</strong> has been successfully recorded and legally executed. A signed copy is attached to this email for your records.
        </p>
        <p style="margin:0;color:#475569;font-size:16px;line-height:1.7;">
          Thank you for completing the signing process. We recommend saving the attached PDF to your permanent records.
        </p>
      </div>
    `;

    return this.buildEmailLayout({
      title: "Document Signed",
      bodyContent: bodySections,
      footerNote:
        "Attached: Executed copy of your signed document. This is your permanent record.",
    });
  }

  /**
   * Get email template for admin notification
   */
  getAdminNotificationTemplate({
    signerName,
    signerEmail,
    templateName,
    documentId,
  }) {
    const signedDate = new Date().toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const infoRows = [
      ["Document", templateName || "N/A"],
      ["Signer", signerName || "N/A"],
      ["Email", signerEmail || "N/A"],
      ["Document ID", documentId || "N/A"],
      ["Signed At", signedDate],
    ]
      .map(
        ([label, value]) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;text-align:left;width:140px;">
            ${label}
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:14px;font-weight:500;text-align:left;">
            ${value}
          </td>
        </tr>`
      )
      .join("");

    const bodySections = `
      <div style="margin:0 0 40px 0;">
        <p style="margin:0 0 8px 0;color:#0f172a;font-size:24px;font-weight:600;line-height:1.2;letter-spacing:-0.02em;">
          Document Signed
        </p>
        <p style="margin:0;color:#64748b;font-size:15px;line-height:1.5;">
          A new signature has been completed
        </p>
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:24px;margin:0 0 32px 0;">
        <p style="margin:0 0 20px 0;color:#0f172a;font-size:15px;font-weight:600;letter-spacing:0.01em;">
          Signing Details
        </p>
        <table style="width:100%;border-collapse:collapse;">
          ${infoRows}
        </table>
      </div>

      <div style="background:#f0f9ff;border-left:3px solid #3b82f6;padding:16px 20px;margin:0;border-radius:0 4px 4px 0;">
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
          This document has been automatically archived in your signing system. No further action is required.
        </p>
      </div>
    `;

    return this.buildEmailLayout({
      title: "Signature Completed",
      bodyContent: bodySections,
      footerNote:
        "This is an automated administrative notification from Pingle Sign.",
    });
  }

  buildEmailLayout({
    title,
    bodyContent,
    ctaLabel,
    ctaUrl,
    signingUrl,
    footerNote,
  }) {
    const brandMarkup = `<span style="font-weight:600;font-size:16px;color:#0f172a;letter-spacing:-0.01em;">Pingle Sign</span>`;

    const ctaMarkup =
      ctaLabel && ctaUrl
        ? `<div style="text-align:center;margin:48px 0 40px 0;">
            <a href="${ctaUrl}" style="background:#0f172a;color:#ffffff;padding:14px 36px;border-radius:6px;text-decoration:none;font-weight:500;font-size:15px;display:inline-block;letter-spacing:0.01em;">
              ${ctaLabel}
            </a>
            <p style="color:#94a3b8;font-size:12px;margin:16px 0 0 0;line-height:1.5;">
              Secure signing link • Encrypted connection
            </p>
          </div>
          ${
            signingUrl
              ? `
          <div style="margin:32px 0 40px 0;padding-top:32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 12px 0;color:#64748b;font-size:13px;font-weight:500;">Having trouble with the button?</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px;border-radius:6px;word-break:break-all;font-family:'Monaco','Consolas','Courier New',monospace;font-size:12px;color:#475569;line-height:1.6;">
              ${signingUrl}
            </div>
          </div>`
              : ""
          }`
        : "";

    const footerMarkup = footerNote
      ? `<div style="border-top:1px solid #e2e8f0;padding-top:32px;margin-top:48px;">
          <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;text-align:center;max-width:540px;margin-left:auto;margin-right:auto;">
            ${footerNote}
          </p>
          <p style="color:#cbd5e1;font-size:11px;text-align:center;margin:16px 0 0 0;letter-spacing:0.01em;">
            &copy; ${new Date().getFullYear()} Pingle Sign. All rights reserved.
          </p>
        </div>`
      : "";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="X-UA-Compatible" content="IE=edge" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
          <table role="presentation" style="width:100%;border-collapse:collapse;border-spacing:0;background:#f8fafc;">
            <tr>
              <td style="padding:0;">
                <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background:#ffffff;">
                  <!-- Header -->
                  <tr>
                    <td style="padding:32px 40px 28px 40px;text-align:left;border-bottom:1px solid #e2e8f0;">
                      ${brandMarkup}
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding:48px 40px;">
                      ${bodyContent}
                      ${ctaMarkup}
                      ${footerMarkup}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Mobile Responsive -->
          <style>
            @media only screen and (max-width: 600px) {
              table[role="presentation"] {
                width: 100% !important;
              }
              td[style*="padding:48px 40px"] {
                padding: 32px 24px !important;
              }
              td[style*="padding:32px 40px"] {
                padding: 24px !important;
              }
              p[style*="font-size:28px"] {
                font-size: 24px !important;
              }
              p[style*="font-size:24px"] {
                font-size: 20px !important;
              }
            }
          </style>
        </body>
      </html>
    `;
  }
}

export default EmailService;
