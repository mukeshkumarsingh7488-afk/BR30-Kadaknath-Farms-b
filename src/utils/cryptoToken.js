import crypto from "crypto";
import env from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const KEY = crypto.createHash("sha256").update(env.jwtSecret).digest();

export const encryptData = (data) => {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);

  const authTag = cipher.getAuthTag();

  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(".");
};

export const decryptData = (token) => {
  const [ivHex, authTagHex, encryptedHex] = token.split(".");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid secure token");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, "hex"));

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]);

  return JSON.parse(decrypted.toString("utf8"));
};
