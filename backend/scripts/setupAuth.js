/**
 * Authentication Setup Helper
 * Helps configure authentication environment variables
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const envPath = path.join(__dirname, "../.env");

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function setup() {
  console.log("\n🔐 Authentication Setup\n");
  console.log("This script will help you configure authentication for the application.\n");

  // Check if .env exists
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
    console.log("✓ Found existing .env file\n");
  } else {
    console.log("⚠️  No .env file found. Creating new one...\n");
  }

  // Get admin email
  const email = await question("Enter admin email: ");
  if (!email || !email.includes("@")) {
    console.error("❌ Invalid email address");
    rl.close();
    process.exit(1);
  }

  // Get admin password
  const password = await question("Enter admin password: ");
  if (!password || password.length < 8) {
    console.error("❌ Password must be at least 8 characters");
    rl.close();
    process.exit(1);
  }

  // Generate JWT secret
  const jwtSecret = crypto.randomBytes(64).toString("hex");
  console.log("\n✓ Generated secure JWT secret\n");

  // Update or create .env file
  let updatedContent = envContent;

  // Update ADMIN_EMAIL
  if (envContent.includes("ADMIN_EMAIL=")) {
    updatedContent = updatedContent.replace(
      /ADMIN_EMAIL=.*/,
      `ADMIN_EMAIL=${email}`
    );
  } else {
    updatedContent += `\nADMIN_EMAIL=${email}\n`;
  }

  // Update ADMIN_PASSWORD
  if (envContent.includes("ADMIN_PASSWORD=")) {
    updatedContent = updatedContent.replace(
      /ADMIN_PASSWORD=.*/,
      `ADMIN_PASSWORD=${password}`
    );
  } else {
    updatedContent += `ADMIN_PASSWORD=${password}\n`;
  }

  // Update JWT_SECRET
  if (envContent.includes("JWT_SECRET=")) {
    updatedContent = updatedContent.replace(
      /JWT_SECRET=.*/,
      `JWT_SECRET=${jwtSecret}`
    );
  } else {
    updatedContent += `JWT_SECRET=${jwtSecret}\n`;
  }

  // Ensure JWT_EXPIRY exists
  if (!envContent.includes("JWT_EXPIRY=")) {
    updatedContent += `JWT_EXPIRY=24h\n`;
  }

  // Write to file
  fs.writeFileSync(envPath, updatedContent, "utf8");

  console.log("✅ Authentication configured successfully!");
  console.log("\nConfiguration saved to .env file:");
  console.log(`   ADMIN_EMAIL=${email}`);
  console.log(`   ADMIN_PASSWORD=*** (hidden)`);
  console.log(`   JWT_SECRET=*** (hidden)`);
  console.log("\n⚠️  Restart your backend server for changes to take effect.\n");

  rl.close();
}

setup().catch((error) => {
  console.error("Error:", error);
  rl.close();
  process.exit(1);
});

