/**
 * Transactional email templates (PT-BR)
 */

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

function layout(title: string, body: string, buttonLabel: string, buttonUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Inter,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;padding:32px;">
        <tr><td style="text-align:center;padding-bottom:24px;">
          <span style="font-size:24px;font-weight:700;color:#111827;">AgendaFlow</span>
        </td></tr>
        <tr><td style="font-size:18px;font-weight:600;color:#111827;padding-bottom:12px;">${title}</td></tr>
        <tr><td style="font-size:14px;color:#4b5563;line-height:1.6;padding-bottom:24px;">${body}</td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${buttonUrl}" style="display:inline-block;background-color:#3b5bdb;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">${buttonLabel}</a>
        </td></tr>
        <tr><td style="font-size:12px;color:#9ca3af;line-height:1.5;">
          Se o botão não funcionar, copie e cole este link no navegador:<br>
          <a href="${buttonUrl}" style="color:#3b5bdb;word-break:break-all;">${buttonUrl}</a>
        </td></tr>
      </table>
      <p style="font-size:12px;color:#9ca3af;margin-top:16px;">AgendaFlow — Agendamento inteligente para o seu negócio</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function passwordResetEmail(link: string): EmailContent {
  return {
    subject: 'Redefinição de senha — AgendaFlow',
    text: `Recebemos um pedido para redefinir a sua senha no AgendaFlow.\n\nAcesse o link abaixo para criar uma nova senha (válido por 30 minutos):\n${link}\n\nSe você não pediu a redefinição, ignore este email.`,
    html: layout(
      'Redefinição de senha',
      'Recebemos um pedido para redefinir a sua senha no AgendaFlow. Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>30 minutos</strong>. Se você não pediu a redefinição, ignore este email.',
      'Redefinir senha',
      link
    ),
  };
}

export function verifyEmailTemplate(link: string): EmailContent {
  return {
    subject: 'Confirme seu email — AgendaFlow',
    text: `Bem-vindo ao AgendaFlow!\n\nConfirme seu endereço de email acessando o link abaixo (válido por 48 horas):\n${link}\n\nSe você não criou uma conta, ignore este email.`,
    html: layout(
      'Confirme seu email',
      'Bem-vindo ao AgendaFlow! Confirme seu endereço de email clicando no botão abaixo. O link é válido por <strong>48 horas</strong>. Se você não criou uma conta, ignore este email.',
      'Confirmar email',
      link
    ),
  };
}
