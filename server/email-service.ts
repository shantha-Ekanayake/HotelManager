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

export async function sendCheckInEmail(
  guest: GuestInfo,
  reservation: ReservationInfo,
  roomNumber: string,
  propertyName: string,
  propertyContact?: string
): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;

  if (!smtpHost) {
    // SMTP not configured — log and no-op
    console.log("[EMAIL] SMTP not configured. Would have sent check-in email to:", guest.email);
    console.log("[EMAIL] Confirmation:", reservation.confirmationNumber, "| Room:", roomNumber, "| Property:", propertyName);
    return;
  }

  if (!guest.email) {
    console.log("[EMAIL] Guest has no email address. Skipping check-in email for confirmation:", reservation.confirmationNumber);
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
  const htmlContent = buildCheckInEmailHtml(guest, reservation, roomNumber, propertyName, propertyContact);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@hotel.com",
    to: `${guestName} <${guest.email}>`,
    subject: `Welcome to ${propertyName} – Confirmation #${reservation.confirmationNumber}`,
    html: htmlContent
  });

  console.log("[EMAIL] Check-in confirmation email sent to:", guest.email, "| Confirmation:", reservation.confirmationNumber);
}
