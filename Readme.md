# PDF Signing Application - Complete Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Complete Workflow](#complete-workflow)
6. [API Documentation](#api-documentation)
7. [Database Schema](#database-schema)
8. [Backend Services](#backend-services)
9. [Frontend Architecture](#frontend-architecture)
10. [Security Features](#security-features)
11. [Configuration](#configuration)
12. [File Storage](#file-storage)
13. [Error Handling](#error-handling)
14. [Deployment Guide](#deployment-guide)

---

## Project Overview

This is a comprehensive **PDF Document Signing Application** that allows users to:

- Create PDF templates with customizable placeholders
- Send documents for electronic signatures
- Collect signatures via multiple methods (text, image upload, or drawing)
- Track document signing status
- Download signed PDFs
- Receive email notifications
- Integrate with external systems via webhooks

### Key Features

- **Template Management**: Create, edit, and manage PDF templates with drag-and-drop placeholder placement
- **Multiple Signature Methods**: Text-based signatures, image uploads, and canvas drawing
- **Real-time PDF Preview**: Interactive PDF viewer with placeholder visualization
- **Email Notifications**: Automated emails for signing requests and completion acknowledgements
- **Webhook Integration**: Real-time notifications to external systems
- **Analytics Dashboard**: Track templates, documents, and signing statistics
- **Random ID Generation**: Unique 3-5 digit IDs for templates and documents
- **Download Functionality**: Download signed PDFs from completion and "already signed" pages

---

## Architecture

### System Architecture Pattern

The application follows a **3-tier architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  (React + Vite + TailwindCSS + shadcn/ui)               │
│  - User Interface                                        │
│  - PDF Rendering (react-pdf)                            │
│  - State Management (React Hooks)                        │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP/REST API
┌──────────────────▼──────────────────────────────────────┐
│                   Backend Layer                          │
│  (Node.js + Express)                                     │
│  - Controllers (Request Handling)                        │
│  - Services (Business Logic)                             │
│  - Models (Data Access)                                  │
│  - Middleware (Security, Validation, Error Handling)     │
└──────────────────┬──────────────────────────────────────┘
                   │ SQL Queries
┌──────────────────▼──────────────────────────────────────┐
│                  Data Layer                              │
│  (MySQL Database + File System)                         │
│  - Templates Table                                       │
│  - Documents Table                                       │
│  - PDF Files (uploads/templates/, uploads/signed/)      │
└──────────────────────────────────────────────────────────┘
```

### Request Flow

1. **Client Request** → Frontend makes API call via `api.js` service
2. **Route Handler** → Express routes in `routes/` directory
3. **Middleware** → Validation, security checks, rate limiting
4. **Controller** → Business logic orchestration in `controllers/`
5. **Service Layer** → Core operations (PDF processing, email, webhooks)
6. **Model Layer** → Database operations in `models/`
7. **Response** → JSON response back to frontend

---

## Technology Stack

### Backend Stack

#### Core Framework

- **Node.js**: JavaScript runtime environment
- **Express.js v4.18.2**: Web application framework
- **ES Modules**: Modern JavaScript module system (`"type": "module"`)

#### Database

- **MySQL2 v3.6.5**: MySQL database driver with promise support
- **Connection Pooling**: Manages database connections efficiently
- **Auto-initialization**: Creates database and tables on startup

#### PDF Processing

- **pdf-lib v1.17.1**: PDF creation and manipulation library
  - Used for embedding signatures, text, and checkboxes
  - Handles coordinate transformations
  - Font embedding and styling

#### File Upload

- **Multer v1.4.5-lts.1**: Multipart/form-data handling for file uploads
  - Configures storage for template PDFs
  - File size limits (10MB default)
  - MIME type validation (PDF only)

#### Email Service

- **Nodemailer v6.9.8**: Email sending functionality
  - SMTP configuration
  - HTML email templates
  - PDF attachments

#### Security

- **Helmet v8.1.0**: Security headers middleware
- **CORS v2.8.5**: Cross-Origin Resource Sharing
- **express-rate-limit v8.2.1**: Rate limiting middleware
- **dotenv v17.2.3**: Environment variable management

### Frontend Stack

#### Core Framework

- **React v19.1.1**: UI library
- **React Router DOM v7.9.5**: Client-side routing
- **Vite**: Build tool and dev server (using rolldown-vite v7.1.14)

#### PDF Rendering

- **react-pdf v10.2.0**: PDF viewer component
- **pdfjs-dist v5.4.296**: PDF.js library for rendering
- **pdf-lib v1.17.1**: Client-side PDF manipulation

#### UI Components

- **shadcn/ui**: Component library built on Radix UI
- **Radix UI**: Headless UI primitives
  - Dialog, Accordion, Tabs, Select, Checkbox, etc.
- **TailwindCSS v4.1.16**: Utility-first CSS framework
- **Lucide React v0.552.0**: Icon library

#### Utilities

- **class-variance-authority v0.7.1**: Component variant management
- **clsx v2.1.1**: Conditional className utility
- **tailwind-merge v3.3.1**: Merge Tailwind classes
- **html2canvas v1.4.1**: HTML to canvas conversion
- **react-easy-crop v5.5.3**: Image cropping (currently not used)

#### Development Tools

- **ESLint v9.36.0**: Code linting
- **TypeScript Types**: Type definitions for React

---

## Project Structure

### Backend Structure

```
backend/
├── config/                    # Configuration files
│   ├── app.js                # Application configuration (ports, paths, limits)
│   ├── database.js           # Database connection and initialization
│   └── email.js              # Email transporter configuration
│
├── controllers/              # Request handlers (MVC pattern)
│   ├── documentController.js # Document CRUD and signing operations
│   └── templateController.js # Template CRUD operations
│
├── middleware/               # Express middleware
│   ├── errorHandler.js      # Global error handling
│   ├── security.js          # Security headers, CORS, rate limiting
│   └── validation.js        # Request validation middleware
│
├── models/                   # Data access layer
│   ├── Document.js          # Document database operations
│   └── Template.js          # Template database operations
│
├── routes/                   # API route definitions
│   ├── index.js             # Route initialization
│   ├── documentRoutes.js    # Document endpoints
│   └── templateRoutes.js    # Template endpoints
│
├── services/                 # Business logic services
│   ├── emailService.js      # Email sending (signing requests, acknowledgements)
│   ├── pdfService.js        # PDF processing and signing
│   └── webhookService.js    # Webhook notifications
│
├── utils/                    # Utility functions
│   ├── errors.js            # Custom error classes
│   ├── security.js          # Token generation, unique ID generation
│   └── validation.js        # Data validation functions
│
├── uploads/                  # File storage
│   ├── templates/           # Template PDF files
│   └── signed/              # Signed PDF files
│
├── index.js                  # Application entry point
└── package.json             # Dependencies and scripts
```

### Frontend Structure

```
frontend/
├── public/                   # Static assets
│   ├── pdf.worker.min.mjs   # PDF.js worker file
│   └── favicon.png          # Site favicon
│
├── src/
│   ├── assets/              # Images and static files
│   │   ├── pingle-logo.png
│   │   └── favicon.png
│   │
│   ├── components/          # React components
│   │   ├── Layout.jsx       # Main layout wrapper
│   │   ├── PDFEditor.jsx    # PDF template editor
│   │   ├── PDFUpload.jsx    # PDF upload component
│   │   ├── TemplateList.jsx # Template listing and management
│   │   └── ui/              # shadcn/ui components (50+ components)
│   │
│   ├── config/              # Configuration
│   │   └── theme.js         # Theme configuration
│   │
│   ├── hooks/               # Custom React hooks
│   │   └── use-mobile.js    # Mobile detection hook
│   │
│   ├── lib/                 # Utility libraries
│   │   └── utils.js         # Helper functions (cn, etc.)
│   │
│   ├── pages/               # Page components
│   │   ├── AnalyticsPage.jsx    # Analytics dashboard
│   │   ├── DashboardPage.jsx    # Main dashboard
│   │   ├── EditorPage.jsx       # Template editor page
│   │   ├── SettingsPage.jsx     # Settings page
│   │   ├── SigningPage.jsx      # Document signing page
│   │   └── TemplatesPage.jsx     # Templates listing page
│   │
│   ├── services/            # API service layer
│   │   └── api.js           # Centralized API calls
│   │
│   ├── styles/              # Global styles
│   │   └── react-easy-crop.css
│   │
│   ├── utils/               # Utility functions
│   │   ├── constants.js     # Application constants
│   │   ├── security.js      # Client-side security utilities
│   │   └── useStrictModeEffect.js
│   │
│   ├── App.jsx              # Main app component with routing
│   ├── main.jsx             # React entry point
│   └── index.css            # Global CSS styles
│
├── components.json          # shadcn/ui configuration
├── vite.config.js          # Vite build configuration
└── package.json            # Dependencies and scripts
```

---

## Complete Workflow

### 1. Template Creation Workflow

#### Step 1: Upload PDF Template

```
User Action: Navigate to Templates page → Click "New Template"
↓
Frontend: PDFUpload component displays file input
↓
User: Selects PDF file and enters template name
↓
Frontend: Creates FormData with PDF and name
↓
API Call: POST /api/templates
↓
Backend Flow:
  1. Multer middleware saves PDF to uploads/templates/
  2. Generates random 3-5 digit unique ID
  3. TemplateController.createTemplate() processes request
  4. Template model creates database record
  5. Returns template ID and metadata
↓
Frontend: Redirects to EditorPage with template data
```

#### Step 2: Add Placeholders to Template

```
User Action: In PDFEditor, drag field types onto PDF
↓
Frontend:
  - Calculates normalized coordinates (0-1 range)
  - Creates placeholder object with:
    * type (signature, text, checkbox, etc.)
    * x, y, width, height (normalized 0-1)
    * page number
    * label, apiKey
    * textStyle (fontSize, color, fontWeight, fontFamily)
↓
User: Adjusts placeholder position/size, configures styles
↓
User: Clicks "Save Template"
↓
API Call: PUT /api/templates/:id/placeholders
↓
Backend:
  1. Validates template ID
  2. TemplateController.updatePlaceholders()
  3. Template model updates placeholders JSON field
  4. Returns success
↓
Frontend: Shows success message, template saved
```

### 2. Document Signing Request Workflow

#### Step 1: Create Signing Request

```
User Action: In TemplateList, clicks "Send" on a template
↓
Frontend: Opens dialog with form:
  - Signer Name
  - Signer Email
  - Custom field values (based on template placeholders)
↓
User: Fills form and clicks "Send"
↓
API Call: POST /api/documents
Body: {
  templateId: 12345,
  signerEmail: "user@example.com",
  signerName: "John Doe",
  data: { company: "Acme Corp", ... }
}
↓
Backend Flow:
  1. DocumentController.createDocument()
  2. Validates template exists
  3. Generates 64-character secure token
  4. Generates random 3-5 digit document ID
  5. Creates document record with status='pending'
  6. Generates signing URL: {baseUrl}/sign/{token}
  7. EmailService.sendSigningRequest() (non-blocking)
  8. Returns document ID, token, and signing URL
↓
Frontend: Shows success dialog with signing URL
```

#### Step 2: Email Notification

```
Backend: EmailService.sendSigningRequest()
↓
Email Template: HTML email with:
  - Company branding
  - Document name
  - Signing button/link
  - Expiration notice (30 days)
↓
SMTP: Sends email via Nodemailer
↓
Recipient: Receives email with signing link
```

### 3. Document Signing Workflow

#### Step 1: Access Signing Page

```
User: Clicks link in email → {baseUrl}/sign/{token}
↓
Frontend: SigningPage component loads
↓
API Call: GET /api/documents/token/:token
↓
Backend:
  1. DocumentController.getDocumentByToken()
  2. Checks document status:
     - If 'completed': Returns 410 with documentId
     - If 'expired': Returns 410
     - If 'pending': Returns document data
  3. Reads template PDF file
  4. Returns base64-encoded PDF + placeholders + document data
↓
Frontend:
  - Renders PDF using react-pdf
  - Overlays placeholders on PDF pages
  - Shows signature fields, text fields, checkboxes
```

#### Step 2: Fill Signatures and Fields

```
User: Clicks on signature placeholder
↓
Frontend: Opens signature dialog with 3 tabs:
  1. Text Tab:
     - Input field for name
     - Font style selector (Elegant, Modern, Classic)
     - Live preview
     - Generates signature image from text

  2. Draw Tab:
     - Canvas element (600x200px)
     - Mouse/touch drawing support
     - Clear button
     - Saves as base64 PNG image

  3. Upload Tab:
     - File input (accepts images)
     - Image preview
     - Auto-resize if too large (max 2000x1000px)
     - Converts to base64
↓
User: Selects signature method and completes signature
↓
Frontend:
  - Stores signature in signatureImages state
  - Updates signatureTypesByPlaceholder
  - Shows preview on PDF overlay
↓
User: Fills other fields (text, checkboxes)
↓
Frontend: Updates fieldValues state
```

#### Step 3: Submit Signature

```
User: Clicks "Sign & Submit" button
↓
Frontend: handleSubmit() function:
  1. Validates all signature fields are filled
  2. Validates all checkboxes are checked
  3. If missing fields:
     - Shows validation dialog popup
     - Lists missing signatures/checkboxes
     - Returns early
  4. Prepares signature data:
     - For text: Generates signature image
     - For image/draw: Uses base64 image
  5. Collects all field values
↓
API Call: POST /api/documents/:id/sign
Body: {
  signatureData: "data:image/png;base64,...",
  signatureType: "image",
  fieldValues: { company: "Acme", checkbox1: true, ... }
}
↓
Backend Flow:
  1. DocumentController.signDocument()
  2. Validates document exists and is pending
  3. PdfService.fillDocument():
     a. Loads template PDF
     b. For each placeholder:
        - Calculates PDF coordinates
        - Fills based on type:
          * Text fields: Draws text with styling
          * Signatures: Embeds image or draws text
          * Checkboxes: Draws rectangle + checkmark lines
          * Auto-fills: fullname, email, signdate
     c. Saves filled PDF to bytes
  4. PdfService.saveSignedPdf():
     - Saves PDF to uploads/signed/
     - Filename: signed-{timestamp}-{documentId}.pdf
  5. Document model: Updates status to 'completed'
  6. EmailService.sendSigningAcknowledgement() (non-blocking)
     - Attaches signed PDF
  7. EmailService.sendAdminNotification() (non-blocking)
  8. WebhookService.sendWebhook() (non-blocking)
  9. Returns success with signed PDF path
↓
Frontend:
  - Sets status to 'completed'
  - Shows success page with download button
```

### 4. Download Workflow

#### From Completion Page

```
User: Clicks "Download Signed PDF" button
↓
Frontend: handleDownload() function
↓
API Call: GET /api/documents/:id/download
↓
Backend:
  1. DocumentController.downloadSignedPdf()
  2. Finds document (any status, not just pending)
  3. Validates document is completed
  4. Reads signed PDF file from uploads/signed/
  5. Sets headers:
     - Content-Type: application/pdf
     - Content-Disposition: attachment; filename="..."
  6. Sends PDF buffer
↓
Frontend:
  - Receives blob response
  - Creates temporary download link
  - Triggers download
  - Cleans up URL object
```

#### From "Already Signed" Page

```
User: Visits signing link for already-signed document
↓
Backend: Returns 410 with documentId and templateName
↓
Frontend: Stores document ID in state
↓
User: Clicks "Download Signed PDF"
↓
Same download flow as above
```

---

## API Documentation

### Base URL

- Development: `http://localhost:3001`
- Production: Configured via `BASE_URL` environment variable

### Authentication

Currently, all endpoints are public. Future versions may implement authentication.

### Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Document Creation**: 50 requests per hour per IP

### Response Format

All API responses follow this structure:

```json
{
  "success": true|false,
  "data": {...},
  "error": "Error message",
  "message": "Success message"
}
```

### Templates API

#### GET /api/templates

Get all templates.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 12345,
      "name": "Contract Template",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### GET /api/templates/:id

Get template by ID with PDF data.

**Parameters:**

- `id` (path): Template ID (3-5 digits)

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 12345,
    "name": "Contract Template",
    "pdf_path": "uploads/templates/template-1234567890-12345.pdf",
    "placeholders": [
      {
        "id": "placeholder-1",
        "type": "signature",
        "x": 0.1,
        "y": 0.5,
        "width": 0.3,
        "height": 0.1,
        "page": 1,
        "label": "Signature",
        "apiKey": "signature"
      }
    ],
    "pdfData": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2c..."
  }
}
```

#### POST /api/templates

Create a new template.

**Content-Type:** `multipart/form-data`

**Body:**

- `name` (string, required): Template name
- `pdf` (file, required): PDF file (max 10MB)

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 12345,
    "name": "Contract Template"
  },
  "message": "Template created successfully"
}
```

#### PUT /api/templates/:id/placeholders

Update template placeholders.

**Body:**

```json
{
  "placeholders": [
    {
      "id": "placeholder-1",
      "type": "signature",
      "x": 0.1,
      "y": 0.5,
      "width": 0.3,
      "height": 0.1,
      "page": 1,
      "label": "Signature",
      "apiKey": "signature",
      "textStyle": {
        "fontSize": 14,
        "color": "#000000",
        "fontWeight": "500",
        "fontFamily": "Inter, sans-serif"
      }
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Placeholders updated successfully"
}
```

#### PUT /api/templates/:id/name

Update template name.

**Body:**

```json
{
  "name": "Updated Template Name"
}
```

#### DELETE /api/templates/:id

Delete a template.

**Response:**

```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

### Documents API

#### GET /api/documents

Get all documents.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 57042,
      "template_id": 12345,
      "signer_email": "user@example.com",
      "signer_name": "John Doe",
      "status": "completed",
      "created_at": "2024-01-15T10:30:00.000Z",
      "completed_at": "2024-01-15T11:00:00.000Z",
      "template_name": "Contract Template"
    }
  ]
}
```

#### GET /api/documents/token/:token

Get document by signing token.

**Parameters:**

- `token` (path): 64-character hexadecimal token

**Response (Pending Document):**

```json
{
  "success": true,
  "data": {
    "id": 57042,
    "template_id": 12345,
    "signer_email": "user@example.com",
    "signer_name": "John Doe",
    "status": "pending",
    "token": "f741300...",
    "pdfData": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2c...",
    "placeholders": [...],
    "data": {},
    "template_name": "Contract Template"
  }
}
```

**Response (Already Signed - 410):**

```json
{
  "success": false,
  "error": "Document already signed",
  "message": "This document has already been signed and completed.",
  "status": "completed",
  "documentId": 57042,
  "templateName": "Contract Template"
}
```

#### POST /api/documents

Create a document signing request.

**Body:**

```json
{
  "templateId": 12345,
  "signerEmail": "user@example.com",
  "signerName": "John Doe",
  "data": {
    "company": "Acme Corp",
    "jobtitle": "Manager"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 57042,
    "token": "f741300...",
    "signingUrl": "http://localhost:5173/sign/f741300..."
  },
  "message": "Document signing request created successfully"
}
```

#### POST /api/documents/:id/sign

Submit signed document.

**Body:**

```json
{
  "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "signatureType": "image",
  "fieldValues": {
    "company": "Acme Corp",
    "checkbox1": true
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "signedPdfPath": "uploads/signed/signed-1763455256887-57042.pdf",
    "requestId": 57042,
    "status": "completed"
  },
  "message": "Document signed successfully"
}
```

#### GET /api/documents/:id/download

Download signed PDF.

**Response:**

- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="template-name-signed.pdf"`
- Body: PDF file binary data

**Error Responses:**

- `404`: Document not found or not signed
- `500`: Server error

### Health Check

#### GET /health

Check server health.

**Response:**

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected"
}
```

---

## Database Schema

### Tables

#### templates

Stores PDF template information.

```sql
CREATE TABLE templates (
  id INT PRIMARY KEY,                    -- Random 3-5 digit ID (100-99999)
  name VARCHAR(255) NOT NULL,            -- Template name
  pdf_path VARCHAR(500) NOT NULL,       -- Relative path to PDF file
  placeholders JSON,                     -- Array of placeholder objects
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Placeholder JSON Structure:**

```json
[
  {
    "id": "placeholder-1",
    "type": "signature",
    "x": 0.1,
    "y": 0.5,
    "width": 0.3,
    "height": 0.1,
    "page": 1,
    "label": "Signature",
    "apiKey": "signature",
    "textStyle": {
      "fontSize": 14,
      "color": "#000000",
      "fontWeight": "500",
      "fontFamily": "Inter, sans-serif",
      "letterSpacing": "normal"
    }
  }
]
```

**Placeholder Types:**

- `signature`: Signature field (text, image, or draw)
- `initial`: Initial field (same as signature)
- `stamp`: Stamp field
- `fullname`: Auto-filled from signer name
- `email`: Auto-filled from signer email
- `signdate`: Auto-filled with current date
- `company`: Custom text field
- `jobtitle`: Custom text field
- `text`: Generic text field
- `checkbox`: Checkbox field

#### documents

Stores document signing requests and status.

```sql
CREATE TABLE documents (
  id INT PRIMARY KEY,                    -- Random 3-5 digit ID (100-99999)
  template_id INT NOT NULL,              -- Foreign key to templates
  signer_email VARCHAR(255) NOT NULL,    -- Recipient email
  signer_name VARCHAR(255),              -- Recipient name
  data JSON,                             -- Custom field values
  status ENUM('pending', 'completed', 'expired') DEFAULT 'pending',
  token VARCHAR(255) UNIQUE NOT NULL,    -- 64-char signing token
  signed_pdf_path VARCHAR(500),          -- Path to signed PDF (if completed)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,           -- When document was signed
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_signer_email (signer_email),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_template_id (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Data JSON Structure:**

```json
{
  "company": "Acme Corp",
  "jobtitle": "Manager",
  "address": "123 Main St"
}
```

### ID Generation

Both tables use **random 3-5 digit IDs** (100-99999) instead of auto-increment:

- Generated by `generateUniqueNumericId()` in `utils/security.js`
- Checks database for uniqueness before assignment
- Retries up to 100 times if collision occurs
- Provides better privacy (non-sequential IDs)

---

## Backend Services

### PDF Service (`services/pdfService.js`)

Handles all PDF processing operations.

#### Methods

**`fillDocument({ templatePath, placeholders, document, signatureData, signatureType, fieldValues })`**

- Loads template PDF using pdf-lib
- Iterates through placeholders
- Fills each placeholder based on type
- Returns PDF bytes

**`fillPlaceholder({ page, placeholder, x, y, width, height, ... })`**

- Handles different placeholder types:
  - **Text fields**: Draws text with custom styling
  - **Signatures**: Embeds PNG image or draws text
  - **Checkboxes**: Draws rectangle border + checkmark lines
  - **Auto-fills**: fullname, email, signdate
- Converts normalized coordinates (0-1) to PDF points
- Handles font embedding and color conversion

**`saveSignedPdf(pdfBytes, documentId)`**

- Saves PDF to `uploads/signed/` directory
- Filename format: `signed-{timestamp}-{documentId}.pdf`
- Returns relative path for database storage

#### Coordinate System

- **Frontend**: Normalized coordinates (0-1 range)
  - `x, y`: Top-left corner (0-1)
  - `width, height`: Dimensions (0-1)
- **PDF**: Points (1/72 inch)
  - Conversion: `pdfX = x * pageWidth`
  - Y-axis flipped: `pdfY = pageHeight - (y * pageHeight)`

### Email Service (`services/emailService.js`)

Handles all email communications.

#### Methods

**`sendSigningRequest({ to, signerName, templateName, signingUrl, expiresIn })`**

- Sends HTML email with signing link
- Includes company branding
- Shows document name and expiration

**`sendSigningAcknowledgement({ to, signerName, templateName, pdfPath })`**

- Sends confirmation email
- Attaches signed PDF
- Includes download instructions

**`sendAdminNotification({ adminEmail, signerName, signerEmail, templateName, documentId })`**

- Notifies admin of completed signatures
- Includes document details

#### Email Templates

- HTML-based with inline CSS
- Responsive design
- Branded with company logo
- Professional styling

### Webhook Service (`services/webhookService.js`)

Sends HTTP POST requests to external endpoints.

#### Methods

**`sendWebhook(url, payload)`**

- Sends POST request with JSON payload
- Supports HTTP and HTTPS
- 10-second timeout
- Non-blocking (doesn't fail document signing if webhook fails)

#### Webhook Payload

```json
{
  "id": 57042,
  "templateId": 12345,
  "templateName": "Contract Template",
  "signerName": "John Doe",
  "signerEmail": "user@example.com",
  "signedPdfPath": "uploads/signed/signed-1763455256887-57042.pdf",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "completedAt": "2024-01-15T11:00:00.000Z",
  "address": "123 Main St",
  "legalname": "John Doe",
  "phone": "555-1234",
  "mail": "user@example.com",
  "status": "completed"
}
```

---

## Frontend Architecture

### Component Hierarchy

```
App.jsx
├── BrowserRouter
│   └── Routes
│       ├── DashboardPage
│       │   └── Layout
│       │       ├── Sidebar
│       │       └── Analytics Dashboard
│       ├── TemplatesPage
│       │   └── Layout
│       │       └── TemplateList
│       │           ├── Template Cards
│       │           └── Send Dialog
│       ├── EditorPage
│       │   └── PDFEditor
│       │       ├── PDF Viewer (react-pdf)
│       │       ├── Field Palette
│       │       └── Placeholder Overlays
│       ├── SigningPage
│       │   ├── PDF Viewer
│       │   ├── Signature Dialog
│       │   │   ├── Text Tab
│       │   │   ├── Draw Tab (Canvas)
│       │   │   └── Upload Tab
│       │   └── Validation Dialog
│       ├── AnalyticsPage
│       └── SettingsPage
```

### State Management

Uses **React Hooks** for state management:

- `useState`: Component-level state
- `useEffect`: Side effects and data fetching
- `useRef`: DOM references and non-reactive values
- `useMemo`: Computed values caching
- `useCallback`: Function memoization

### API Service Layer (`services/api.js`)

Centralized API communication with:

- **Request caching**: 5-second cache for GET requests
- **Request deduplication**: Prevents duplicate simultaneous requests
- **Error handling**: Custom ApiError class
- **410 handling**: Special handling for already-signed documents

### PDF Rendering

**react-pdf** library:

- Renders PDF pages as canvas elements
- Supports multi-page documents
- Handles PDF.js worker for parsing
- Overlays interactive placeholders

**Placeholder Overlay System:**

- Absolute positioning based on normalized coordinates
- Responsive sizing based on container width
- Mobile-optimized font scaling
- Visual feedback (borders, hover states)

### Signature Methods

#### 1. Text Signature

- User enters name
- Selects font style (Elegant, Modern, Classic)
- Generates signature image using HTML5 Canvas
- Converts to base64 PNG

#### 2. Draw Signature

- HTML5 Canvas element (600x200px)
- Mouse and touch support
- Coordinate scaling for accurate drawing
- Saves as base64 PNG

#### 3. Image Upload

- File input (accepts images)
- Image preview
- Auto-resize if exceeds 2000x1000px
- Maintains aspect ratio
- Converts to base64

### Routing

**React Router DOM v7**:

- Client-side routing
- Route parameters (`/sign/:token`)
- Navigation state for toast messages
- Protected routes (future enhancement)

---

## Security Features

### Backend Security

#### 1. Helmet.js

- Sets security headers:
  - Content-Security-Policy
  - X-Content-Type-Options
  - X-Frame-Options
  - X-XSS-Protection

#### 2. CORS Configuration

- Development: Allows localhost with any port
- Production: Strict origin matching
- Credentials enabled
- Configurable via environment variables

#### 3. Rate Limiting

- **API Limiter**: 100 requests per 15 minutes
- **Document Creation**: 50 requests per hour
- Prevents abuse and DoS attacks

#### 4. Input Validation

- Request validation middleware
- File type validation (PDF only)
- File size limits (10MB default)
- Token format validation (64 characters)
- ID validation (numeric)

#### 5. SQL Injection Prevention

- Parameterized queries (prepared statements)
- Table name whitelisting for dynamic queries
- No string concatenation in SQL

#### 6. Token Security

- 64-character hexadecimal tokens
- Cryptographically secure random generation
- Unique constraint in database
- One-time use (status changes after signing)

#### 7. File Upload Security

- MIME type validation
- File size limits
- Secure file naming (timestamp + ID)
- Directory traversal prevention

### Frontend Security

#### 1. XSS Prevention

- React's built-in XSS protection
- No `dangerouslySetInnerHTML` usage
- Input sanitization

#### 2. CSRF Protection

- Same-origin policy
- CORS configuration
- Token-based authentication (future)

#### 3. Secure Storage

- No sensitive data in localStorage
- Tokens only in URL parameters
- State management in memory

---

## Configuration

### Environment Variables

#### Backend (.env)

```env
# Server Configuration
PORT=3001
NODE_ENV=development
BASE_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=signing_app

# File Upload
MAX_FILE_SIZE=10485760  # 10MB in bytes
TOKEN_EXPIRY=2592000000  # 30 days in milliseconds

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Optional: Admin & Webhook
ADMIN_EMAIL=admin@example.com
WEBHOOK_URL=https://your-webhook-endpoint.com/webhook
```

#### Frontend (.env)

```env
VITE_API_URL=http://localhost:3001
```

### Application Configuration

#### Backend (`config/app.js`)

- Port configuration
- Upload directory paths
- File size limits
- CORS origins
- Token expiry

#### Database (`config/database.js`)

- Connection pool settings
- Auto-initialization
- Table creation

#### Email (`config/email.js`)

- SMTP configuration
- Transporter initialization
- Email verification

---

## File Storage

### Directory Structure

```
backend/uploads/
├── templates/              # Template PDF files
│   └── template-{timestamp}-{id}.pdf
└── signed/                 # Signed PDF files
    └── signed-{timestamp}-{id}.pdf
```

### File Naming Convention

**Templates:**

- Format: `template-{timestamp}-{id}.pdf`
- Example: `template-1763033680184-115275579.pdf`

**Signed PDFs:**

- Format: `signed-{timestamp}-{id}.pdf`
- Example: `signed-1763455256887-57042.pdf`

### File Serving

**Static Middleware:**

- `/uploads/templates/*` → Serves template PDFs
- `/uploads/signed/*` → Serves signed PDFs
- Content-Type: `application/pdf`

**Fallback Route:**

- `/uploads/signed/:filename` → Direct file serving
- Error handling for missing files

---

## Error Handling

### Backend Error Classes

**Custom Error Hierarchy:**

```javascript
AppError (base class)
├── ValidationError (400)
├── NotFoundError (404)
├── DatabaseError (500)
└── FileError (500)
```

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "errors": ["Detailed error 1", "Detailed error 2"],
  "stack": "Error stack trace" // Only in development
}
```

### Error Handling Flow

1. **Controller** throws custom error
2. **Error Handler Middleware** catches error
3. **Logs error** (full stack in dev, message only in prod)
4. **Returns JSON response** with appropriate status code
5. **Hides internal errors** in production

### Frontend Error Handling

**API Service:**

- Custom `ApiError` class
- Status code tracking
- Error data preservation
- Expected error marking (410 for already-signed)

**Component Error Handling:**

- Try-catch blocks in async functions
- User-friendly error messages
- Validation dialogs for form errors
- Console logging for debugging

---

## Deployment Guide

### Prerequisites

1. **Node.js** v18 or higher
2. **MySQL** v8 or higher
3. **npm** or **yarn**

### Backend Deployment

1. **Install Dependencies:**

   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup:**

   - Database and tables are auto-created on startup
   - Ensure MySQL is running
   - Verify connection credentials

4. **Start Server:**

   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

### Frontend Deployment

1. **Install Dependencies:**

   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment:**

   ```bash
   # Create .env file
   echo "VITE_API_URL=https://your-api-domain.com" > .env
   ```

3. **Build for Production:**

   ```bash
   npm run build
   ```

4. **Serve Static Files:**
   - Built files in `dist/` directory
   - Serve with any static file server (nginx, Apache, Vercel, Netlify)

### Production Considerations

1. **Environment Variables:**

   - Set `NODE_ENV=production`
   - Use secure database credentials
   - Configure proper CORS origins
   - Set up SMTP with production email

2. **Security:**

   - Enable HTTPS
   - Use secure session management
   - Implement authentication (future)
   - Regular security updates

3. **Performance:**

   - Enable database connection pooling
   - Implement caching layer
   - CDN for static assets
   - File storage optimization

4. **Monitoring:**

   - Log aggregation
   - Error tracking
   - Performance monitoring
   - Health check endpoints

5. **Backup:**
   - Regular database backups
   - PDF file backups
   - Configuration backups

---

## Additional Details

### ID Generation Algorithm

**Random Numeric ID (3-5 digits):**

```javascript
1. Generate random number: 100-99999
2. Check database for uniqueness
3. If exists, retry (max 100 attempts)
4. Return unique ID
```

**Benefits:**

- Non-sequential (privacy)
- Shorter than UUIDs
- Human-readable
- Collision-resistant

### Coordinate System Details

**Normalization:**

- All coordinates stored as 0-1 range
- Independent of PDF page size
- Responsive to container width
- Consistent across devices

**Conversion Formula:**

```
PDF X = normalizedX * pageWidth
PDF Y = pageHeight - (normalizedY * pageHeight)
```

### Signature Image Processing

**Text to Image:**

1. Create HTML5 Canvas
2. Set font family and size
3. Measure text dimensions
4. Adjust font size to fit bounds
5. Draw text centered
6. Export as base64 PNG

**Image Resizing:**

- Maintains aspect ratio
- Only resizes if exceeds max dimensions
- High-quality rendering
- Preserves signature clarity

### Email Template System

**Template Structure:**

- HTML with inline CSS
- Responsive design
- Branded headers
- Action buttons
- Footer information

**Email Types:**

1. **Signing Request**: Invitation to sign
2. **Acknowledgement**: Confirmation with PDF
3. **Admin Notification**: Status update

### Webhook Integration

**Configuration:**

- Set `WEBHOOK_URL` environment variable
- Webhook sent after successful signing
- Non-blocking (doesn't affect signing flow)
- 10-second timeout
- Retry logic (future enhancement)

**Payload Fields:**

- Document metadata
- Signer information
- Custom field values
- Timestamps
- Status information

### Mobile Responsiveness

**Responsive Features:**

- Mobile-optimized PDF viewer
- Touch-friendly signature drawing
- Responsive dialogs
- Adaptive font sizes
- Mobile navigation

**Breakpoints:**

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Performance Optimizations

**Frontend:**

- Request caching (5 seconds)
- Request deduplication
- Component memoization
- Lazy loading (future)
- Code splitting (future)

**Backend:**

- Database connection pooling
- Async email/webhook sending
- Efficient PDF processing
- File streaming
- Error recovery

---

## Conclusion

This PDF Signing Application is a comprehensive solution for electronic document signing with:

- **Robust architecture** following best practices
- **Multiple signature methods** for user convenience
- **Complete workflow** from template creation to signed PDF delivery
- **Security features** protecting user data
- **Scalable design** ready for production deployment
- **Extensive customization** options for templates and fields

The system is designed to be maintainable, secure, and user-friendly while providing all necessary features for professional document signing workflows.
