import https from "https";
import http from "http";

/**
 * Webhook Service
 * Handles sending webhooks to external endpoints
 */
export class WebhookService {
  /**
   * Send webhook to configured endpoint
   * @param {string} url - Webhook URL
   * @param {object} payload - Data to send
   * @returns {Promise<boolean>} - Success status
   */
  async sendWebhook(url, payload) {
    if (!url) {
      console.warn("⚠️  Webhook URL not configured. Skipping webhook send.");
      return false;
    }

    return new Promise((resolve) => {
      try {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === "https:";
        const client = isHttps ? https : http;

        const postData = JSON.stringify(payload);
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData),
          },
          timeout: 10000, // 10 second timeout
        };

        const req = client.request(options, (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log(
                `✅ Webhook sent successfully to ${url}. Status: ${res.statusCode}`
              );
              resolve(true);
            } else {
              console.warn(
                `⚠️  Webhook returned status ${res.statusCode} from ${url}`
              );
              resolve(false);
            }
          });
        });

        req.on("error", (error) => {
          console.error(`❌ Error sending webhook to ${url}:`, error.message);
          resolve(false);
        });

        req.on("timeout", () => {
          req.destroy();
          console.error(`❌ Webhook timeout for ${url}`);
          resolve(false);
        });

        req.write(postData);
        req.end();
      } catch (error) {
        console.error(`❌ Error preparing webhook to ${url}:`, error.message);
        resolve(false);
      }
    });
  }
}

export default WebhookService;
