/**
 * Password Hashing Utility
 * Use this script to generate a bcrypt hash for your admin password
 * 
 * Usage: node scripts/hashPassword.js <your-password>
 */

import bcrypt from "bcryptjs";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Get password from command line argument or prompt
const password = process.argv[2];

if (password) {
  // Hash password from command line
  const saltRounds = 12;
  const hash = bcrypt.hashSync(password, saltRounds);
  console.log("\n✅ Password hashed successfully!");
  console.log("\nAdd this to your .env file:");
  console.log(`ADMIN_PASSWORD="${hash}"\n`);
  process.exit(0);
} else {
  // Prompt for password
  rl.question("Enter password to hash: ", (inputPassword) => {
    if (!inputPassword) {
      console.error("❌ Password cannot be empty");
      rl.close();
      process.exit(1);
    }

    const saltRounds = 12;
    const hash = bcrypt.hashSync(inputPassword, saltRounds);
    console.log("\n✅ Password hashed successfully!");
    console.log("\nAdd this to your .env file:");
    console.log(`ADMIN_PASSWORD="${hash}"\n`);
    rl.close();
    process.exit(0);
  });
}

