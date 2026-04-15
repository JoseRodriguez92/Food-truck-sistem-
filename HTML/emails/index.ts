// ── Templates de email para 3 Street Food ─────────────────────────────────────
// Paleta: fondo oscuro #1A1A1A · card #242424 · dorado #E8C547 · texto #FAFAFA

// ── Template base ─────────────────────────────────────────────────────────────

export type EmailTemplateParams = {
  /** Título principal del encabezado */
  title: string;
  /** HTML del cuerpo del mensaje */
  content: string;
  /** Texto opcional debajo del título en el header */
  subtitle?: string;
};

export function emailTemplate({
  title,
  content,
  subtitle,
}: EmailTemplateParams): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — 3 Street Food</title>
</head>
<body style="margin:0; padding:0; background-color:#111111; font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background-color:#111111; padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Tarjeta principal (máx 600px) -->
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:600px; width:100%; background-color:#1E1E1E;
                      border-radius:16px; overflow:hidden;
                      border:1px solid #2E2E2E;">

          <!-- ── Franja dorada superior ───────────────────────────────────── -->
          <tr>
            <td style="background-color:#E8C547; height:4px; font-size:0; line-height:0;">
              &nbsp;
            </td>
          </tr>

          <!-- ── Cabecera ─────────────────────────────────────────────────── -->
          <tr>
            <td align="center"
                style="background-color:#242424; padding:32px 32px 28px;">
              <!-- Ícono camión (emoji como fallback universal) -->
              <div style="display:inline-block; background-color:#2E2E2E;
                          border:1px solid #3A3A3A; border-radius:12px;
                          padding:12px 16px; margin-bottom:16px;
                          font-size:28px; line-height:1;">
                🚚
              </div>
              <h1 style="margin:0; color:#FAFAFA; font-size:22px; font-weight:700;
                         letter-spacing:0.3px; line-height:1.3;">
                3 Street Food
              </h1>
              ${
                subtitle
                  ? `<p style="margin:8px 0 0; color:#E8C547; font-size:11px;
                              text-transform:uppercase; letter-spacing:2px; font-weight:600;">
                       ${subtitle}
                     </p>`
                  : ""
              }
            </td>
          </tr>

          <!-- ── Separador dorado ──────────────────────────────────────────── -->
          <tr>
            <td style="background: linear-gradient(90deg, #1E1E1E, #E8C547, #1E1E1E);
                       height:1px; font-size:0; line-height:0;">
              &nbsp;
            </td>
          </tr>

          <!-- ── Título de sección ─────────────────────────────────────────── -->
          <tr>
            <td style="padding:32px 40px 8px;">
              <h2 style="margin:0; color:#FAFAFA; font-size:18px; font-weight:700;
                         line-height:1.4;">
                ${title}
              </h2>
            </td>
          </tr>

          <!-- ── Contenido del mensaje ─────────────────────────────────────── -->
          <tr>
            <td style="padding:12px 40px 36px;">
              <div style="color:#A8A8A8; font-size:15px; line-height:1.8;">
                ${content}
              </div>
            </td>
          </tr>

          <!-- ── Separador fino ────────────────────────────────────────────── -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none; border-top:1px solid #2E2E2E; margin:0;" />
            </td>
          </tr>

          <!-- ── Pie de página ─────────────────────────────────────────────── -->
          <tr>
            <td align="center"
                style="background-color:#191919; padding:24px 32px 28px;">
              <p style="margin:0; color:#E8C547; font-size:13px; font-weight:700;
                        letter-spacing:0.3px;">
                3 Street Food
              </p>
              <p style="margin:6px 0 0; color:#555555; font-size:11px; line-height:1.7;">
                Street food con actitud.<br />
                Por favor no respondas directamente a este correo.
              </p>
              <!-- Franja dorada inferior -->
              <div style="margin-top:18px; height:1px;
                          background: linear-gradient(90deg, transparent, #E8C547, transparent);">
              </div>
            </td>
          </tr>

        </table>
        <!-- fin tarjeta -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ── Template: recuperación de contraseña ──────────────────────────────────────

export function resetPasswordEmail(resetUrl: string): string {
  const content = `
    <p style="margin:0 0 20px;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta.
      Si fuiste tú, haz clic en el botón de abajo.
    </p>

    <!-- Botón CTA -->
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0;">
      <tr>
        <td style="background-color:#E8C547; border-radius:10px;">
          <a href="${resetUrl}"
             style="display:inline-block; padding:14px 32px;
                    color:#111111; font-size:14px; font-weight:700;
                    text-decoration:none; letter-spacing:0.3px;">
            Restablecer contraseña
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 12px; font-size:13px; color:#666666;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:
    </p>
    <p style="margin:0; word-break:break-all;">
      <a href="${resetUrl}"
         style="color:#E8C547; font-size:12px; text-decoration:none;">
        ${resetUrl}
      </a>
    </p>

    <p style="margin:28px 0 0; padding:20px; background-color:#242424;
              border-radius:10px; border-left:3px solid #E8C547;
              font-size:13px; color:#666666; line-height:1.6;">
      ⚠️ Este enlace expira en <strong style="color:#A8A8A8;">1 hora</strong>.
      Si no solicitaste este cambio, ignora este correo — tu contraseña no será modificada.
    </p>
  `;

  return emailTemplate({
    title: "Restablece tu contraseña",
    subtitle: "Seguridad de cuenta",
    content,
  });
}

// ── Template: bienvenida a nuevo usuario ──────────────────────────────────────

export function welcomeEmail(firstName: string, setPasswordUrl: string): string {
  const content = `
    <p style="margin:0 0 20px;">
      ¡Hola <strong style="color:#FAFAFA;">${firstName}</strong>! 👋<br/>
      El equipo de <strong style="color:#E8C547;">3 Street Food</strong> te ha creado
      una cuenta en el panel de administración.
    </p>
    <p style="margin:0 0 28px; color:#A8A8A8; font-size:14px; line-height:1.7;">
      Para activar tu acceso, establece tu contraseña haciendo clic en el botón de abajo.
    </p>

    <!-- Botón CTA -->
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px;">
      <tr>
        <td style="background-color:#E8C547; border-radius:10px;">
          <a href="${setPasswordUrl}"
             style="display:inline-block; padding:14px 32px;
                    color:#111111; font-size:14px; font-weight:700;
                    text-decoration:none; letter-spacing:0.3px;">
            Establecer contraseña
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 12px; font-size:13px; color:#666666;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:
    </p>
    <p style="margin:0 0 28px; word-break:break-all;">
      <a href="${setPasswordUrl}"
         style="color:#E8C547; font-size:12px; text-decoration:none;">
        ${setPasswordUrl}
      </a>
    </p>

    <p style="margin:0; padding:20px; background-color:#242424;
              border-radius:10px; border-left:3px solid #E8C547;
              font-size:13px; color:#666666; line-height:1.6;">
      ⚠️ Este enlace expira en <strong style="color:#A8A8A8;">24 horas</strong>.
      Si no esperabas este correo, ignóralo.
    </p>
  `;

  return emailTemplate({
    title: "Bienvenido al equipo",
    subtitle: "Activación de cuenta",
    content,
  });
}

// ── Template: confirmación de pedido ──────────────────────────────────────────

export type OrderConfirmationParams = {
  orderNumber: number;
  customerName: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  total: number;
  notes?: string;
};

export function orderConfirmationEmail({
  orderNumber,
  customerName,
  items,
  total,
  notes,
}: OrderConfirmationParams): string {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(n);

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid #2E2E2E; color:#FAFAFA; font-size:14px;">
          ${item.name}
          <span style="color:#555555; font-size:12px;"> × ${item.quantity}</span>
        </td>
        <td style="padding:10px 0; border-bottom:1px solid #2E2E2E; color:#A8A8A8;
                   font-size:14px; text-align:right; white-space:nowrap;">
          ${formatCurrency(item.unitPrice * item.quantity)}
        </td>
      </tr>`,
    )
    .join("");

  const content = `
    <p style="margin:0 0 24px;">
      ¡Hola <strong style="color:#FAFAFA;">${customerName}</strong>!
      Tu pedido <strong style="color:#E8C547;">#${orderNumber}</strong> fue recibido
      y está siendo procesado. 🔥
    </p>

    <!-- Tabla de items -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
           style="margin-bottom:8px;">
      <thead>
        <tr>
          <th style="padding:8px 0; border-bottom:1px solid #3A3A3A; color:#555555;
                     font-size:11px; text-align:left; text-transform:uppercase;
                     letter-spacing:1px; font-weight:600;">
            Producto
          </th>
          <th style="padding:8px 0; border-bottom:1px solid #3A3A3A; color:#555555;
                     font-size:11px; text-align:right; text-transform:uppercase;
                     letter-spacing:1px; font-weight:600;">
            Subtotal
          </th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr>
          <td style="padding:14px 0 0; color:#E8C547; font-size:15px; font-weight:700;">
            Total
          </td>
          <td style="padding:14px 0 0; color:#E8C547; font-size:15px; font-weight:700;
                     text-align:right;">
            ${formatCurrency(total)}
          </td>
        </tr>
      </tbody>
    </table>

    ${
      notes
        ? `<p style="margin:24px 0 0; padding:16px; background-color:#242424;
                     border-radius:10px; border-left:3px solid #E8C547;
                     font-size:13px; color:#A8A8A8; line-height:1.6;">
             📝 <strong style="color:#FAFAFA;">Nota:</strong> ${notes}
           </p>`
        : ""
    }
  `;

  return emailTemplate({
    title: `Pedido #${orderNumber} confirmado`,
    subtitle: "Confirmación de pedido",
    content,
  });
}
