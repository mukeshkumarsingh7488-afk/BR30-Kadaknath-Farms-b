import axios from "axios";
import env from "../config/env.js";

import emailVerificationOtp from "../templates/emailVerificationOtp.js";
import passwordResetOtp from "../templates/passwordResetOtp.js";

const sendBrevoEmail = async ({ to, subject, htmlContent, recipientName }) => {
  try {
    if (!env.brevoEmail || !env.brevoSmtpKey) {
      throw new Error("Brevo configuration missing");
    }

    const payload = {
      sender: {
        name: "BR30 Kadaknath Farms",
        email: env.brevoEmail.trim(),
      },
      to: [
        {
          email: to.trim(),
          ...(recipientName ? { name: recipientName.trim() } : {}),
        },
      ],
      subject,
      htmlContent,
    };

    console.log("📧 Sending email via Brevo API:", {
      to,
      subject,
    });

    const response = await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
      headers: {
        accept: "application/json",
        "api-key": env.brevoSmtpKey.trim(),
        "content-type": "application/json",
      },
    });

    if (response.status === 200 || response.status === 201) {
      console.log("✅ Email sent successfully via Brevo API");
      return response.data;
    }

    throw new Error("Brevo API rejected the email request");
  } catch (error) {
    console.error("❌ Brevo email failed:", error.response?.data || error.message);

    throw new Error(error.response?.data?.message || error.message || "Email sending failed");
  }
};

export const sendVerificationOtpEmail = async ({ name, email, otp }) => {
  return sendBrevoEmail({
    to: email,
    recipientName: name,
    subject: "Verify your BR30 Kadaknath Farms account",
    htmlContent: emailVerificationOtp({
      name,
      otp,
    }),
  });
};

export const sendPasswordResetOtpEmail = async ({ name, email, otp }) => {
  return sendBrevoEmail({
    to: email,
    recipientName: name,
    subject: "BR30 Kadaknath Farms - Password Reset OTP",
    htmlContent: passwordResetOtp({
      name,
      otp,
    }),
  });
};
