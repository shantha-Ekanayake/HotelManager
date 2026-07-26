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

interface ReceiptCharge {
  id: string | number;
  description: string;
  amount: string | number;
}

interface ReceiptPayment {
  id: string | number;
  paymentMethod: string;
  paymentDate: string | Date;
  amount: string | number;
}

export interface ReceiptData {
  guestName: string;
  guestEmail?: string | null;
  confirmationNumber: string;
  roomNumber: string | number;
  checkInDate: string;
  checkOutDate: string;
  nights?: number | null;
  charges: ReceiptCharge[];
  payments: ReceiptPayment[];
  totalCharges: number;
  totalPayments: number;
  balance: number;
  propertyName: string;
  propertyAddress?: string | null;
  propertyPhone?: string | null;
  printedBy?: string | null;
  printedAt?: string | null;
}

export function printReceipt(data: ReceiptData): void {
  const formatCurrency = (val: string | number | null | undefined): string =>
    val !== null && val !== undefined ? `Rs ${Number(val).toFixed(2)}` : "&#x2014;";

  const chargesRows = data.charges.length > 0
    ? data.charges
        .map(
          (c) =>
            `<tr>
              <td>${esc(c.description)}</td>
              <td class="amount">${formatCurrency(c.amount)}</td>
            </tr>`
        )
        .join("")
    : `<tr><td colspan="2" class="no-items">No charges recorded</td></tr>`;

  const paymentsRows = data.payments.length > 0
    ? data.payments
        .map((p) => {
          const date =
            p.paymentDate instanceof Date
              ? p.paymentDate.toLocaleDateString()
              : new Date(p.paymentDate).toLocaleDateString();
          return `<tr class="payment-row">
              <td>${esc(p.paymentMethod)} <span class="date">(${esc(date)})</span></td>
              <td class="amount credit">&minus;${formatCurrency(p.amount)}</td>
            </tr>`;
        })
        .join("")
    : `<tr><td colspan="2" class="no-items">No payments recorded</td></tr>`;

  const balanceClass = data.balance > 0 ? "balance-due" : "balance-clear";
  const balanceLabel = data.balance > 0 ? "Balance Due" : "Balance";

  const propertyAddressHtml = data.propertyAddress
    ? `<div class="address">${esc(data.propertyAddress)}</div>`
    : "";
  const propertyPhoneHtml = data.propertyPhone
    ? `<div class="address">Tel: ${esc(data.propertyPhone)}</div>`
    : "";
  const nightsHtml =
    data.nights != null
      ? `<div class="field">
           <div class="field-label">Nights</div>
           <div class="field-value">${esc(data.nights)}</div>
         </div>`
      : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt &#x2013; ${esc(data.confirmationNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Georgia", serif; color: #111; background: #fff; font-size: 13px; }
    .page { max-width: 700px; margin: 0 auto; padding: 30px 40px; }

    /* Header */
    .header { text-align: center; border-bottom: 3px double #1a3c5e; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { font-size: 22px; color: #1a3c5e; letter-spacing: 1px; }
    .header .address { font-size: 12px; color: #666; margin-top: 6px; }

    .doc-title { text-align: center; font-size: 15px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: #1a3c5e; margin-bottom: 20px; }

    /* Confirmation box */
    .confirmation-box { text-align: center; background: #f0f6ff; border: 2px solid #1a3c5e; border-radius: 6px; padding: 10px 20px; margin-bottom: 20px; }
    .confirmation-box .conf-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #555; }
    .confirmation-box .conf-num { font-size: 20px; font-weight: bold; color: #1a3c5e; letter-spacing: 2px; }

    /* Sections */
    .section { margin-bottom: 18px; }
    .section-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #1a3c5e; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px 16px; }
    .field-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .field-value { font-size: 13px; font-weight: 600; border-bottom: 1px solid #ccc; padding-bottom: 3px; min-height: 20px; }

    /* Folio table */
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { border-bottom: 2px solid #1a3c5e; }
    thead th { padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #1a3c5e; }
    thead th.amount { text-align: right; }
    tbody tr { border-bottom: 1px solid #eee; }
    tbody td { padding: 6px 8px; vertical-align: top; }
    tbody td.amount { text-align: right; white-space: nowrap; }
    tbody td.credit { color: #166534; }
    .date { font-size: 11px; color: #666; }
    .no-items { color: #999; font-style: italic; padding: 8px; }
    .payment-row td { color: #166534; }

    /* Totals */
    .totals { margin-top: 4px; border-top: 2px solid #1a3c5e; }
    .totals td { padding: 6px 8px; font-weight: 600; }
    .totals td.amount { text-align: right; }
    .totals .balance-due td { font-size: 15px; color: #dc2626; border-top: 2px solid #dc2626; }
    .totals .balance-clear td { font-size: 15px; color: #166534; border-top: 2px solid #166534; }

    /* Footer */
    .footer { margin-top: 28px; border-top: 1px solid #ddd; padding-top: 12px; display: flex; justify-content: space-between; font-size: 10px; color: #999; }
    .thank-you { text-align: center; margin-top: 20px; font-size: 12px; color: #555; font-style: italic; }

    @media print {
      body { background: #fff; }
      .page { padding: 20px 28px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>${esc(data.propertyName)}</h1>
      ${propertyAddressHtml}
      ${propertyPhoneHtml}
    </div>

    <div class="doc-title">Departure Receipt</div>

    <div class="confirmation-box">
      <div class="conf-label">Confirmation Number</div>
      <div class="conf-num">${esc(data.confirmationNumber)}</div>
    </div>

    <div class="section">
      <div class="section-label">Guest Information</div>
      <div class="grid">
        <div class="field">
          <div class="field-label">Guest Name</div>
          <div class="field-value">${esc(data.guestName)}</div>
        </div>
        <div class="field">
          <div class="field-label">Email</div>
          <div class="field-value">${esc(data.guestEmail)}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-label">Stay Details</div>
      <div class="grid-3">
        <div class="field">
          <div class="field-label">Room</div>
          <div class="field-value">${esc(data.roomNumber)}</div>
        </div>
        <div class="field">
          <div class="field-label">Check-In</div>
          <div class="field-value">${esc(data.checkInDate)}</div>
        </div>
        <div class="field">
          <div class="field-label">Check-Out</div>
          <div class="field-value">${esc(data.checkOutDate)}</div>
        </div>
        ${nightsHtml}
      </div>
    </div>

    <div class="section">
      <div class="section-label">Charges</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${chargesRows}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-label">Payments</div>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${paymentsRows}
        </tbody>
      </table>
    </div>

    <table class="totals">
      <tbody>
        <tr>
          <td>Total Charges</td>
          <td class="amount">${formatCurrency(data.totalCharges)}</td>
        </tr>
        <tr>
          <td>Total Payments</td>
          <td class="amount credit">&minus;${formatCurrency(data.totalPayments)}</td>
        </tr>
        <tr class="${balanceClass}">
          <td>${esc(balanceLabel)}</td>
          <td class="amount">${formatCurrency(data.balance)}</td>
        </tr>
      </tbody>
    </table>

    <div class="thank-you">Thank you for staying with us. We hope to welcome you again soon.</div>

    <div class="footer">
      <span>Printed by: ${esc(data.printedBy || "Front Desk")}</span>
      <span>Date: ${esc(data.printedAt || new Date().toLocaleString())}</span>
    </div>
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=800,height=900");
  if (!printWindow) {
    alert("Please allow pop-ups to print the receipt.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
