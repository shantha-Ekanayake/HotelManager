import nodemailer from "nodemailer";

interface GuestInfo {
  firstName: string;
  lastName: string;
  email?: string | null;
}

interface ReservationInfo {
  confirmationNumber: string;
  arrivalDate: Date | string;
  departureDate: Date | string;
  nights: number;
  totalAmount: string | number;
  depositAmount?: string | number | null;
  depositPaid?: boolean;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "long", day: "numeric" });
}

function buildCheckInEmailHtml(
  guest: GuestInfo,
  reservation: ReservationInfo,
  roomNumber: string,
  propertyName: string,
  propertyContact?: string
): string {
  const guestName = `${guest.firstName} ${guest.lastName}`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Welcome to ${propertyName}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .header { background: #1a3c5e; color: #fff; padding: 32px 40px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 6px 0 0; opacity: 0.85; font-size: 15px; }
    .body { padding: 32px 40px; color: #333; }
    .body h2 { color: #1a3c5e; margin-top: 0; }
    .detail-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .detail-table td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
    .detail-table td:first-child { color: #666; width: 45%; }
    .detail-table td:last-child { font-weight: 600; }
    .highlight { background: #f0f6ff; border-left: 4px solid #1a3c5e; padding: 16px 20px; border-radius: 4px; margin: 20px 0; }
    .footer { background: #f9f9f9; padding: 20px 40px; color: #888; font-size: 13px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${propertyName}!</h1>
      <p>We're delighted to have you as our guest.</p>
    </div>
    <div class="body">
      <h2>Dear ${guestName},</h2>
      <p>Thank you for choosing ${propertyName}. Your check-in has been successfully processed. We hope you enjoy your stay with us.</p>

      <div class="highlight">
        <strong>Confirmation #:</strong> ${reservation.confirmationNumber}
      </div>

      <table class="detail-table">
        <tr><td>Room Number</td><td>${roomNumber}</td></tr>
        <tr><td>Check-In</td><td>${formatDate(reservation.arrivalDate)}</td></tr>
        <tr><td>Check-Out</td><td>${formatDate(reservation.departureDate)}</td></tr>
        <tr><td>Duration</td><td>${reservation.nights} night${reservation.nights !== 1 ? "s" : ""}</td></tr>
        <tr><td>Total Amount</td><td>Rs ${Number(reservation.totalAmount).toFixed(2)}</td></tr>
        ${reservation.depositAmount ? `<tr><td>Deposit Paid</td><td>Rs ${Number(reservation.depositAmount).toFixed(2)}</td></tr>` : ""}
      </table>

      <p>Your folio has been opened and all charges will be tracked for your review at check-out. If you have any questions or special requests, please don't hesitate to contact our front desk.</p>

      ${propertyContact ? `<p><strong>Contact us:</strong> ${propertyContact}</p>` : ""}

      <p>We wish you a wonderful and comfortable stay.</p>
      <p>Warm regards,<br /><strong>${propertyName} Team</strong></p>
    </div>
    <div class="footer">
      This is an automated confirmation email sent on behalf of ${propertyName}. Please do not reply to this email.
    </div>
  </div>
</body>
</html>`;
}

interface FolioInfo {
  charges?: Array<{ description: string; amount: string | number }>;
  payments?: Array<{ paymentMethod: string; amount: string | number; paymentDate: Date | string }>;
}

function buildCheckOutEmailHtml(
  guest: GuestInfo,
  reservation: ReservationInfo,
  folio: FolioInfo,
  propertyName: string
): string {
  const guestName = `${guest.firstName} ${guest.lastName}`;
  const charges = folio.charges || [];
  const payments = folio.payments || [];
  const totalCharges = charges.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = totalCharges - totalPayments;

  const chargeRows = charges.length
    ? charges.map(c => `
        <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#555;">${c.description}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;text-align:right;">Rs ${Number(c.amount).toFixed(2)}</td></tr>`).join("")
    : `<tr><td colspan="2" style="padding:8px 12px;font-size:14px;color:#888;">No charges recorded</td></tr>`;

  const paymentRows = payments.length
    ? payments.map(p => `
        <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#555;">${p.paymentMethod} (${new Date(p.paymentDate).toLocaleDateString()})</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;text-align:right;color:#2e7d32;">-Rs ${Number(p.amount).toFixed(2)}</td></tr>`).join("")
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Departure Receipt – ${propertyName}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .header { background: #1a3c5e; color: #fff; padding: 32px 40px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 6px 0 0; opacity: 0.85; font-size: 15px; }
    .body { padding: 32px 40px; color: #333; }
    .body h2 { color: #1a3c5e; margin-top: 0; }
    .highlight { background: #f0f6ff; border-left: 4px solid #1a3c5e; padding: 16px 20px; border-radius: 4px; margin: 20px 0; }
    .section-title { font-size: 14px; font-weight: 700; color: #1a3c5e; margin: 20px 0 6px; text-transform: uppercase; letter-spacing: 0.05em; }
    .detail-table { width: 100%; border-collapse: collapse; margin: 8px 0 20px; }
    .detail-table td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
    .detail-table td:first-child { color: #666; width: 55%; }
    .detail-table td:last-child { font-weight: 600; text-align: right; }
    .total-row td { font-weight: 700; font-size: 16px; border-top: 2px solid #1a3c5e; border-bottom: none; padding-top: 14px; }
    .balance-settled { color: #2e7d32; }
    .balance-due { color: #c62828; }
    .footer { background: #f9f9f9; padding: 20px 40px; color: #888; font-size: 13px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thank You for Staying with Us</h1>
      <p>${propertyName} – Departure Receipt</p>
    </div>
    <div class="body">
      <h2>Dear ${guestName},</h2>
      <p>We hope you enjoyed your stay at ${propertyName}. Please find your departure summary below. We look forward to welcoming you again soon.</p>

      <div class="highlight">
        <strong>Confirmation #:</strong> ${reservation.confirmationNumber}
      </div>

      <div class="section-title">Stay Details</div>
      <table class="detail-table">
        <tr><td>Check-In</td><td>${formatDate(reservation.arrivalDate)}</td></tr>
        <tr><td>Check-Out</td><td>${formatDate(reservation.departureDate)}</td></tr>
        <tr><td>Duration</td><td>${reservation.nights} night${reservation.nights !== 1 ? "s" : ""}</td></tr>
      </table>

      <div class="section-title">Charges</div>
      <table class="detail-table">
        ${chargeRows}
        <tr><td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:14px;color:#666;">Total Charges</td>
            <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:14px;font-weight:600;text-align:right;">Rs ${totalCharges.toFixed(2)}</td></tr>
      </table>

      ${payments.length ? `
      <div class="section-title">Payments</div>
      <table class="detail-table">
        ${paymentRows}
      </table>` : ""}

      <table class="detail-table">
        <tr class="total-row">
          <td class="${balance <= 0 ? "balance-settled" : "balance-due"}">Balance ${balance <= 0 ? "Settled" : "Due"}</td>
          <td class="${balance <= 0 ? "balance-settled" : "balance-due"}">Rs ${Math.abs(balance).toFixed(2)}${balance <= 0 ? " ✓" : ""}</td>
        </tr>
      </table>

      <p>Thank you for choosing ${propertyName}. We hope to see you again!</p>
      <p>Warm regards,<br /><strong>${propertyName} Team</strong></p>
    </div>
    <div class="footer">
      This is an automated departure receipt sent on behalf of ${propertyName}. Please do not reply to this email.
    </div>
  </div>
</body>
</html>`;
}

export async function sendCheckOutEmail(
  guest: GuestInfo,
  reservation: ReservationInfo,
  folio: FolioInfo,
  propertyName: string
): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;

  if (!smtpHost) {
    // SMTP not configured — log and no-op
    const totalCharges = (folio.charges || []).reduce((s, c) => s + Number(c.amount), 0);
    const totalPayments = (folio.payments || []).reduce((s, p) => s + Number(p.amount), 0);
    console.log("[EMAIL] SMTP not configured. Would have sent check-out receipt to:", guest.email);
    console.log(`[EMAIL] Confirmation: ${reservation.confirmationNumber} | Charges: Rs ${totalCharges.toFixed(2)} | Payments: Rs ${totalPayments.toFixed(2)} | Balance: Rs ${(totalCharges - totalPayments).toFixed(2)} | Property: ${propertyName}`);
    return;
  }

  if (!guest.email) {
    console.log("[EMAIL] Guest has no email address. Skipping check-out receipt for confirmation:", reservation.confirmationNumber);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || ""
        }
      : undefined
  });

  const guestName = `${guest.firstName} ${guest.lastName}`;
  const htmlContent = buildCheckOutEmailHtml(guest, reservation, folio, propertyName);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@hotel.com",
    to: `${guestName} <${guest.email}>`,
    subject: `Your Departure Receipt – ${propertyName} – Confirmation #${reservation.confirmationNumber}`,
    html: htmlContent
  });

  console.log("[EMAIL] Check-out receipt email sent to:", guest.email, "| Confirmation:", reservation.confirmationNumber);
}

export async function sendCheckInEmail(
  guest: GuestInfo,
  reservation: ReservationInfo,
  roomNumber: string,
  propertyName: string,
  propertyContact?: string
): Promise<"sent" | "skipped"> {
  const smtpHost = process.env.SMTP_HOST;

  if (!smtpHost) {
    // SMTP not configured — log and no-op
    console.log("[EMAIL] SMTP not configured. Would have sent check-in email to:", guest.email);
    console.log("[EMAIL] Confirmation:", reservation.confirmationNumber, "| Room:", roomNumber, "| Property:", propertyName);
    return "skipped";
  }

  if (!guest.email) {
    console.log("[EMAIL] Guest has no email address. Skipping check-in email for confirmation:", reservation.confirmationNumber);
    return "skipped";
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || ""
        }
      : undefined
  });

  const guestName = `${guest.firstName} ${guest.lastName}`;
  const htmlContent = buildCheckInEmailHtml(guest, reservation, roomNumber, propertyName, propertyContact);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@hotel.com",
    to: `${guestName} <${guest.email}>`,
    subject: `Welcome to ${propertyName} – Confirmation #${reservation.confirmationNumber}`,
    html: htmlContent
  });

  console.log("[EMAIL] Check-in confirmation email sent to:", guest.email, "| Confirmation:", reservation.confirmationNumber);
  return "sent";
}
