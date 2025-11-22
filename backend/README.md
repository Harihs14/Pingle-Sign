# Backend API Documentation

## Project Structure

```
backend/
├── config/           # Configuration files
│   ├── app.js       # Application configuration
│   ├── database.js  # Database configuration and initialization
│   └── email.js     # Email service configuration
├── controllers/      # Request handlers
│   ├── templateController.js
│   └── documentController.js
├── middleware/       # Express middleware
│   ├── errorHandler.js
│   ├── security.js
│   └── validation.js
├── models/          # Database models
│   ├── Template.js
│   └── Document.js
├── routes/          # API routes
│   ├── index.js
│   ├── templateRoutes.js
│   └── documentRoutes.js
├── services/        # Business logic services
│   ├── emailService.js
│   ├── pdfService.js
│   └── s3Service.js  # AWS S3 storage service
├── utils/           # Utility functions
│   ├── errors.js
│   ├── security.js
│   └── validation.js
├── index.js         # Application entry point
└── .env.example     # Environment variables example
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

3. Update `.env` with your configuration values.

4. Start the server:

```bash
npm run dev    # Development mode with watch
npm start      # Production mode
```

## API Endpoints

### Templates

- `GET /api/templates` - Get all templates
- `GET /api/templates/:id` - Get template by ID
- `POST /api/templates` - Create new template (requires PDF file)
- `PUT /api/templates/:id/placeholders` - Update template placeholders
- `DELETE /api/templates/:id` - Delete template

### Documents

- `GET /api/documents` - Get all documents
- `GET /api/documents/token/:token` - Get document by token
- `POST /api/documents` - Create document signing request
- `POST /api/documents/:id/sign` - Submit signed document

### Health Check

- `GET /health` - Server health status

## Security Features

- **Helmet.js** - Security headers
- **Rate Limiting** - API and document creation rate limits
- **Input Validation** - Request validation middleware
- **Error Handling** - Centralized error handling
- **File Upload Validation** - File type and size validation
- **SQL Injection Protection** - Parameterized queries
- **CORS Configuration** - Configurable CORS settings

## Environment Variables

See `.env.example` for all available configuration options.

## Error Handling

All errors are handled centrally through the error handler middleware. Errors return JSON responses with:

- `success: false`
- `error: "Error message"`
- `errors: []` (for validation errors)

## Database

The application uses MySQL with connection pooling. Tables are automatically created on startup if they don't exist.

## Email Service

Email service is optional. If not configured, the application will continue to work but won't send emails.

## S3 Storage Configuration

The application supports both local filesystem and AWS S3 for document storage. By default, files are stored locally in the `uploads/` directory.

### Enabling S3 Storage

1. Set the following environment variables in your `.env` file:

```env
USE_S3=true
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name

# Optional: Custom S3 path prefixes
S3_TEMPLATES_PREFIX=templates
S3_SIGNED_PREFIX=signed
```

2. Ensure your AWS credentials have the following S3 permissions:

   - `s3:PutObject` - Upload files
   - `s3:GetObject` - Download files
   - `s3:DeleteObject` - Delete files

3. The application will automatically:
   - Store templates in S3 at `templates/` (or your custom prefix)
   - Store signed PDFs in S3 at `signed/` (or your custom prefix)
   - Download files from S3 when needed
   - Fall back to local storage if S3 is not enabled

### S3 Bucket Setup

1. Create an S3 bucket in your AWS account
2. Configure bucket policies for your application's access
3. Consider enabling versioning for document retention
4. Set up lifecycle policies if needed for automatic cleanup

### Migration from Local to S3

When migrating existing data:

1. Upload existing files from `uploads/templates/` to S3 `templates/` prefix
2. Upload existing files from `uploads/signed/` to S3 `signed/` prefix
3. Update database records to use S3 keys (e.g., `templates/template-xxx.pdf`) instead of local paths
4. Enable S3 by setting `USE_S3=true`

## Production Considerations

1. Set `NODE_ENV=production`
2. Use strong database passwords
3. Configure proper CORS origins
4. Set up proper email service
5. Use environment variables for all sensitive data
6. Enable HTTPS
7. Set up proper logging
8. Configure rate limits appropriately
9. Use a reverse proxy (nginx)
10. Set up monitoring and alerts
