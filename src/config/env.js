import dotenv from "dotenv";

dotenv.config();

const requiredEnv = [
  "MONGO_URI",
  "JWT_SECRET",
  "FRONTEND_URL",
  "BREVO_EMAIL",
  "BREVO_SMTP_KEY",
  "ADMIN_EMAIL",
  "CLOUD_NAME",
  "CLOUD_API_KEY",
  "CLOUD_API_SECRET",

  // Paytm
  "PAYTM_MID",
  "PAYTM_MERCHANT_KEY",
  "PAYTM_WEBSITE",
  "PAYTM_CALLBACK_URL",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",

  port: Number(process.env.PORT) || 5000,

  mongoUri: process.env.MONGO_URI,

  jwtSecret: process.env.JWT_SECRET,

  frontendUrl: process.env.FRONTEND_URL,

  brevoEmail: process.env.BREVO_EMAIL,

  brevoSmtpKey: process.env.BREVO_SMTP_KEY,

  smtpHost: process.env.SMTP_HOST || "smtp-relay.brevo.com",

  smtpPort: Number(process.env.SMTP_PORT) || 587,

  adminEmail: process.env.ADMIN_EMAIL.toLowerCase().trim(),

  cloudName: process.env.CLOUD_NAME,

  cloudApiKey: process.env.CLOUD_API_KEY,

  cloudApiSecret: process.env.CLOUD_API_SECRET,

  // Paytm
  paytmMid: process.env.PAYTM_MID,

  paytmMerchantKey: process.env.PAYTM_MERCHANT_KEY,

  paytmWebsite: process.env.PAYTM_WEBSITE,

  paytmCallbackUrl: process.env.PAYTM_CALLBACK_URL,

  paytmEnvironment: process.env.PAYTM_ENV || "staging",
};

export default env;
