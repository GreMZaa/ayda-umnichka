/**
 * Shared layout for Supabase Go-template HTML emails (АйДаУмничка).
 * @param {{ preheader: string, title: string, paragraphs: string[], cta?: { label: string, href: string }, footerNote?: string }} opts
 */
export function buildAydaEmail(opts) {
  const logoUrl =
    opts.logoUrl ||
    'https://lk-ayda-um.vercel.app/images/logo-official.jpg';
  const paragraphs = opts.paragraphs
    .map(
      (p) =>
        `<p style="margin:16px 0 0;font-size:14px;line-height:1.65;color:#54607B;">${p}</p>`
    )
    .join('\n');

  const ctaBlock = opts.cta
    ? `<tr>
          <td style="padding:12px 32px 8px;text-align:center;">
            <a href="${opts.cta.href}" style="display:inline-block;background:#F97A52;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:14px 36px;border-radius:999px;mso-padding-alt:0;">${opts.cta.label}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 20px;">
            <p style="margin:0;font-size:11px;line-height:1.5;color:#9E9085;">Если кнопка не открывается, скопируйте ссылку в браузер:</p>
            <p style="margin:8px 0 0;font-size:10px;line-height:1.4;word-break:break-all;color:#7E8AA5;">${opts.cta.href}</p>
          </td>
        </tr>`
    : '';

  const footerNote =
    opts.footerNote ??
    'Вы получили это письмо, потому что указали этот адрес в личном кабинете «АйДаУмничка».';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#FFF7EE;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFF7EE;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FFFFFF;border:1px solid #F2DECE;border-radius:24px;overflow:hidden;">
          <tr>
            <td style="background:#FDEFEA;padding:24px 32px 20px;text-align:center;border-bottom:1px solid #F2DECE;">
              <img src="${logoUrl}" alt="АйДаУмничка" width="168" style="display:block;margin:0 auto 14px;max-width:168px;width:168px;height:auto;border:0;outline:none;text-decoration:none;" />
              <div style="font-size:11px;font-weight:600;color:#6B758E;text-transform:uppercase;letter-spacing:0.08em;">личный кабинет</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <h1 style="margin:0;font-size:20px;font-weight:800;color:#161F38;line-height:1.3;">${opts.title}</h1>
              ${paragraphs}
            </td>
          </tr>
          ${ctaBlock}
          <tr>
            <td style="background:#FFFBF7;border-top:1px solid #F2DECE;padding:18px 32px 22px;text-align:center;">
              <p style="margin:0;font-size:10px;line-height:1.5;color:#9E9085;">${footerNote}</p>
              <p style="margin:10px 0 0;font-size:10px;color:#C5C9D4;">© АйДаУмничка</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
