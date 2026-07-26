/** Escape a value for safe HTML interpolation. Returns "—" for null/undefined/empty. */
function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "&#x2014;";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

interface RegistrationCardData {
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  nationality?: string | null;
  roomNumber: string;
  confirmationNumber: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  rateAmount: string | number;
  depositAmount?: string | number | null;
  depositPaid?: boolean;
  signature?: string | null;
  propertyName: string;
  propertyAddress?: string;
  propertyPhone?: string;
  printedBy?: string;
  printedAt?: string;
}

export function printRegistrationCard(data: RegistrationCardData): void {
  const {
    guestName,
    guestEmail,
    guestPhone,
    idType,
    idNumber,
    nationality,
    roomNumber,
    confirmationNumber,
    checkInDate,
    checkOutDate,
    nights,
    rateAmount,
    depositAmount,
    depositPaid,
    signature,
    propertyName,
    propertyAddress,
    propertyPhone,
    printedBy,
    printedAt
  } = data;

  const formatCurrency = (val: string | number | null | undefined): string =>
    val !== null && val !== undefined ? `Rs ${Number(val).toFixed(2)}` : "—";

  // Signature is a data: URL produced by canvas.toDataURL("image/png") — a base64
  // blob. It is not user-supplied text and cannot contain HTML/JS. Use it directly
  // as an img src. All other dynamic values go through esc().
  const signatureHtml = signature
    ? `<img src="${signature}" class="signature-img" alt="Guest Signature" />`
    : `<div class="signature-line"></div>`;

  const propertyAddressHtml = propertyAddress
    ? `<div class="address">${esc(propertyAddress)}</div>`
    : "";
  const propertyPhoneHtml = propertyPhone
    ? `<div class="address">Tel: ${esc(propertyPhone)}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Registration Card &#x2013; ${esc(confirmationNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Georgia", serif; color: #111; background: #fff; font-size: 13px; }
    .page { max-width: 700px; margin: 0 auto; padding: 30px 40px; }
    .header { text-align: center; border-bottom: 3px double #1a3c5e; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { font-size: 22px; color: #1a3c5e; letter-spacing: 1px; }
    .header .address { font-size: 12px; color: #666; margin-top: 6px; }
    .card-title { text-align: center; font-size: 15px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: #1a3c5e; margin-bottom: 20px; }
    .section { margin-bottom: 18px; }
    .section-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #1a3c5e; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px 16px; }
    .field-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .field-value { font-size: 13px; font-weight: 600; border-bottom: 1px solid #ccc; padding-bottom: 3px; min-height: 20px; }
    .confirmation-box { text-align: center; background: #f0f6ff; border: 2px solid #1a3c5e; border-radius: 6px; padding: 10px 20px; margin-bottom: 20px; }
    .confirmation-box .conf-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #555; }
    .confirmation-box .conf-num { font-size: 20px; font-weight: bold; color: #1a3c5e; letter-spacing: 2px; }
    .signature-section { margin-top: 24px; }
    .signature-img { max-height: 80px; border-bottom: 1px solid #333; display: block; margin-bottom: 4px; }
    .signature-line { border-bottom: 1px solid #333; height: 60px; margin-bottom: 4px; }
    .signature-caption { font-size: 10px; color: #777; }
    .footer { margin-top: 28px; border-top: 1px solid #ddd; padding-top: 12px; display: flex; justify-content: space-between; font-size: 10px; color: #999; }
    .terms { margin-top: 16px; font-size: 10px; color: #777; line-height: 1.6; }
    @media print {
      body { background: #fff; }
      .page { padding: 20px 28px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>${esc(propertyName)}</h1>
      ${propertyAddressHtml}
      ${propertyPhoneHtml}
    </div>

    <div class="card-title">Guest Registration Card</div>

    <div class="confirmation-box">
      <div class="conf-label">Confirmation Number</div>
      <div class="conf-num">${esc(confirmationNumber)}</div>
    </div>

    <div class="section">
      <div class="section-label">Guest Information</div>
      <div class="grid">
        <div class="field">
          <div class="field-label">Full Name</div>
          <div class="field-value">${esc(guestName)}</div>
        </div>
        <div class="field">
          <div class="field-label">Nationality</div>
          <div class="field-value">${esc(nationality)}</div>
        </div>
        <div class="field">
          <div class="field-label">Email</div>
          <div class="field-value">${esc(guestEmail)}</div>
        </div>
        <div class="field">
          <div class="field-label">Phone</div>
          <div class="field-value">${esc(guestPhone)}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-label">Identity Verification</div>
      <div class="grid">
        <div class="field">
          <div class="field-label">ID Type</div>
          <div class="field-value">${esc(idType)}</div>
        </div>
        <div class="field">
          <div class="field-label">ID Number</div>
          <div class="field-value">${esc(idNumber)}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-label">Reservation Details</div>
      <div class="grid-3">
        <div class="field">
          <div class="field-label">Room Number</div>
          <div class="field-value">${esc(roomNumber)}</div>
        </div>
        <div class="field">
          <div class="field-label">Check-In</div>
          <div class="field-value">${esc(checkInDate)}</div>
        </div>
        <div class="field">
          <div class="field-label">Check-Out</div>
          <div class="field-value">${esc(checkOutDate)}</div>
        </div>
        <div class="field">
          <div class="field-label">Nights</div>
          <div class="field-value">${esc(nights)}</div>
        </div>
        <div class="field">
          <div class="field-label">Room Rate</div>
          <div class="field-value">${esc(formatCurrency(rateAmount))}</div>
        </div>
        <div class="field">
          <div class="field-label">Deposit Paid</div>
          <div class="field-value">${esc(depositPaid ? formatCurrency(depositAmount) : "—")}</div>
        </div>
      </div>
    </div>

    <div class="signature-section">
      <div class="section-label">Guest Signature</div>
      ${signatureHtml}
      <div class="signature-caption">I agree to comply with the hotel&#x27;s terms and conditions. I authorise the hotel to charge my account for all expenses incurred during my stay.</div>
    </div>

    <div class="terms">
      <strong>Terms &amp; Conditions:</strong> Check-out time is 12:00 noon. Late check-outs are subject to additional charges. The hotel is not responsible for valuables left in rooms. Room rates are exclusive of applicable taxes and service charges.
    </div>

    <div class="footer">
      <span>Printed by: ${esc(printedBy || "Front Desk")}</span>
      <span>Date: ${esc(printedAt || new Date().toLocaleString())}</span>
    </div>
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=800,height=900");
  if (!printWindow) {
    alert("Please allow pop-ups to print the registration card.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
