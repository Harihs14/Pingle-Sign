import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";

/**
 * S3 Service
 * Handles all S3 operations for file storage
 */
export class S3Service {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    this.bucketName = process.env.AWS_S3_BUCKET_NAME;
    this.useS3 = process.env.USE_S3 === "true" || process.env.USE_S3 === "1";

    if (this.useS3 && !this.bucketName) {
      console.warn("⚠️  USE_S3 is enabled but AWS_S3_BUCKET_NAME is not set");
    }
  }

  /**
   * Check if S3 is enabled
   */
  isEnabled() {
    return this.useS3 && this.bucketName;
  }

  /**
   * Upload file to S3
   * @param {Buffer|Uint8Array} fileBuffer - File content as buffer
   * @param {string} key - S3 object key (path)
   * @param {string} contentType - MIME type (default: application/pdf)
   * @returns {Promise<string>} S3 key/path
   */
  async uploadFile(fileBuffer, key, contentType = "application/pdf") {
    if (!this.isEnabled()) {
      throw new Error(
        "S3 is not enabled. Set USE_S3=true and AWS_S3_BUCKET_NAME"
      );
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
      console.log(`✅ File uploaded to S3: ${key}`);
      return key;
    } catch (error) {
      console.error(`❌ Error uploading file to S3: ${error.message}`);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Download file from S3
   * @param {string} key - S3 object key (path)
   * @returns {Promise<Buffer>} File content as buffer
   */
  async downloadFile(key) {
    if (!this.isEnabled()) {
      throw new Error(
        "S3 is not enabled. Set USE_S3=true and AWS_S3_BUCKET_NAME"
      );
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      console.log(`✅ File downloaded from S3: ${key}`);
      return buffer;
    } catch (error) {
      console.error(`❌ Error downloading file from S3: ${error.message}`);
      throw new Error(`Failed to download file from S3: ${error.message}`);
    }
  }

  /**
   * Delete file from S3
   * @param {string} key - S3 object key (path)
   * @returns {Promise<void>}
   */
  async deleteFile(key) {
    if (!this.isEnabled()) {
      throw new Error(
        "S3 is not enabled. Set USE_S3=true and AWS_S3_BUCKET_NAME"
      );
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      console.log(`✅ File deleted from S3: ${key}`);
    } catch (error) {
      console.error(`❌ Error deleting file from S3: ${error.message}`);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  /**
   * Get presigned URL for file access
   * @param {string} key - S3 object key (path)
   * @param {number} expiresIn - URL expiration in seconds (default: 3600 = 1 hour)
   * @returns {Promise<string>} Presigned URL
   */
  async getPresignedUrl(key, expiresIn = 3600) {
    if (!this.isEnabled()) {
      throw new Error(
        "S3 is not enabled. Set USE_S3=true and AWS_S3_BUCKET_NAME"
      );
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error(`❌ Error generating presigned URL: ${error.message}`);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Get file stream from S3 (for large files)
   * @param {string} key - S3 object key (path)
   * @returns {Promise<Readable>} File stream
   */
  async getFileStream(key) {
    if (!this.isEnabled()) {
      throw new Error(
        "S3 is not enabled. Set USE_S3=true and AWS_S3_BUCKET_NAME"
      );
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return response.Body;
    } catch (error) {
      console.error(`❌ Error getting file stream from S3: ${error.message}`);
      throw new Error(`Failed to get file stream from S3: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new S3Service();
