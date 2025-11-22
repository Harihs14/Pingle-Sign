# S3 Storage Setup Guide

This guide explains how to configure AWS S3 storage for your document signing application.

## Overview

The application now supports both local filesystem storage and AWS S3 storage. By default, files are stored locally. You can enable S3 storage by setting environment variables.

## Prerequisites

1. AWS Account with S3 access
2. S3 bucket created in your AWS account
3. AWS IAM user with S3 permissions

## Step 1: Create S3 Bucket

1. Log in to AWS Console
2. Navigate to S3 service
3. Click "Create bucket"
4. Choose a unique bucket name (e.g., `my-signing-app-documents`)
5. Select your preferred region
6. Configure bucket settings (versioning, encryption, etc.)
7. Create the bucket

## Step 2: Create IAM User and Policy

1. Navigate to IAM in AWS Console
2. Create a new user (e.g., `signing-app-s3-user`)
3. Attach a policy with the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

4. Create access keys for the user
5. Save the Access Key ID and Secret Access Key

## Step 3: Configure Environment Variables

Add the following to your `.env` file:

```env
# Enable S3 storage
USE_S3=true

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id-here
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here
AWS_S3_BUCKET_NAME=your-bucket-name

# Optional: Custom S3 path prefixes
S3_TEMPLATES_PREFIX=templates
S3_SIGNED_PREFIX=signed
```

## Step 4: Verify Configuration

1. Restart your backend server
2. Check server logs for S3 initialization messages
3. Upload a test template to verify S3 upload works
4. Check your S3 bucket to confirm files are being uploaded

## File Storage Structure

When S3 is enabled:

- **Templates**: Stored at `templates/template-{timestamp}-{random}.pdf`
- **Signed PDFs**: Stored at `signed/signed-{timestamp}-{documentId}.pdf`

These paths are stored in the database instead of local file paths.

## Migration from Local to S3

If you have existing files in local storage:

1. **Backup your data** - Ensure you have backups of your database and uploads folder

2. **Upload existing files to S3**:

   ```bash
   # Upload templates
   aws s3 sync backend/uploads/templates/ s3://your-bucket-name/templates/

   # Upload signed PDFs
   aws s3 sync backend/uploads/signed/ s3://your-bucket-name/signed/
   ```

3. **Update database paths** (if needed):

   - Old format: `uploads/templates/template-xxx.pdf`
   - New format: `templates/template-xxx.pdf`

   You may need to run a SQL update query to change paths in your database.

4. **Enable S3** by setting `USE_S3=true` in your `.env` file

5. **Test thoroughly** before removing local files

## Troubleshooting

### Files not uploading to S3

- Verify `USE_S3=true` is set
- Check AWS credentials are correct
- Verify bucket name matches exactly
- Check IAM permissions
- Review server logs for error messages

### Files not downloading from S3

- Verify the S3 key in database matches the actual S3 object key
- Check IAM permissions include `s3:GetObject`
- Verify bucket name is correct

### Email attachments not working with S3

- The email service automatically downloads S3 files temporarily for email attachments
- Ensure S3 download permissions are working
- Check server logs for email service errors

## Security Best Practices

1. **Never commit AWS credentials** to version control
2. **Use IAM roles** instead of access keys when possible (e.g., on EC2)
3. **Enable S3 bucket encryption** at rest
4. **Use bucket policies** to restrict access
5. **Enable S3 access logging** for audit trails
6. **Rotate access keys** regularly
7. **Use least privilege** IAM policies

## Cost Considerations

- S3 storage costs vary by region and storage class
- Consider using S3 Intelligent-Tiering for automatic cost optimization
- Set up lifecycle policies to move old files to cheaper storage classes
- Monitor your S3 usage in AWS Cost Explorer

## Disabling S3

To switch back to local storage:

1. Set `USE_S3=false` or remove the `USE_S3` variable
2. Restart the server
3. New files will be stored locally
4. Existing S3 files will remain in S3 (download if needed)

## Support

For issues or questions:

- Check server logs for detailed error messages
- Verify AWS credentials and permissions
- Review AWS S3 documentation
- Check application README.md for general setup
