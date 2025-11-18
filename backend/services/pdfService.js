import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * PDF Service
 * Handles PDF processing and signing operations
 */

export class PdfService {
  constructor(uploadDir) {
    this.uploadDir = uploadDir;
  }

  /**
   * Fill placeholders in PDF and add signatures
   */
  async fillDocument({
    templatePath,
    placeholders,
    document,
    signatureData,
    signatureType,
    fieldValues,
  }) {
    try {
      // Read PDF file
      const pdfBuffer = await fs.readFile(templatePath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();

      // Parse template data
      let templateData = {};
      try {
        templateData =
          typeof document.data === "string"
            ? JSON.parse(document.data)
            : document.data || {};
      } catch (e) {
        console.warn("Error parsing template data:", e);
      }

      // Fill placeholders
      for (const placeholder of placeholders) {
        const page = pages[placeholder.page - 1];
        if (!page) continue;

        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();

        const x = placeholder.x * pageWidth;
        const y = pageHeight - placeholder.y * pageHeight;
        const width = placeholder.width * pageWidth;
        const height = placeholder.height * pageHeight;

        await this.fillPlaceholder({
          page,
          placeholder,
          x,
          y,
          width,
          height,
          document,
          templateData,
          signatureData,
          signatureType,
          fieldValues,
          pdfDoc,
        });
      }

      const pdfBytes = await pdfDoc.save();
      console.log(
        `✅ PDF document saved to bytes. Length: ${pdfBytes?.length || 0}`
      );

      if (!pdfBytes || pdfBytes.length === 0) {
        throw new Error("Generated PDF bytes are empty");
      }

      return pdfBytes;
    } catch (error) {
      console.error("❌ Error filling PDF document:", error);
      throw new Error(`Failed to process PDF document: ${error.message}`);
    }
  }

  /**
   * Fill a single placeholder
   */
  async fillPlaceholder({
    page,
    placeholder,
    x,
    y,
    width,
    height,
    document,
    templateData,
    signatureData,
    signatureType,
    fieldValues,
    pdfDoc,
  }) {
    let value = "";
    let shouldFill = false;

    switch (placeholder.type) {
      case "fullname":
        value = document.signer_name || templateData.name || "";
        shouldFill = true;
        break;

      case "email":
        value = document.signer_email || templateData.email || "";
        shouldFill = true;
        break;

      case "signdate":
        value = new Date().toLocaleDateString();
        shouldFill = true;
        break;

      case "company":
        const companyKey =
          placeholder.apiKey ||
          placeholder.label?.toLowerCase().replace(/\s+/g, "_");
        value =
          fieldValues?.[companyKey] ||
          fieldValues?.[placeholder.id] ||
          templateData[companyKey] ||
          templateData.company ||
          "";
        shouldFill = value !== "";
        break;

      case "jobtitle":
        const jobTitleKey =
          placeholder.apiKey ||
          placeholder.label?.toLowerCase().replace(/\s+/g, "_");
        value =
          fieldValues?.[jobTitleKey] ||
          fieldValues?.[placeholder.id] ||
          templateData[jobTitleKey] ||
          templateData.jobTitle ||
          "";
        shouldFill = value !== "";
        break;

      case "text":
        const fieldKey =
          placeholder.apiKey ||
          placeholder.label?.toLowerCase().replace(/\s+/g, "_");
        value =
          fieldValues?.[fieldKey] ||
          fieldValues?.[placeholder.id] ||
          templateData[fieldKey] ||
          "";
        shouldFill = value !== "";
        break;

      case "checkbox":
        const checkboxKey =
          placeholder.apiKey ||
          placeholder.label?.toLowerCase().replace(/\s+/g, "_");
        const isChecked =
          fieldValues?.[checkboxKey] || fieldValues?.[placeholder.id];
        if (isChecked) {
          // Use textStyle for checkbox if available
          const textStyle = placeholder.textStyle || {};
          // Use fontSize from textStyle directly, scaled up for checkbox visibility
          // Don't scale based on page dimensions for uniformity
          let fontSize = (textStyle.fontSize || 14) * 1.6;
          fontSize = Math.min(fontSize, 72); // Cap at 72pt
          fontSize = Math.max(fontSize, 8); // Minimum 8pt

          // Parse color from textStyle
          let checkColor = rgb(0, 0, 0);
          if (textStyle.color) {
            try {
              const hex = textStyle.color.replace("#", "");
              const r = parseInt(hex.substring(0, 2), 16) / 255;
              const g = parseInt(hex.substring(2, 4), 16) / 255;
              const b = parseInt(hex.substring(4, 6), 16) / 255;
              checkColor = rgb(r, g, b);
            } catch (e) {
              console.warn(
                "Invalid color format for checkbox, using black:",
                textStyle.color
              );
            }
          }

          // Draw checkbox border (rectangle)
          // In PDF coordinates, y is from bottom
          // x and y from fillDocument: x is left edge, y is top Y from bottom
          // For drawRectangle, we need bottom-left corner: y - height
          const rectX = x;
          const rectY = y - height; // Bottom edge in PDF coordinates

          // Calculate border thickness based on checkbox size
          const borderThickness = Math.max(1, Math.min(width, height) * 0.03);

          // Draw checkbox border rectangle
          page.drawRectangle({
            x: rectX,
            y: rectY,
            width: width,
            height: height,
            borderColor: checkColor,
            borderWidth: borderThickness,
          });

          // Draw checkmark as lines to avoid WinAnsi encoding issues
          // Calculate checkmark size based on checkbox dimensions
          const checkSize = Math.min(width, height) * 0.6; // 60% of checkbox size
          const centerX = x + width / 2;
          const centerY = y - height / 2;

          // Draw checkmark using two lines forming a "✓" shape
          // Line 1: bottom-left to center
          const line1StartX = centerX - checkSize * 0.3;
          const line1StartY = centerY + checkSize * 0.2;
          const line1EndX = centerX - checkSize * 0.05;
          const line1EndY = centerY - checkSize * 0.15;

          // Line 2: center to top-right
          const line2StartX = centerX - checkSize * 0.05;
          const line2StartY = centerY - checkSize * 0.15;
          const line2EndX = centerX + checkSize * 0.35;
          const line2EndY = centerY + checkSize * 0.25;

          // Calculate line thickness based on checkbox size
          const lineThickness = Math.max(2, Math.min(width, height) * 0.08);

          page.drawLine({
            start: { x: line1StartX, y: line1StartY },
            end: { x: line1EndX, y: line1EndY },
            thickness: lineThickness,
            color: checkColor,
          });

          page.drawLine({
            start: { x: line2StartX, y: line2StartY },
            end: { x: line2EndX, y: line2EndY },
            thickness: lineThickness,
            color: checkColor,
          });
        }
        return;

      case "signature":
      case "initial":
        if (signatureType === "text") {
          value = signatureData || document.signer_name || "";
          shouldFill = true;
        } else if (signatureType === "image" && signatureData) {
          try {
            const imageBytes = Buffer.from(
              signatureData.split(",")[1],
              "base64"
            );
            const image = await pdfDoc.embedPng(imageBytes);

            // Get image dimensions (in PDF points) and maintain aspect ratio
            const imageDims = image.scale(1);
            const imageWidth = imageDims.width;
            const imageHeight = imageDims.height;
            const imageAspectRatio = imageWidth / imageHeight;

            // Get page dimensions (they're not in scope here, need to get them from page object)
            const pageWidth = page.getWidth();
            const pageHeight = page.getHeight();

            // Calculate placeholder bounds in PDF points
            const placeholderWidth = placeholder.width * pageWidth;
            const placeholderHeight = placeholder.height * pageHeight;

            let sigWidth, sigHeight;

            // Scale image to fill the placeholder better - use at least 80% of placeholder size
            // This ensures signatures appear properly sized
            const minWidth = placeholderWidth * 0.8; // Use 80% minimum
            const minHeight = placeholderHeight * 0.8; // Use 80% minimum

            // Calculate scale factors
            const scaleToFitWidth = placeholderWidth / imageWidth;
            const scaleToFitHeight = placeholderHeight / imageHeight;
            const scaleToMinWidth = minWidth / imageWidth;
            const scaleToMinHeight = minHeight / imageHeight;

            // Use the larger of the scale factors to ensure image fills placeholder properly
            // But don't exceed the placeholder bounds
            let scale = Math.max(scaleToMinWidth, scaleToMinHeight);
            scale = Math.min(
              scale,
              Math.min(scaleToFitWidth, scaleToFitHeight)
            );

            sigWidth = imageWidth * scale;
            sigHeight = imageHeight * scale;

            // Ensure signature doesn't exceed placeholder bounds
            if (sigWidth > placeholderWidth) {
              sigWidth = placeholderWidth;
              sigHeight = sigWidth / imageAspectRatio;
            }
            if (sigHeight > placeholderHeight) {
              sigHeight = placeholderHeight;
              sigWidth = sigHeight * imageAspectRatio;
            }

            // Calculate position on actual page (scaled from normalized coordinates)
            // Frontend uses: left: placeholder.x * 100%, top: placeholder.y * 100%
            // So signature top-left corner is at (placeholder.x, placeholder.y)
            const sigX = placeholder.x * pageWidth;
            // PDF Y coordinate is from bottom, so convert: pageHeight - (placeholder.y * pageHeight + sigHeight)
            const sigY = pageHeight - (placeholder.y * pageHeight + sigHeight);

            page.drawImage(image, {
              x: sigX,
              y: sigY,
              width: sigWidth,
              height: sigHeight,
            });
          } catch (e) {
            console.error("Error embedding signature image:", e);
            value = document.signer_name || "";
            shouldFill = true;
          }
          return;
        }
        break;
    }

    // Fill text fields
    if (shouldFill && value) {
      // Use placeholder's textStyle for all styling properties
      const textStyle = placeholder.textStyle || {};

      // Font size - use the fontSize from textStyle directly for uniformity
      // Don't scale based on page dimensions to maintain consistency across different PDF sizes
      let fontSize = textStyle.fontSize || 14;

      // Only apply reasonable bounds (min/max) without scaling by page dimensions
      // This ensures uniform font sizes across all PDFs regardless of page size
      fontSize = Math.min(fontSize, 72); // Cap at 72pt
      fontSize = Math.max(fontSize, 8); // Minimum 8pt

      // Parse color from hex or use default
      let textColor = rgb(0, 0, 0);
      if (textStyle.color) {
        try {
          const hex = textStyle.color.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;
          textColor = rgb(r, g, b);
        } catch (e) {
          console.warn("Invalid color format, using black:", textStyle.color);
        }
      }

      // Map font family and weight to pdf-lib StandardFonts
      // pdf-lib supports: Helvetica, HelveticaBold, TimesRoman, TimesRomanBold, Courier, CourierBold
      const fontWeight = textStyle.fontWeight || "400";
      const fontFamily = (
        textStyle.fontFamily || "Inter, sans-serif"
      ).toLowerCase();

      // Determine if bold based on fontWeight
      const isBold =
        fontWeight === "600" ||
        fontWeight === "700" ||
        fontWeight === "bold" ||
        parseInt(fontWeight) >= 600;

      // Map font family to pdf-lib font
      let font;
      if (fontFamily.includes("times") || fontFamily.includes("serif")) {
        font = isBold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
      } else if (
        fontFamily.includes("courier") ||
        fontFamily.includes("mono")
      ) {
        font = isBold ? StandardFonts.CourierBold : StandardFonts.Courier;
      } else {
        // Default to Helvetica (sans-serif)
        font = isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
      }

      // Embed the font in the document (pdf-lib caches fonts efficiently)
      const embeddedFont = await pdfDoc.embedFont(font);

      // Position text to match frontend rendering
      // Frontend uses: left: placeholder.x * 100%, top: (placeholder.y + height/2) * 100% with translateY(-50%)
      // So text center is at placeholder.y + height/2 from top
      // In PDF: Y is from bottom, and drawText uses baseline
      const pageHeight = page.getHeight();
      const textX = x; // No padding to match frontend exactly
      const centerY =
        pageHeight - (placeholder.y + placeholder.height / 2) * pageHeight;
      const textY = centerY - fontSize * 0.35; // Adjust for baseline (roughly 35% of fontSize below center)

      page.drawText(value, {
        x: textX,
        y: textY,
        size: fontSize,
        color: textColor,
        font: embeddedFont,
      });
    }
  }

  /**
   * Save signed PDF
   */
  async saveSignedPdf(pdfBytes, documentId) {
    console.log(`📝 Attempting to save signed PDF for document ${documentId}`);
    console.log(`📁 Upload directory: ${this.uploadDir}`);
    console.log(`📊 PDF bytes length: ${pdfBytes?.length || 0}`);

    // Ensure uploads directory exists
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      console.log(`✅ Uploads directory exists or created: ${this.uploadDir}`);
    } catch (error) {
      console.error("❌ Error creating uploads directory:", error);
      throw new Error(`Failed to create uploads directory: ${error.message}`);
    }

    const signedFileName = `signed-${Date.now()}-${documentId}.pdf`;
    const signedPdfPath = path.join(this.uploadDir, signedFileName);
    console.log(`💾 Saving to: ${signedPdfPath}`);

    try {
      // Ensure pdfBytes is a Buffer or Uint8Array
      const buffer = Buffer.isBuffer(pdfBytes)
        ? pdfBytes
        : Buffer.from(pdfBytes);

      await fs.writeFile(signedPdfPath, buffer);
      console.log(`✅ File written successfully`);

      // Verify file was created
      try {
        const stats = await fs.stat(signedPdfPath);
        console.log(`✅ File verified - Size: ${stats.size} bytes`);
        console.log(`✅ Signed PDF saved successfully: ${signedPdfPath}`);
      } catch (accessError) {
        console.error(`❌ File was not created: ${signedPdfPath}`, accessError);
        throw new Error("Failed to verify signed PDF file creation");
      }

      const relativePath = `uploads/signed/${signedFileName}`;
      console.log(`✅ Returning relative path: ${relativePath}`);
      return relativePath;
    } catch (error) {
      console.error(`❌ Error saving signed PDF to ${signedPdfPath}:`, error);
      console.error(`❌ Error stack:`, error.stack);
      throw new Error(`Failed to save signed PDF: ${error.message}`);
    }
  }
}

export default PdfService;
