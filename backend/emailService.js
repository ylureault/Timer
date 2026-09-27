import nodemailer from 'nodemailer';

// Email configuration - use environment variables in production
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
};

// Create transporter
let transporter = null;

export function initEmailService() {
  if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
    console.warn('⚠️ Email service not configured. Set SMTP_USER and SMTP_PASS environment variables.');
    return false;
  }

  transporter = nodemailer.createTransport(EMAIL_CONFIG);
  console.log('📧 Email service initialized');
  return true;
}

// Send a single email
export async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    console.error('Email service not initialized');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Insuffle Timer" <${EMAIL_CONFIG.auth.user}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    });

    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

// Send test email
export async function sendTestEmail(to) {
  return sendEmail({
    to,
    subject: '🎉 Test Insuffle Timer - Email fonctionne !',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6C5CE7; margin: 0;">⏱️ Insuffle Timer</h1>
        </div>

        <div style="background: linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%); padding: 30px; border-radius: 16px; color: white; text-align: center;">
          <h2 style="margin: 0 0 10px 0;">✅ Test réussi !</h2>
          <p style="margin: 0; opacity: 0.9;">Votre configuration email fonctionne parfaitement.</p>
        </div>

        <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 12px;">
          <p style="margin: 0; color: #666;">
            Cet email a été envoyé depuis <strong>Insuffle Timer</strong> pour tester la configuration email.
          </p>
        </div>

        <div style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">
          <p>© 2025 Insuffle Timer - Propulsé par Insuffle</p>
        </div>
      </div>
    `
  });
}

// Send newsletter to multiple recipients
export async function sendNewsletter({ subject, content, subscribers }) {
  if (!transporter) {
    return { success: false, error: 'Email service not configured', sent: 0 };
  }

  let sentCount = 0;
  const errors = [];

  for (const subscriber of subscribers) {
    try {
      const unsubscribeUrl = `${process.env.APP_URL || 'https://timer.insuffle.com'}/unsubscribe/${subscriber.unsubscribe_token}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6C5CE7; margin: 0;">⏱️ Insuffle Timer</h1>
          </div>

          <div style="padding: 20px;">
            ${content}
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
            <p>Vous recevez cet email car vous êtes inscrit à la newsletter Insuffle Timer.</p>
            <p><a href="${unsubscribeUrl}" style="color: #999;">Se désinscrire</a></p>
            <p>© 2025 Insuffle Timer</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"Insuffle Timer" <${EMAIL_CONFIG.auth.user}>`,
        to: subscriber.email,
        subject,
        html
      });

      sentCount++;
      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      errors.push({ email: subscriber.email, error: error.message });
    }
  }

  return { success: true, sent: sentCount, errors };
}

// Send welcome email to new subscriber
export async function sendWelcomeEmail(email, name, unsubscribeToken) {
  const unsubscribeUrl = `${process.env.APP_URL || 'https://timer.insuffle.com'}/unsubscribe/${unsubscribeToken}`;

  return sendEmail({
    to: email,
    subject: '🎉 Bienvenue dans la newsletter Insuffle Timer !',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6C5CE7; margin: 0;">⏱️ Insuffle Timer</h1>
        </div>

        <div style="background: linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%); padding: 30px; border-radius: 16px; color: white;">
          <h2 style="margin: 0 0 15px 0;">Bienvenue ${name || ''} !</h2>
          <p style="margin: 0; opacity: 0.9;">
            Merci de vous être inscrit à notre newsletter. Vous recevrez des actualités,
            des astuces et des nouveautés sur Insuffle Timer.
          </p>
        </div>

        <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 12px;">
          <h3 style="margin: 0 0 15px 0; color: #333;">Ce que vous recevrez :</h3>
          <ul style="margin: 0; padding-left: 20px; color: #666;">
            <li>Nouvelles fonctionnalités</li>
            <li>Astuces pour mieux utiliser le timer</li>
            <li>Offres exclusives</li>
          </ul>
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
          <p><a href="${unsubscribeUrl}" style="color: #999;">Se désinscrire</a></p>
          <p>© 2025 Insuffle Timer - Propulsé par Insuffle</p>
        </div>
      </div>
    `
  });
}

export default { initEmailService, sendEmail, sendTestEmail, sendNewsletter, sendWelcomeEmail };
