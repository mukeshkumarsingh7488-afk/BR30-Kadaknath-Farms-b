const passwordResetOtp = ({ name, otp }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - BR30 Kadaknath Farms</title>
</head>

<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#2f241d;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:30px 15px;">

        <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e8e2dc;border-radius:14px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#2f241d;padding:24px 30px;text-align:center;">
              <div style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">
                BR30 Kadaknath Farms
              </div>

              <div style="margin-top:6px;font-size:12px;color:#d9c9bb;letter-spacing:0.5px;">
                FARM FRESH • TRUSTED • NATURAL
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:38px 35px 30px;">

              <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#2f241d;font-weight:700;">
                Password Reset Request
              </h1>

              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#555555;">
                Hello ${name},
              </p>

              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#555555;">
                We received a request to reset your
                <strong style="color:#2f241d;">BR30 Kadaknath Farms</strong>
                account password. Please use the verification code below to continue.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">

                    <div style="display:inline-block;border:1px solid #e6d8cb;border-radius:12px;padding:18px 32px;background:#faf8f6;">
                      <div style="font-size:11px;color:#8a5a32;font-weight:700;letter-spacing:1.5px;margin-bottom:8px;">
                        PASSWORD RESET CODE
                      </div>

                      <div style="font-size:32px;font-weight:700;letter-spacing:9px;color:#2f241d;">
                        ${otp}
                      </div>
                    </div>

                  </td>
                </tr>
              </table>

              <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#777777;">
                This verification code is valid for
                <strong style="color:#555555;">10 minutes</strong>.
              </p>

              <p style="margin:0;font-size:13px;line-height:1.6;color:#777777;">
                For your security, never share this code with anyone.
                BR30 Kadaknath Farms will never ask you for your OTP.
              </p>

              <!-- Security Notice -->
              <div style="margin-top:25px;padding:14px 16px;background:#faf8f6;border-left:3px solid #8a5a32;border-radius:6px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#777777;">
                  If you did not request a password reset, no action is required.
                  Your account password will remain unchanged.
                </p>
              </div>

              <!-- Divider -->
              <div style="height:1px;background:#eeeeee;margin:28px 0;"></div>

              <p style="margin:0;font-size:13px;line-height:1.6;color:#888888;">
                If you believe someone else is trying to access your account,
                we recommend changing your password after signing in.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#faf8f6;border-top:1px solid #eee8e2;padding:24px 30px;text-align:center;">

              <div style="font-size:15px;font-weight:700;color:#2f241d;margin-bottom:8px;">
                BR30 Kadaknath Farms
              </div>

              <div style="font-size:12px;line-height:1.6;color:#888888;">
                Fresh. Trusted. Farm to You.
              </div>

              <div style="margin-top:14px;font-size:11px;line-height:1.6;color:#aaaaaa;">
                Do not reply to this email.
              </div>

              <div style="margin-top:12px;font-size:11px;color:#b0aaa5;">
                © ${new Date().getFullYear()} BR30 Kadaknath Farms. All rights reserved.
              </div>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
};

export default passwordResetOtp;
