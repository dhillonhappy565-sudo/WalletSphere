const nodemailer = require('nodemailer');

const createTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: Ethereal Auto Test Inbox for Instant Development
  const testAccount = await nodemailer.createTestAccount();
  console.log(`[EMAIL UTILITY] Using Ethereal Test Account: ${testAccount.user}`);
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

const sendVerificationEmail = async (toEmail, token, fullName) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174';
  const verifyLink = `${clientUrl}/verify-email?token=${token}`;

  const transporter = await createTransporter();

  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'WalletSphere'}" <${process.env.FROM_EMAIL || 'no-reply@walletsphere.app'}>`,
    to: toEmail,
    subject: 'Verify your WalletSphere Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8faf9; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #059669; margin: 0; font-size: 24px;">✨ WalletSphere</h1>
          <p style="color: #64748b; font-size: 14px;">Smart Personal Finance & Analytics</p>
        </div>
        
        <div style="background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Welcome, ${fullName || 'Friend'}!</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Thank you for registering with WalletSphere. Please click the button below to verify your email address and activate full account features.
          </p>
          
          <div style="text-align: center; margin: 28px 0;">
            <a href="${verifyLink}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
              Verify Email Address →
            </a>
          </div>

          <p style="color: #64748b; font-size: 12px;">Or copy and paste this link in your browser:</p>
          <p style="color: #059669; font-size: 12px; word-break: break-all;">${verifyLink}</p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 11px;">
          If you did not sign up for WalletSphere, please ignore this email.
        </div>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[EMAIL SENT] Verification email sent to ${toEmail}: ${info.messageId}`);
  
  if (nodemailer.getTestMessageUrl(info)) {
    console.log(`[EMAIL PREVIEW LINK] ${nodemailer.getTestMessageUrl(info)}`);
  }

  return info;
};

const sendPasswordResetEmail = async (toEmail, token, fullName) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174';
  const resetLink = `${clientUrl}/reset-password?token=${token}`;

  const transporter = await createTransporter();

  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'WalletSphere'}" <${process.env.FROM_EMAIL || 'no-reply@walletsphere.app'}>`,
    to: toEmail,
    subject: 'Reset your WalletSphere Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8faf9; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #059669; margin: 0; font-size: 24px;">✨ WalletSphere</h1>
          <p style="color: #64748b; font-size: 14px;">Password Reset Request</p>
        </div>
        
        <div style="background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Hello, ${fullName || 'User'}!</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            We received a request to reset your WalletSphere password. Click the button below to choose a new password.
          </p>
          
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetLink}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
              Reset Password →
            </a>
          </div>

          <p style="color: #64748b; font-size: 12px;">This link is valid for 1 hour. If you did not request this, your account remains secure.</p>
        </div>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[EMAIL SENT] Password reset email sent to ${toEmail}: ${info.messageId}`);
  
  if (nodemailer.getTestMessageUrl(info)) {
    console.log(`[EMAIL PREVIEW LINK] ${nodemailer.getTestMessageUrl(info)}`);
  }

  return info;
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
