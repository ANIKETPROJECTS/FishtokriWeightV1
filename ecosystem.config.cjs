const fs = require("node:fs");
const path = require("node:path");

const projectRoot = __dirname;
const envFile = path.join(projectRoot, ".env");

// Load VPS-only credentials from .env without adding a runtime dependency.
// Existing shell/PM2 environment values take precedence over the file.
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || line.trimStart().startsWith("#")) continue;
    const [, key] = match;
    let value = match[2];
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      const quote = value[0];
      value = value.slice(1, -1);
      if (quote === '"') value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const requiredSecrets = ["MONGODB_URI", "SESSION_SECRET"];
const missingSecrets = requiredSecrets.filter((key) => !process.env[key]);
if (missingSecrets.length) {
  throw new Error(`Missing required environment values: ${missingSecrets.join(", ")}. Set them in ${envFile}.`);
}

const appEnv = {};
for (const key of [
  "MONGODB_URI",
  "SESSION_SECRET",
  "MASTER_ADMIN_EMAIL",
  "MASTER_ADMIN_PASSWORD",
  "MASTER_ADMIN_RECOVERY_EMAIL",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "SMTP_FROM",
  "SMTP_HOST",
  "SMTP_PASS",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "WABA_API_KEY",
  "WABA_PHONE_ID",
  "QZ_CERTIFICATE",
  "QZ_PRIVATE_KEY",
  "PUBLIC_APP_URL",
  "LOG_LEVEL",
]) {
  if (process.env[key] !== undefined) appEnv[key] = process.env[key];
}

module.exports = {
  apps: [
    {
      name: "fishtokri-api",
      script: "artifacts/api-server/dist/index.mjs",
      cwd: projectRoot,
      instances: 1,
      autorestart: true,
      watch: false,
      // Routine stdout must not be retained by PM2. Error output remains
      // available through PM2's error log for genuine failures.
      out_file: "/dev/null",
      max_memory_restart: "500M",
      env: {
        ...appEnv,
        NODE_ENV: "production",
        PORT: "3022",
        BASE_URL: process.env.BASE_URL || "https://admin.fishtokri.in",
      },
    },
  ],
};