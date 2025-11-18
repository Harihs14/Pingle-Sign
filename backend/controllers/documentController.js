import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { Document } from "../models/Document.js";
import { Template } from "../models/Template.js";
import { NotFoundError, DatabaseError } from "../utils/errors.js";
import { generateToken } from "../utils/security.js";
import EmailService from "../services/emailService.js";
import PdfService from "../services/pdfService.js";
import WebhookService from "../services/webhookService.js";
import appConfig from "../config/app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Document Controller
 * Handles all document-related HTTP requests
 */

export class DocumentController {
  constructor(pool) {
    this.documentModel = new Document(pool);
    this.templateModel = new Template(pool);
    this.emailService = new EmailService();
    this.pdfService = new PdfService(appConfig.signedDir);
    this.webhookService = new WebhookService();
  }

  /**
   * Get all documents
   */
  getAllDocuments = async (req, res, next) => {
    try {
      const documents = await this.documentModel.findAll();
      res.json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(new DatabaseError("Failed to fetch documents"));
    }
  };

  /**
   * Get document by token
   */
  getDocumentByToken = async (req, res, next) => {
    try {
      const { token } = req.params;
      const document = await this.documentModel.findByToken(token);

      if (!document) {
        // Check if document exists but was deleted or token is invalid
        return next(new NotFoundError("Document"));
      }

      // Check if document is already completed
      if (document.status === "completed") {
        return res.status(410).json({
          success: false,
          error: "Document already signed",
          message: "This document has already been signed and completed.",
          status: "completed",
          documentId: document.id, // Include document ID for download
          templateName: document.template_name, // Include template name for download
        });
      }

      // Check if document is expired
      if (document.status === "expired") {
        return res.status(410).json({
          success: false,
          error: "Document expired",
          message: "This signing link has expired.",
          status: "expired",
          documentId: document.id, // Include document ID for download
        });
      }

      // Only allow pending documents to be signed
      if (document.status !== "pending") {
        return res.status(410).json({
          success: false,
          error: "Document not available",
          message: "This signing link is no longer active.",
          status: document.status,
          documentId: document.id, // Include document ID for download
        });
      }

      // Read PDF file - handle both old and new path formats
      // Normalize path: if it's "uploads/template-..." convert to "uploads/templates/template-..."
      let normalizedPath = document.pdf_path;
      if (
        normalizedPath.startsWith("uploads/template-") &&
        !normalizedPath.startsWith("uploads/templates/")
      ) {
        normalizedPath = normalizedPath.replace(
          "uploads/",
          "uploads/templates/"
        );
      } else if (
        normalizedPath.startsWith("uploads/") &&
        !normalizedPath.includes("/templates/") &&
        !normalizedPath.includes("/signed/")
      ) {
        // If it's just "uploads/filename" and doesn't have a subdirectory, assume it's a template
        const filename = normalizedPath.replace("uploads/", "");
        if (filename.startsWith("template-")) {
          normalizedPath = `uploads/templates/${filename}`;
        }
      }

      // __dirname is backend/controllers, so ../ goes to backend/
      // normalizedPath is like "uploads/templates/template-xxx.pdf"
      const pdfPath = path.join(__dirname, "..", normalizedPath);
      console.log(`📄 __dirname: ${__dirname}`);
      console.log(`📄 Attempting to read PDF from: ${pdfPath}`);
      console.log(`📄 Original path from DB: ${document.pdf_path}`);
      console.log(`📄 Normalized path: ${normalizedPath}`);

      let pdfBuffer;
      try {
        pdfBuffer = await fs.readFile(pdfPath);
        console.log(`✅ PDF file read successfully: ${pdfPath}`);
      } catch (error) {
        console.error(`❌ Error reading PDF file from ${pdfPath}:`, error);
        console.error(`❌ Error details:`, error.message);
        return next(
          new NotFoundError(`PDF file not found at ${normalizedPath}`)
        );
      }

      // Parse JSON fields
      let data = {};
      let placeholders = [];
      try {
        data =
          typeof document.data === "string"
            ? JSON.parse(document.data)
            : document.data || {};
        placeholders =
          typeof document.placeholders === "string"
            ? JSON.parse(document.placeholders)
            : document.placeholders || [];
      } catch (e) {
        console.warn("Error parsing JSON fields:", e);
      }

      res.json({
        success: true,
        data: {
          ...document,
          pdfData: pdfBuffer.toString("base64"),
          data,
          placeholders,
        },
      });
    } catch (error) {
      next(new DatabaseError("Failed to fetch document"));
    }
  };

  /**
   * Create document signing request
   */
  createDocument = async (req, res, next) => {
    try {
      const { templateId, signerEmail, signerName, data } = req.body;

      // Verify template exists
      const template = await this.templateModel.findById(templateId);
      if (!template) {
        return next(new NotFoundError("Template"));
      }

      // Generate unique token
      const token = generateToken(32);

      // Create document record
      const documentId = await this.documentModel.create({
        templateId,
        signerEmail,
        signerName,
        data,
        token,
      });

      const signingUrl = `${appConfig.baseUrl}/sign/${token}`;

      // Send email (non-blocking)
      this.emailService
        .sendSigningRequest({
          to: signerEmail,
          signerName,
          templateName: template.name,
          signingUrl,
        })
        .catch((error) => {
          console.error("Failed to send email:", error);
          // Don't fail the request if email fails
        });

      res.status(201).json({
        success: true,
        data: {
          id: documentId,
          token,
          signingUrl,
        },
        message: "Document signing request created successfully",
      });
    } catch (error) {
      next(new DatabaseError("Failed to create document"));
    }
  };

  /**
   * Submit signed document
   */
  signDocument = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { signatureData, signatureType, fieldValues } = req.body;

      // Get document (only pending documents can be signed)
      const document = await this.documentModel.findById(id, "pending");
      if (!document) {
        return next(new NotFoundError("Document"));
      }

      // Parse placeholders
      let placeholders = [];
      let templateData = {};
      try {
        placeholders =
          typeof document.placeholders === "string"
            ? JSON.parse(document.placeholders)
            : document.placeholders || [];
        templateData =
          typeof document.data === "string"
            ? JSON.parse(document.data)
            : document.data || {};
      } catch (e) {
        console.warn("Error parsing JSON:", e);
      }

      // Get template PDF path
      const template = await this.templateModel.findById(document.template_id);
      if (!template) {
        return next(new NotFoundError("Template"));
      }

      // Normalize template path - handle both old and new formats
      let normalizedTemplatePath = document.pdf_path;
      if (
        normalizedTemplatePath.startsWith("uploads/template-") &&
        !normalizedTemplatePath.startsWith("uploads/templates/")
      ) {
        normalizedTemplatePath = normalizedTemplatePath.replace(
          "uploads/",
          "uploads/templates/"
        );
      } else if (
        normalizedTemplatePath.startsWith("uploads/") &&
        !normalizedTemplatePath.includes("/templates/") &&
        !normalizedTemplatePath.includes("/signed/")
      ) {
        const filename = normalizedTemplatePath.replace("uploads/", "");
        if (filename.startsWith("template-")) {
          normalizedTemplatePath = `uploads/templates/${filename}`;
        }
      }

      // __dirname is backend/controllers, so ../ goes to backend/
      const templatePath = path.join(__dirname, "..", normalizedTemplatePath);
      console.log(`📄 __dirname: ${__dirname}`);
      console.log(
        `📄 Using template path for signing: ${templatePath} (original: ${document.pdf_path})`
      );

      // Fill PDF with signatures and data
      console.log(`📄 Starting to fill PDF for document ${id}`);
      let pdfBytes;
      try {
        pdfBytes = await this.pdfService.fillDocument({
          templatePath,
          placeholders,
          document,
          signatureData,
          signatureType,
          fieldValues,
        });
        console.log(
          `✅ PDF filled successfully. Bytes length: ${pdfBytes?.length || 0}`
        );
      } catch (error) {
        console.error("❌ Error filling PDF:", error);
        return next(new DatabaseError(`Failed to fill PDF: ${error.message}`));
      }

      // Save signed PDF
      let signedPdfPath;
      try {
        console.log(`💾 Attempting to save signed PDF for document ${id}`);
        signedPdfPath = await this.pdfService.saveSignedPdf(
          pdfBytes,
          document.id
        );
        console.log(`✅ Signed PDF saved to: ${signedPdfPath}`);
      } catch (error) {
        console.error("❌ Failed to save signed PDF:", error);
        console.error("❌ Error details:", error.stack);
        // Don't update document status if file save failed
        return next(
          new DatabaseError(`Failed to save signed PDF: ${error.message}`)
        );
      }

      // Update document status only if file was saved successfully
      await this.documentModel.markAsCompleted(id, signedPdfPath);

      // Prepare webhook payload with only required fields
      // Extract custom fields from fieldValues
      const fieldValuesData = fieldValues || {};
      const webhookPayload = {
        id: document.id,
        templateId: document.template_id,
        templateName: template.name,
        signerName: document.signer_name,
        signerEmail: document.signer_email,
        signedPdfPath: signedPdfPath,
        createdAt: document.created_at
          ? new Date(document.created_at).toISOString()
          : new Date().toISOString(),
        completedAt: new Date().toISOString(),
        address: fieldValuesData.address || "",
        legalname: fieldValuesData.legalname || "",
        phone: fieldValuesData.phone || "",
        mail: fieldValuesData.mail || fieldValuesData.email || "",
        status: "completed",
      };

      // Send webhook (non-blocking)
      const webhookUrl = process.env.WEBHOOK_URL;
      if (webhookUrl) {
        this.webhookService
          .sendWebhook(webhookUrl, webhookPayload)
          .catch((error) => {
            console.error("❌ Webhook send failed (non-blocking):", error);
          });
      } else {
        console.warn("⚠️  WEBHOOK_URL not configured. Skipping webhook.");
      }

      // Send acknowledgement email to user with signed PDF (non-blocking)
      const signedPdfFullPath = path.join(__dirname, "..", signedPdfPath);
      if (document.signer_email) {
        this.emailService
          .sendSigningAcknowledgement({
            to: document.signer_email,
            signerName: document.signer_name,
            templateName: template.name,
            pdfPath: signedPdfFullPath,
          })
          .catch((error) => {
            console.error(
              "❌ Acknowledgement email send failed (non-blocking):",
              error
            );
          });
      }

      // Send notification email to admin (non-blocking)
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        this.emailService
          .sendAdminNotification({
            adminEmail: adminEmail,
            signerName: document.signer_name,
            signerEmail: document.signer_email,
            templateName: template.name,
            documentId: document.id,
          })
          .catch((error) => {
            console.error(
              "❌ Admin notification email send failed (non-blocking):",
              error
            );
          });
      } else {
        console.warn(
          "⚠️  ADMIN_EMAIL not configured. Skipping admin notification."
        );
      }

      res.json({
        success: true,
        data: {
          signedPdfPath,
          requestId: id,
          status: "completed",
        },
        message: "Document signed successfully",
      });
    } catch (error) {
      console.error("Error signing document:", error);
      next(new DatabaseError("Failed to sign document"));
    }
  };

  /**
   * Download signed PDF
   */
  downloadSignedPdf = async (req, res, next) => {
    try {
      const { id } = req.params;
      console.log(`📥 Download request for document ID: ${id}`);

      // Get document (without status filter to allow completed documents)
      const document = await this.documentModel.findById(id);
      if (!document) {
        console.log(`❌ Document not found: ${id}`);
        return next(new NotFoundError("Document"));
      }

      console.log(
        `📄 Document found - Status: ${document.status}, Signed PDF Path: ${document.signed_pdf_path}`
      );

      // Check if document is signed
      if (document.status !== "completed" || !document.signed_pdf_path) {
        console.log(`❌ Document not completed or missing signed PDF path`);
        return res.status(404).json({
          success: false,
          error: "Signed PDF not found",
          message: "This document has not been signed yet.",
        });
      }

      // Build full path to signed PDF
      const signedPdfFullPath = path.join(
        __dirname,
        "..",
        document.signed_pdf_path
      );

      console.log(`📁 Looking for signed PDF at: ${signedPdfFullPath}`);

      // Check if file exists
      try {
        await fs.access(signedPdfFullPath);
        console.log(`✅ Signed PDF file found: ${signedPdfFullPath}`);
      } catch (error) {
        console.error(
          `❌ Signed PDF file not found: ${signedPdfFullPath}`,
          error
        );
        return next(new NotFoundError("Signed PDF file not found"));
      }

      // Get filename from path
      const filename = path.basename(document.signed_pdf_path);
      const templateName = document.template_name || "document";
      const safeFilename = `${templateName}-signed.pdf`.replace(
        /[^a-z0-9.-]/gi,
        "_"
      );

      // Set headers and send file
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeFilename}"`
      );

      const fileBuffer = await fs.readFile(signedPdfFullPath);
      res.send(fileBuffer);
    } catch (error) {
      console.error("Error downloading signed PDF:", error);
      next(new DatabaseError("Failed to download signed PDF"));
    }
  };
}

export default DocumentController;
