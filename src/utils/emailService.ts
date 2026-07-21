import { jsPDF } from "jspdf";
import * as fs from "fs";
import * as path from "path";

// Define Email Types and Event Names
export type EmailType =
  | "Payment_Submitted"
  | "Payment_Approved_30"
  | "Payment_Approved_50"
  | "Payment_Approved_100"
  | "Payment_Rejected"
  | "Project_Status_Update"
  | "Refund_Initiated"
  | "Refund_Completed"
  | "Booking_Confirmation"
  | "Admin_Alert"
  | "Maint_Subscription_Activated"
  | "Maint_Payment_Success"
  | "Maint_Renewal_Reminder"
  | "Maint_Payment_Failed"
  | "Maint_Payment_Retried"
  | "Maint_Subscription_Cancelled"
  | "Maint_Subscription_Paused"
  | "Maint_Subscription_Resumed"
  | "Maint_Plan_Upgraded"
  | "Maint_Plan_Downgraded";

export interface EmailParams {
  to: string;
  clientName: string;
  projectName: string;
  invoiceNumber?: string;
  amount?: number;
  milestoneLabel?: string;
  milestoneId?: string;
  paymentId?: string;
  dateTime?: string;
  status?: string;
  reason?: string;
  refundId?: string;
  remainingBalance?: number;
  bookingId?: string;
  bookingDate?: string;
  bookingTime?: string;
  bookingService?: string;
  bookingTeam?: string;
  planName?: string;
  nextRenewalDate?: string;
}

// Global cache for duplicate checks in memory
const processedEvents = new Set<string>();

/**
 * Build a responsive, highly polished modern HTML email template
 */
function buildHtmlTemplate(
  title: string,
  preheader: string,
  bodyHtml: string,
  statusBadgeText: string,
  badgeType: "success" | "warning" | "info" | "error"
): string {
  let badgeBgColor = "rgba(59, 130, 246, 0.1)";
  let badgeTextColor = "#3b82f6";
  let badgeBorderColor = "rgba(59, 130, 246, 0.3)";

  if (badgeType === "success") {
    badgeBgColor = "rgba(16, 185, 129, 0.1)";
    badgeTextColor = "#10b981";
    badgeBorderColor = "rgba(16, 185, 129, 0.3)";
  } else if (badgeType === "warning") {
    badgeBgColor = "rgba(245, 158, 11, 0.1)";
    badgeTextColor = "#f59e0b";
    badgeBorderColor = "rgba(245, 158, 11, 0.3)";
  } else if (badgeType === "error") {
    badgeBgColor = "rgba(239, 68, 68, 0.1)";
    badgeTextColor = "#ef4444";
    badgeBorderColor = "rgba(239, 68, 68, 0.3)";
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      background-color: #030712;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: none;
      -ms-text-size-adjust: none;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 16px !important;
      }
    }
  </style>
</head>
<body style="background-color: #030712; padding: 40px 0; margin: 0;">
  <div class="container" style="max-width: 600px; margin: 0 auto; padding: 0 20px; box-sizing: border-box;">
    <!-- Main Card -->
    <div style="background-color: #0b0f19; border: 1px solid #1f2937; border-radius: 16px; padding: 32px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
      
      <!-- Brand Header -->
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #1f2937;">
        <h1 style="font-family: monospace; color: #ffffff; letter-spacing: 4px; font-size: 24px; margin: 0; font-weight: bold;">ARCADIA</h1>
        <p style="font-size: 10px; color: #3b82f6; text-transform: uppercase; letter-spacing: 3px; margin: 6px 0 0 0;">Co-Dev Hub • Transactional Mail</p>
      </div>

      <!-- Optional Preheader Text (Visual Only) -->
      <p style="display: none; font-size: 0; color: transparent; line-height: 0; max-height: 0; mso-hide: all;">${preheader}</p>

      <!-- Status Badge -->
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="background-color: ${badgeBgColor}; color: ${badgeTextColor}; border: 1px solid ${badgeBorderColor}; font-size: 11px; font-weight: bold; padding: 6px 14px; border-radius: 9999px; font-family: monospace; letter-spacing: 1.5px;">
          ${statusBadgeText.toUpperCase()}
        </span>
      </div>

      <!-- Main Body -->
      <div style="color: #d1d5db; font-size: 14px; line-height: 1.6; text-align: left;">
        ${bodyHtml}
      </div>

      <!-- Contact support and fineprint -->
      <div style="text-align: center; margin-top: 36px; padding-top: 24px; border-top: 1px solid #1f2937; font-size: 11px; color: #6b7280; line-height: 1.6;">
        <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px;"><strong>Arcadia Digital Solutions Inc.</strong></p>
        <p style="margin: 0 0 4px 0;">E-mail: support@arcadia.digital • Phone: +91 8328218878</p>
        <p style="margin: 0 0 12px 0;">Web: <a href="https://www.arcadia.digital" style="color: #3b82f6; text-decoration: none;">www.arcadia.digital</a></p>
        <p style="margin: 0 0 4px 0;">&copy; 2026 Arcadia Co-Dev Hub. All rights reserved.</p>
        <p style="margin: 0; font-size: 10px; color: #4b5563;">This email contains confidential commercial transaction data and was issued automatically after backend validation.</p>
      </div>

    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate a server-side base64 PDF of an invoice
 */
export function generateServerInvoicePDF(params: EmailParams): string {
  const doc = new jsPDF("p", "mm", "a4");

  const formattedDate = params.dateTime
    ? new Date(params.dateTime).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

  // Top Dark Accent Header Band
  doc.setFillColor(11, 15, 25);
  doc.rect(0, 0, 210, 45, "F");

  // Neon Blue Line below Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 45, 210, 3, "F");

  // Arcadia Logo Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text("ARCADIA", 15, 22);

  // Logo Accent Dot
  doc.setFillColor(59, 130, 246);
  doc.circle(71, 18, 1.5, "F");

  // Arcadia contact on top right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(156, 163, 175);
  doc.text("ARCADIA DIGITAL SOLUTIONS INC.", 130, 16);
  doc.text("E-mail: support@arcadia.digital", 130, 21);
  doc.text("Web: www.arcadia.digital", 130, 26);
  doc.text("Contact: +91 8328218878", 130, 31);

  // Invoice Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(11, 15, 25);
  doc.text("MILESTONE INVOICE", 15, 68);

  // Status Badge (Paid)
  doc.setFillColor(220, 252, 231);
  doc.rect(145, 58, 50, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(21, 128, 61);
  doc.text("MILESTONE PAID", 149, 64.5);

  // Invoice details grid
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Invoice Number:", 15, 84);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(params.invoiceNumber || "INV-2026-XXXX", 50, 84);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Invoice Date:", 15, 90);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(formattedDate, 50, 90);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Payment ID:", 15, 96);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(params.paymentId || "N/A", 50, 96);

  // Client info (Bill To)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(11, 15, 25);
  doc.text("BILL TO:", 115, 84);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(params.clientName, 115, 90);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(params.projectName, 115, 96);
  doc.text(params.to, 115, 102);

  // Separator Line
  doc.setFillColor(226, 232, 240);
  doc.rect(15, 110, 180, 0.5, "F");

  // Table Headers
  const tableY = 120;
  doc.setFillColor(248, 250, 252);
  doc.rect(15, tableY, 180, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("SERVICE / MILESTONE DESCRIPTION", 20, tableY + 6.5);
  doc.text("QTY", 130, tableY + 6.5);
  doc.text("RATE", 148, tableY + 6.5);
  doc.text("TOTAL", 175, tableY + 6.5);

  // Separator below headers
  doc.setFillColor(226, 232, 240);
  doc.rect(15, tableY + 10, 180, 0.5, "F");

  // Table Row
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  
  const descText = `${params.projectName} [${params.milestoneLabel || "Milestone"}]`;
  doc.text(descText, 20, tableY + 17);
  doc.text("1", 132, tableY + 17);

  const billingAmount = params.amount || 0;
  const formattedBudget = "INR " + billingAmount.toLocaleString("en-IN");
  
  doc.text(formattedBudget, 148, tableY + 17);
  doc.text(formattedBudget, 175, tableY + 17);

  // Separator below row
  doc.rect(15, tableY + 22, 180, 0.5, "F");

  // Totals Area
  const totalsY = tableY + 30;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal:", 130, totalsY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(formattedBudget, 168, totalsY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(11, 15, 25);
  doc.text("Total Paid:", 130, totalsY + 10);
  doc.setFontSize(11);
  doc.setTextColor(59, 130, 246);
  doc.text(formattedBudget, 168, totalsY + 10);

  // Bottom Notes & Stamp
  const notesY = 200;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(11, 15, 25);
  doc.text("PAYMENT CONFIRMATION TERMS", 15, notesY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("1. This is a digitally generated invoice released after manual admin review.", 15, notesY + 5.5);
  doc.text("2. Payment confirmed securely through Razorpay Integration.", 15, notesY + 10.5);
  doc.text("3. Thank you for building your system with ARCADIA.", 15, notesY + 15.5);

  // ARCADIA PVT LTD Digital Signed Stamp
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.6);
  doc.setFillColor(239, 246, 255);
  doc.rect(144, notesY + 2, 52, 22, "FD");

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.3);
  doc.rect(146, notesY + 4, 48, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(29, 78, 216);
  doc.text("ARCADIA STUDIO PVT LTD", 149, notesY + 8);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(22, 163, 74);
  doc.text("● DIGITALLY APPROVED & SIGNED", 148.5, notesY + 12.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`VERIFICATION REF: ARC-${params.paymentId ? params.paymentId.slice(0, 8).toUpperCase() : "VERIFIED"}`, 149, notesY + 16);

  // Footer banner
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 280, 210, 17, "F");
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 280, 210, 0.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("ARCADIA DIGITAL SOLUTIONS • SECURE TRANSACTION LEDGER", 15, 290);

  // Output as standard Data URI and grab the Base64 section
  const pdfOutput = doc.output("datauristring");
  const base64 = pdfOutput.split(",")[1];
  return base64;
}

/**
 * Main function to trigger automated transactional email notifications
 */
export async function triggerEmail(
  eventType: EmailType,
  params: EmailParams,
  adminDbInstance?: any,
  saveDBCallback?: (filename: string, data: any) => void
): Promise<boolean> {
  // 1. Prevent duplicate email transmissions
  const dedupeKey = `${params.to}_${eventType}_${params.paymentId || params.milestoneId || params.bookingId || "na"}`;
  if (processedEvents.has(dedupeKey)) {
    console.log(`[Email Service] Duplicate email dispatch prevented for: ${dedupeKey}`);
    return true;
  }
  processedEvents.add(dedupeKey);

  // 2. Determine Subject, Preheader, and HTML template depending on the trigger event type
  let subject = "";
  let preheader = "";
  let bodyHtml = "";
  let badgeText = "";
  let badgeType: "success" | "warning" | "info" | "error" = "info";
  let hasInvoiceAttachment = false;

  const formattedAmount = params.amount
    ? `₹${params.amount.toLocaleString("en-IN")}`
    : "N/A";
  const formattedRemaining = params.remainingBalance !== undefined
    ? `₹${params.remainingBalance.toLocaleString("en-IN")}`
    : "N/A";
  const formattedDate = params.dateTime
    ? new Date(params.dateTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  switch (eventType) {
    case "Payment_Submitted":
      subject = `Payment Received – Under Review`;
      preheader = `We have received your payment for ${params.projectName} and it is currently undergoing admin review.`;
      badgeText = `Awaiting Review`;
      badgeType = "warning";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>Thank you for making your payment. We have successfully recorded your transaction. It has been verified cryptographically and is currently undergoing administrative review by our financial team.</p>
        
        <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
          <h3 style="color: #ffffff; font-size: 15px; margin: 0 0 14px 0; font-family: monospace; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">TRANSACTION DETAILS</h3>
          <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
            <tr><td style="padding: 6px 0;">Project Name:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.projectName}</td></tr>
            <tr><td style="padding: 6px 0;">Milestone:</td><td style="color: #ffffff; text-align: right;">${params.milestoneLabel || "N/A"}</td></tr>
            <tr><td style="padding: 6px 0;">Payment Amount:</td><td style="color: #10b981; text-align: right; font-weight: bold;">${formattedAmount}</td></tr>
            <tr><td style="padding: 6px 0;">Razorpay Payment ID:</td><td style="color: #ffffff; text-align: right; font-family: monospace; font-size: 11px;">${params.paymentId || "N/A"}</td></tr>
            <tr><td style="padding: 6px 0;">Date & Time:</td><td style="color: #ffffff; text-align: right;">${formattedDate}</td></tr>
            <tr><td style="padding: 6px 0;">Review Status:</td><td style="color: #f59e0b; text-align: right; font-weight: bold;">Pending Admin Approval</td></tr>
          </table>
        </div>

        <p>Our administrators are reviewing your submission. Another automated email will be sent to you immediately once your payment is approved and the invoice becomes downloadable.</p>
        <p>No further action is required from your side at this stage.</p>
      `;
      break;

    case "Payment_Approved_30":
      subject = `30% Payment Approved – Your Project Has Started`;
      preheader = `Your 30% advance payment has been approved and your project is officially underway!`;
      badgeText = `30% Paid – Initiated`;
      badgeType = "success";
      hasInvoiceAttachment = true;
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>Great news! Your kick-off milestone advance payment of <strong>${formattedAmount}</strong> (30%) has been officially approved by our administration!</p>
        
        <p>Your project <strong>${params.projectName}</strong> has officially transitioned to: <strong>Payment Approved – Project Initiated</strong>. Our engineering team is starting the structural planning and design phases immediately.</p>
        
        <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
          <h3 style="color: #ffffff; font-size: 15px; margin: 0 0 14px 0; font-family: monospace; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">BILLING & STATUS</h3>
          <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
            <tr><td style="padding: 6px 0;">Project Name:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.projectName}</td></tr>
            <tr><td style="padding: 6px 0;">Approved Amount:</td><td style="color: #10b981; text-align: right; font-weight: bold;">${formattedAmount}</td></tr>
            <tr><td style="padding: 6px 0;">Milestone Stage:</td><td style="color: #ffffff; text-align: right;">Kickoff Booking Deposit (30%)</td></tr>
            <tr><td style="padding: 6px 0;">Invoice Number:</td><td style="color: #ffffff; text-align: right; font-family: monospace;">${params.invoiceNumber || "N/A"}</td></tr>
            <tr><td style="padding: 6px 0;">Remaining Balance:</td><td style="color: #f3f4f6; text-align: right; font-weight: bold;">${formattedRemaining}</td></tr>
            <tr><td style="padding: 6px 0;">Current Project Status:</td><td style="color: #3b82f6; text-align: right; font-weight: bold;">Initial Payment Received</td></tr>
            <tr><td style="padding: 6px 0;">Next Scheduled Milestone:</td><td style="color: #3b82f6; text-align: right;">Mid-Project Development (50%)</td></tr>
          </table>
        </div>

        <p>A digitally signed PDF Invoice is attached to this email. You can also view or download all project assets and invoices inside your Arcadia client portal.</p>
        <p><strong>Next Step:</strong> The 50% milestone billing request will automatically activate as development progresses through the schedule.</p>
        <p>Thank you for partnering with us!</p>
      `;
      break;

    case "Payment_Approved_50":
      subject = `Project In Progress – 50% Payment Approved`;
      preheader = `Your 50% milestone payment has been approved. Development is actively moving forward!`;
      badgeText = `80% Paid – In Progress`;
      badgeType = "success";
      hasInvoiceAttachment = true;
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>We are writing to confirm that your mid-project development milestone payment (50%) has been successfully approved by our administration!</p>
        
        <p>Your project status is now officially updated to <strong>In Progress</strong>. Development of core modules and features is running actively, and we are working towards our final staging reviews.</p>
        
        <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
          <h3 style="color: #ffffff; font-size: 15px; margin: 0 0 14px 0; font-family: monospace; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">BILLING & STATUS</h3>
          <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
            <tr><td style="padding: 6px 0;">Project Name:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.projectName}</td></tr>
            <tr><td style="padding: 6px 0;">Approved Amount:</td><td style="color: #10b981; text-align: right; font-weight: bold;">${formattedAmount}</td></tr>
            <tr><td style="padding: 6px 0;">Milestone Stage:</td><td style="color: #ffffff; text-align: right;">Mid-Project Development (50%)</td></tr>
            <tr><td style="padding: 6px 0;">Invoice Number:</td><td style="color: #ffffff; text-align: right; font-family: monospace;">${params.invoiceNumber || "N/A"}</td></tr>
            <tr><td style="padding: 6px 0;">Total Progress Paid:</td><td style="color: #10b981; text-align: right; font-weight: bold;">80% Approved</td></tr>
            <tr><td style="padding: 6px 0;">Remaining Balance:</td><td style="color: #f3f4f6; text-align: right; font-weight: bold;">${formattedRemaining}</td></tr>
          </table>
        </div>

        <p>The PDF invoice for this completed payment is attached. You will receive a final payment request (20%) when the system enters the handover and delivery stage.</p>
        <p>No manual actions are required at this time. We will keep you updated with continuous progress!</p>
      `;
      break;

    case "Payment_Approved_100":
      subject = `Project Completed – Final Payment Confirmed`;
      preheader = `Congratulations! Your final payment has been approved, sealing project completion!`;
      badgeText = `100% Paid – Completed`;
      badgeType = "success";
      hasInvoiceAttachment = true;
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p><strong>Congratulations!</strong> We have received and approved your final milestone payment of <strong>${formattedAmount}</strong>. Your project budget has now been completely satisfied!</p>
        
        <p>Your project <strong>${params.projectName}</strong> is officially marked as <strong>Completed</strong>. All deliverables are compiled and prepared for launch!</p>
        
        <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
          <h3 style="color: #ffffff; font-size: 15px; margin: 0 0 14px 0; font-family: monospace; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">COMPLETION SUMMARY</h3>
          <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
            <tr><td style="padding: 6px 0;">Project Name:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.projectName}</td></tr>
            <tr><td style="padding: 6px 0;">Final Payment:</td><td style="color: #10b981; text-align: right; font-weight: bold;">${formattedAmount}</td></tr>
            <tr><td style="padding: 6px 0;">Invoice Number:</td><td style="color: #ffffff; text-align: right; font-family: monospace;">${params.invoiceNumber || "N/A"}</td></tr>
            <tr><td style="padding: 6px 0;">Remaining Balance:</td><td style="color: #10b981; text-align: right; font-weight: bold;">₹0.00 (Fully Paid)</td></tr>
            <tr><td style="padding: 6px 0;">Project Status:</td><td style="color: #10b981; text-align: right; font-weight: bold;">Completed & Delivered</td></tr>
          </table>
        </div>

        <p>Your complete final invoice is attached. All system logs, software directories, and dynamic credentials can now be safely accessed inside your digital console.</p>
        <p>Thank you for choosing Arcadia Co-Dev Hub! If you require any post-launch support, please contact us at support@arcadia.digital.</p>
      `;
      break;

    case "Payment_Rejected":
      subject = `Payment Requires Attention`;
      preheader = `We encountered an issue during the administrative review of your payment.`;
      badgeText = `Review Failed`;
      badgeType = "error";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>We are writing to notify you that our administrative team encountered an issue while reviewing your payment of <strong>${formattedAmount}</strong>.</p>
        
        <p><strong>Reason for Rejection:</strong><br>
        <span style="color: #ef4444; font-weight: bold; background-color: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 10px; display: block; margin: 10px 0; border-radius: 4px;">
          ${params.reason || "Unable to trace transaction on banking server. Please check transaction reference or resubmit."}
        </span></p>

        <p><strong>Instructions for Resubmission:</strong></p>
        <ol style="margin-left: 20px; padding: 0; color: #9ca3af;">
          <li style="margin-bottom: 6px;">Access your Arcadia client portal.</li>
          <li style="margin-bottom: 6px;">Locate the milestone labeled <strong>${params.milestoneLabel || "Milestone"}</strong>.</li>
          <li style="margin-bottom: 6px;">Ensure that your Razorpay transaction was fully processed. If necessary, please upload the payment receipt or transaction ID and resubmit for approval.</li>
        </ol>

        <p>If you believe this rejection was a system error, please contact our support desk directly at support@arcadia.digital or call +91 8328218878 immediately.</p>
      `;
      break;

    case "Project_Status_Update":
      subject = `Project Status Update: ${params.status}`;
      preheader = `The project status for ${params.projectName} has been updated to ${params.status}.`;
      badgeText = `${params.status}`;
      badgeType = "info";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>This is an automated operational notification regarding your active software engineering brief <strong>${params.projectName}</strong>.</p>
        
        <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
          <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
            <tr><td style="padding: 6px 0;">Project Name:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.projectName}</td></tr>
            <tr><td style="padding: 6px 0; width: 40%;">Updated Stage:</td><td style="color: #3b82f6; text-align: right; font-weight: bold; font-size: 14px;">${params.status}</td></tr>
            <tr><td style="padding: 6px 0;">Update Timestamp:</td><td style="color: #ffffff; text-align: right;">${formattedDate}</td></tr>
          </table>
        </div>

        <p><strong>What this stage means:</strong><br>
        ${getProgressExplainer(params.status || "Pending")}</p>

        <p>You can monitor live progress, view designs, or collaborate with developers in the Arcadia portal.</p>
      `;
      break;

    case "Refund_Initiated":
      subject = `Refund Initiated`;
      preheader = `An administrative refund of ${formattedAmount} has been initiated for your project.`;
      badgeText = `Refund Processing`;
      badgeType = "warning";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>This notification is to inform you that an administrative refund of <strong>${formattedAmount}</strong> has been successfully initiated on our banking gateway.</p>
        
        <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
          <h3 style="color: #ffffff; font-size: 14px; margin: 0 0 12px 0; font-family: monospace; border-bottom: 1px solid #1f2937; padding-bottom: 6px;">REFUND PROTOCOL DETAILS</h3>
          <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
            <tr><td style="padding: 6px 0;">Project Name:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.projectName}</td></tr>
            <tr><td style="padding: 6px 0;">Refund Amount:</td><td style="color: #ef4444; text-align: right; font-weight: bold;">${formattedAmount}</td></tr>
            <tr><td style="padding: 6px 0;">Reason:</td><td style="color: #ffffff; text-align: right;">${params.reason || "Administrative correction"}</td></tr>
            <tr><td style="padding: 6px 0;">Estimated Timing:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">5 to 7 working days</td></tr>
            <tr><td style="padding: 6px 0;">Refund Reference:</td><td style="color: #ffffff; text-align: right; font-family: monospace;">${params.refundId || "N/A"}</td></tr>
          </table>
        </div>

        <p>Please note that depending on your financial institution, the funds will typically show on your original payment source statement within 5-7 working days.</p>
        <p>If you have any questions regarding this action, please reach out to our accounts department at support@arcadia.digital.</p>
      `;
      break;

    case "Refund_Completed":
      subject = `Refund Completed Successfully`;
      preheader = `Your refund of ${formattedAmount} has been successfully processed and completed.`;
      badgeText = `Refund Completed`;
      badgeType = "success";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>We are writing to confirm that the refund of <strong>${formattedAmount}</strong> has been successfully transacted and finalized by our gateway.</p>
        
        <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
          <h3 style="color: #ffffff; font-size: 14px; margin: 0 0 12px 0; font-family: monospace; border-bottom: 1px solid #1f2937; padding-bottom: 6px;">COMPLETED LEDGER</h3>
          <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
            <tr><td style="padding: 6px 0;">Project Name:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.projectName}</td></tr>
            <tr><td style="padding: 6px 0;">Original Payment:</td><td style="color: #ffffff; text-align: right;">${formattedAmount}</td></tr>
            <tr><td style="padding: 6px 0;">Refunded Sum:</td><td style="color: #ef4444; text-align: right; font-weight: bold;">${formattedAmount}</td></tr>
            <tr><td style="padding: 6px 0;">Transaction Date:</td><td style="color: #ffffff; text-align: right;">${formattedDate}</td></tr>
            <tr><td style="padding: 6px 0;">Refund ID:</td><td style="color: #ffffff; text-align: right; font-family: monospace;">${params.refundId || "N/A"}</td></tr>
            <tr><td style="padding: 6px 0;">Remaining Project Balance:</td><td style="color: #ffffff; text-align: right;">${formattedRemaining}</td></tr>
          </table>
        </div>

        <p>This completes the financial adjustment ledger for this transaction. Thank you for your cooperation.</p>
      `;
      break;

    case "Booking_Confirmation":
      subject = `Booking Confirmation – ${params.bookingService || "Consultation"}`;
      preheader = `Your technical consultation with Arcadia is confirmed for ${params.bookingDate}.`;
      badgeText = `Booking Confirmed`;
      badgeType = "success";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>Thank you for scheduling a session with Arcadia Digital Solutions. Your digital engineering and development booking is successfully confirmed!</p>
        
        <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
          <h3 style="color: #ffffff; font-size: 14px; margin: 0 0 12px 0; font-family: monospace; border-bottom: 1px solid #1f2937; padding-bottom: 6px;">APPOINTMENT SPECS</h3>
          <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
            <tr><td style="padding: 6px 0;">Booking ID:</td><td style="color: #ffffff; text-align: right; font-family: monospace;">${params.bookingId || "N/A"}</td></tr>
            <tr><td style="padding: 6px 0;">Service booked:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.bookingService || "Consultation"}</td></tr>
            <tr><td style="padding: 6px 0;">Scheduled Date:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.bookingDate || "N/A"}</td></tr>
            <tr><td style="padding: 6px 0;">Time Slot:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.bookingTime || "N/A"}</td></tr>
            <tr><td style="padding: 6px 0;">Assigned Team:</td><td style="color: #3b82f6; text-align: right;">${params.bookingTeam || "Arcadia Engineering Team"}</td></tr>
          </table>
        </div>

        <p>Our engineers will join the meeting session details sent in your invitation or reach out directly to your provided contact. If you need to reschedule or alter your specifications, please email us at support@arcadia.digital.</p>
      `;
      break;

    case "Admin_Alert":
      subject = `[System Alert] ${params.status || "Operational Issue"}`;
      preheader = `Administrative attention is required regarding a transaction event.`;
      badgeText = `Admin Alert`;
      badgeType = "error";
      bodyHtml = `
        <p>Hello Arcadia Admin,</p>
        <p>This is an automated priority system alert regarding a system process event:</p>
        
        <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
          <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
            <tr><td style="padding: 6px 0;">Trigger Event:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.status || "N/A"}</td></tr>
            <tr><td style="padding: 6px 0;">Subject Recipient:</td><td style="color: #ffffff; text-align: right;">${params.to}</td></tr>
            <tr><td style="padding: 6px 0;">Details:</td><td style="color: #ef4444; text-align: right;">${params.reason || "No details provided"}</td></tr>
            <tr><td style="padding: 6px 0;">Timestamp:</td><td style="color: #ffffff; text-align: right;">${formattedDate}</td></tr>
          </table>
        </div>

        <p>Please log in to the administrative portal to review and resolve this transaction log immediately.</p>
      `;
      break;

    case "Maint_Subscription_Activated":
      subject = `Website Maintenance Subscription Activated – ${params.planName}`;
      preheader = `Your monthly maintenance plan ${params.planName} is now active for ${params.projectName}.`;
      badgeText = `Subscription Active`;
      badgeType = "success";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>We are delighted to confirm that your website maintenance subscription has been successfully activated!</p>
        <p>Our dedicated web engineering team is now actively monitoring your project <strong>${params.projectName}</strong> to ensure maximum uptime, security, and performance.</p>
        
        <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
          <h3 style="color: #ffffff; font-size: 15px; margin: 0 0 14px 0; font-family: monospace; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">SUBSCRIPTION PLANS</h3>
          <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
            <tr><td style="padding: 6px 0;">Project Name:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.projectName}</td></tr>
            <tr><td style="padding: 6px 0;">Active Plan:</td><td style="color: #3b82f6; text-align: right; font-weight: bold;">${params.planName}</td></tr>
            <tr><td style="padding: 6px 0;">Monthly Price:</td><td style="color: #10b981; text-align: right; font-weight: bold;">${formattedAmount}/month</td></tr>
            <tr><td style="padding: 6px 0;">Start Date:</td><td style="color: #ffffff; text-align: right;">${formattedDate}</td></tr>
            <tr><td style="padding: 6px 0;">Next Renewal Date:</td><td style="color: #f59e0b; text-align: right; font-weight: bold;">${params.nextRenewalDate || "N/A"}</td></tr>
            <tr><td style="padding: 6px 0;">Subscription ID:</td><td style="color: #ffffff; text-align: right; font-family: monospace; font-size: 11px;">${params.paymentId || "N/A"}</td></tr>
          </table>
        </div>

        <p>No further actions are required from your side. You can check the complete details, support benefits, and renew or modify your plan at any time inside your client dashboard.</p>
        <p>Thank you for letting us protect and optimize your online system!</p>
      `;
      break;

    case "Maint_Payment_Success":
      subject = `Monthly Maintenance Payment Succeeded`;
      preheader = `We successfully processed your monthly maintenance payment of ${formattedAmount}.`;
      badgeText = `Payment Succeeded`;
      badgeType = "success";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>This email confirms that your monthly website maintenance recurring payment has been successfully processed!</p>
        
        <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
          <h3 style="color: #ffffff; font-size: 15px; margin: 0 0 14px 0; font-family: monospace; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">PAYMENT DETAILS</h3>
          <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
            <tr><td style="padding: 6px 0;">Project Name:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.projectName}</td></tr>
            <tr><td style="padding: 6px 0;">Maintenance Plan:</td><td style="color: #ffffff; text-align: right;">${params.planName || "Active Plan"}</td></tr>
            <tr><td style="padding: 6px 0;">Amount Paid:</td><td style="color: #10b981; text-align: right; font-weight: bold;">${formattedAmount}</td></tr>
            <tr><td style="padding: 6px 0;">Invoice / Payment ID:</td><td style="color: #ffffff; text-align: right; font-family: monospace; font-size: 11px;">${params.paymentId || "N/A"}</td></tr>
            <tr><td style="padding: 6px 0;">Billing Date:</td><td style="color: #ffffff; text-align: right;">${formattedDate}</td></tr>
            <tr><td style="padding: 6px 0;">Next Renewal Date:</td><td style="color: #f59e0b; text-align: right; font-weight: bold;">${params.nextRenewalDate || "N/A"}</td></tr>
          </table>
        </div>

        <p>An official invoice is now available in your client console. If you have any questions, please contact our accounts department at support@arcadia.digital.</p>
        <p>Thank you for choosing Arcadia Co-Dev Hub!</p>
      `;
      break;

    case "Maint_Renewal_Reminder":
      subject = `Upcoming Subscription Renewal Reminder – 3 Days Left`;
      preheader = `Your monthly maintenance plan is scheduled to renew in 3 days.`;
      badgeText = `Renewal Reminder`;
      badgeType = "warning";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>This is a friendly automatic reminder that your monthly website maintenance subscription is scheduled to auto-renew in <strong>3 days</strong>.</p>
        
        <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
          <h3 style="color: #ffffff; font-size: 15px; margin: 0 0 14px 0; font-family: monospace; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">RENEWAL DETAILS</h3>
          <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
            <tr><td style="padding: 6px 0;">Project Name:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.projectName}</td></tr>
            <tr><td style="padding: 6px 0;">Maintenance Plan:</td><td style="color: #3b82f6; text-align: right; font-weight: bold;">${params.planName}</td></tr>
            <tr><td style="padding: 6px 0;">Renewal Amount:</td><td style="color: #10b981; text-align: right; font-weight: bold;">${formattedAmount}</td></tr>
            <tr><td style="padding: 6px 0;">AutoPay Date:</td><td style="color: #f59e0b; text-align: right; font-weight: bold;">${params.nextRenewalDate || "N/A"}</td></tr>
          </table>
        </div>

        <p>The system will automatically process this charge via your default payment method (UPI AutoPay, Card, or Net Banking) configured in Razorpay. Please ensure that your account has sufficient balance to prevent monitoring disruptions.</p>
        <p>You can manage your payment details or update your subscription from your client dashboard.</p>
      `;
      break;

    case "Maint_Payment_Failed":
      subject = `Urgent: Website Maintenance Payment Failed`;
      preheader = `We were unable to process your recurring maintenance payment. Action required.`;
      badgeText = `Payment Failed`;
      badgeType = "error";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>We are writing to urgently notify you that our attempt to process your recurring monthly maintenance payment has <strong>failed</strong>.</p>
        
        <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
          <h3 style="color: #ffffff; font-size: 15px; margin: 0 0 14px 0; font-family: monospace; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">FAILURE DESCRIPTION</h3>
          <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
            <tr><td style="padding: 6px 0;">Project Name:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.projectName}</td></tr>
            <tr><td style="padding: 6px 0;">Plan:</td><td style="color: #ffffff; text-align: right;">${params.planName || "N/A"}</td></tr>
            <tr><td style="padding: 6px 0;">Failed Amount:</td><td style="color: #ef4444; text-align: right; font-weight: bold;">${formattedAmount}</td></tr>
            <tr><td style="padding: 6px 0;">Reason for Failure:</td><td style="color: #ef4444; text-align: right;">${params.reason || "Insufficient funds or authorization expired"}</td></tr>
            <tr><td style="padding: 6px 0;">Date of Attempt:</td><td style="color: #ffffff; text-align: right;">${formattedDate}</td></tr>
          </table>
        </div>

        <p><strong>Action Required:</strong> Please log in to your client dashboard immediately to verify and update your payment method. Our system will automatically re-attempt this transaction in 24 hours.</p>
        <p>If payment is not received, website health checks and security updates may be temporarily paused.</p>
      `;
      break;

    case "Maint_Payment_Retried":
      subject = `Recurring Payment Re-Attempt Notification`;
      preheader = `We are re-attempting processing for your monthly maintenance subscription.`;
      badgeText = `Retrying Payment`;
      badgeType = "warning";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>This is to notify you that we are automatically re-attempting to process your outstanding monthly maintenance payment of <strong>${formattedAmount}</strong>.</p>
        <p>No action is required from your side at this moment. We will notify you immediately of the results of this retry attempt.</p>
      `;
      break;

    case "Maint_Subscription_Cancelled":
      subject = `Subscription Cancelled – Website Maintenance`;
      preheader = `Your website maintenance subscription has been cancelled.`;
      badgeText = `Cancelled`;
      badgeType = "error";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>We confirm that your website maintenance subscription for <strong>${params.projectName}</strong> has been successfully <strong>cancelled</strong>.</p>
        <p>Active support benefits and automated health/security checks will cease at the end of your current billing period (on ${params.nextRenewalDate || "the renewal date"}). After this date, your site will transition to unmonitored status.</p>
        <p>If you cancelled this by accident, you can resume your subscription instantly from your client dashboard before the expiry date.</p>
      `;
      break;

    case "Maint_Subscription_Paused":
      subject = `Website Maintenance Subscription Temporarily Paused`;
      preheader = `Your website maintenance subscription has been paused.`;
      badgeText = `Paused`;
      badgeType = "warning";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>We are writing to notify you that your website maintenance subscription for <strong>${params.projectName}</strong> is now <strong>paused</strong>.</p>
        <p>During this paused period, automated security updates and Priority/Daily backups are temporarily frozen. You can resume active maintenance at any time from your client console or by contacting our administration.</p>
      `;
      break;

    case "Maint_Subscription_Resumed":
      subject = `Website Maintenance Subscription Resumed`;
      preheader = `Your website maintenance subscription has been resumed successfully!`;
      badgeText = `Resumed`;
      badgeType = "success";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>Welcome back! We are pleased to inform you that your website maintenance subscription has been successfully <strong>resumed</strong>.</p>
        <p>Automated security scanning, backups, and priority bug fixing support are now fully active once again for <strong>${params.projectName}</strong>.</p>
      `;
      break;

    case "Maint_Plan_Upgraded":
      subject = `Website Maintenance Plan Upgraded Successfully!`;
      preheader = `Congratulations! Your maintenance plan has been upgraded to ${params.planName}.`;
      badgeText = `Upgraded`;
      badgeType = "success";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>Congratulations! Your website maintenance plan has been successfully upgraded to <strong>${params.planName}</strong>!</p>
        
        <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
          <h3 style="color: #ffffff; font-size: 15px; margin: 0 0 14px 0; font-family: monospace; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">UPGRADE DETAILS</h3>
          <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
            <tr><td style="padding: 6px 0;">Project Name:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.projectName}</td></tr>
            <tr><td style="padding: 6px 0;">New Active Plan:</td><td style="color: #3b82f6; text-align: right; font-weight: bold;">${params.planName}</td></tr>
            <tr><td style="padding: 6px 0;">New Monthly Price:</td><td style="color: #10b981; text-align: right; font-weight: bold;">${formattedAmount}/month</td></tr>
            <tr><td style="padding: 6px 0;">Change Date:</td><td style="color: #ffffff; text-align: right;">${formattedDate}</td></tr>
            <tr><td style="padding: 6px 0;">Next Renewal Date:</td><td style="color: #f59e0b; text-align: right; font-weight: bold;">${params.nextRenewalDate || "N/A"}</td></tr>
          </table>
        </div>

        <p>Your upgraded benefits (including faster backups, priority SLAs, and custom optimizations) have been deployed. All billing is adjusted proportionally based on your cycle.</p>
      `;
      break;

    case "Maint_Plan_Downgraded":
      subject = `Website Maintenance Plan Downgraded`;
      preheader = `Your website maintenance plan has been adjusted to ${params.planName}.`;
      badgeText = `Downgraded`;
      badgeType = "warning";
      bodyHtml = `
        <p>Dear <strong>${params.clientName}</strong>,</p>
        <p>We are writing to confirm that your website maintenance plan has been adjusted to <strong>${params.planName}</strong> at your request.</p>
        
        <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
          <h3 style="color: #ffffff; font-size: 15px; margin: 0 0 14px 0; font-family: monospace; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">PLAN DETAILS</h3>
          <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
            <tr><td style="padding: 6px 0;">Project Name:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${params.projectName}</td></tr>
            <tr><td style="padding: 6px 0;">New Active Plan:</td><td style="color: #3b82f6; text-align: right; font-weight: bold;">${params.planName}</td></tr>
            <tr><td style="padding: 6px 0;">New Monthly Price:</td><td style="color: #10b981; text-align: right; font-weight: bold;">${formattedAmount}/month</td></tr>
            <tr><td style="padding: 6px 0;">Next Renewal Date:</td><td style="color: #f59e0b; text-align: right; font-weight: bold;">${params.nextRenewalDate || "N/A"}</td></tr>
          </table>
        </div>

        <p>Your benefits list and SLAs have been adjusted to reflect the standard Basic or Standard tier from your next cycle.</p>
      `;
      break;
  }

  const emailHtml = buildHtmlTemplate(subject, preheader, bodyHtml, badgeText, badgeType);

  // 3. Handle PDF Attachment if required
  let attachmentBase64 = "";
  if (hasInvoiceAttachment) {
    try {
      attachmentBase64 = generateServerInvoicePDF(params);
      console.log(`[Email Service] Generated PDF attachment (invoice) successfully for event: ${eventType}`);
    } catch (pdfErr) {
      console.error("[Email Service] PDF attachment generation failed (graceful fallback):", pdfErr);
    }
  }

  // 4. Save to mock_emails.json local database for immediate UI preview
  const mockEmailRecord = {
    id: "mail_" + Math.random().toString(36).substr(2, 9),
    to: params.to,
    subject,
    body: emailHtml,
    type: eventType,
    sentAt: new Date().toISOString()
  };

  if (saveDBCallback) {
    try {
      const mockEmailsPath = path.join(process.cwd(), "data", "mock_emails.json");
      let mockEmails: any[] = [];
      if (fs.existsSync(mockEmailsPath)) {
        try {
          mockEmails = JSON.parse(fs.readFileSync(mockEmailsPath, "utf8"));
        } catch (_) {}
      }
      mockEmails.unshift(mockEmailRecord);
      fs.writeFileSync(mockEmailsPath, JSON.stringify(mockEmails, null, 2));
      console.log(`[Email Service] Mock email recorded locally for preview to: ${params.to}`);
    } catch (fsErr) {
      console.error("[Email Service] Failed writing mock email to filesystem:", fsErr);
    }
  }

  // 5. Fire actual API or fallback
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "Arcadia Co-Dev Hub <onboarding@resend.dev>";
  
  let deliveryStatus: "Sent" | "Failed" | "Pending" | "Sent (Simulation)" = "Sent (Simulation)";
  let lastError = "";
  let retryAttempts = 0;

  if (apiKey) {
    const payload: any = {
      from: fromEmail,
      to: [params.to],
      subject: subject,
      html: emailHtml,
    };

    if (attachmentBase64) {
      payload.attachments = [
        {
          content: attachmentBase64,
          filename: params.invoiceNumber ? `${params.invoiceNumber}.pdf` : `Invoice.pdf`,
        }
      ];
    }

    // 6. Execute actual send with automatic retry logic (3 attempts max)
    const maxAttempts = 3;
    let sentSuccessfully = false;

    while (retryAttempts < maxAttempts && !sentSuccessfully) {
      try {
        console.log(`[Email Service] Sending live Resend email (Attempt ${retryAttempts + 1}/${maxAttempts}) to ${params.to}`);
        
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          sentSuccessfully = true;
          deliveryStatus = "Sent";
          console.log(`[Email Service] Live email successfully dispatched to ${params.to} via Resend.`);
        } else {
          const errBody = await response.text();
          throw new Error(`Resend API returned status ${response.status}: ${errBody}`);
        }
      } catch (err: any) {
        retryAttempts++;
        lastError = err.message || "Unknown error";
        console.error(`[Email Service] Attempt ${retryAttempts} failed: ${lastError}`);
        
        if (retryAttempts < maxAttempts) {
          // Linear delay before retry
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }

    // If live send completely failed after all retries, log failure and notify admin
    if (!sentSuccessfully) {
      deliveryStatus = "Failed";
      console.error(`[Email Service] All live send attempts failed. Fallback to logging.`);
      
      // Notify Admin of repeated email failures
      await triggerEmail(
        "Admin_Alert",
        {
          to: "admin@arcadia.digital",
          clientName: "System Administrator",
          projectName: "Arcadia Platform",
          status: "EMAIL_DISPATCH_FAILURE",
          reason: `Failed to dispatch ${eventType} email to ${params.to} after ${maxAttempts} retries. Error: ${lastError}`,
        },
        adminDbInstance,
        saveDBCallback
      );
    }
  } else {
    console.log(`[Email Service] RESEND_API_KEY not configured. Dispatched in Simulation Mode to: ${params.to}`);
  }

  // 7. Store email log securely in Firestore under emailLogs/ collection
  if (adminDbInstance) {
    try {
      const emailLogId = "elog_" + Math.random().toString(36).substr(2, 9);
      const logRecord = {
        id: emailLogId,
        recipient: params.to,
        subject,
        emailType: eventType,
        triggerEvent: eventType.toUpperCase(),
        projectId: params.projectName,
        paymentId: params.paymentId || "N/A",
        deliveryStatus,
        timestamp: new Date().toISOString(),
        retryAttempts,
        error: lastError || null
      };

      await adminDbInstance.collection("emailLogs").doc(emailLogId).set(logRecord);
      console.log(`[Email Service] Transaction logged in Firestore under collection 'emailLogs' (ID: ${emailLogId})`);
    } catch (firestoreErr: any) {
      console.error("[Email Service] Failed writing log to Firestore collection 'emailLogs':", firestoreErr.message);
    }
  }

  return deliveryStatus === "Sent" || deliveryStatus === "Sent (Simulation)";
}

/**
 * Return detailed explainer summaries for status updates
 */
function getProgressExplainer(status: string): string {
  switch (status) {
    case "Pending":
      return "Your project brief has been registered and is currently awaiting administration review and architect briefing.";
    case "Payment Pending Approval":
      return "Your advance kick-off payment has been submitted and is currently awaiting validation from our accounting team.";
    case "Initial Payment Received":
      return "We have successfully approved your advance kickoff payment! The engineering team has officially initiated planning operations.";
    case "Planning":
      return "Our technical architects are creating code scopes, defining data schemas, and setting up repository scaffolds.";
    case "Design Started":
      return "Our product designers are constructing visual layouts, wireframes, and design languages inside Figma.";
    case "Development Started":
      return "Our engineers are writing production-grade code, setting up database instances, and linking API services.";
    case "In Progress":
      return "Core features are actively being constructed, compiled, and integrated into our sandbox environment.";
    case "Testing":
      return "The system is undergoing automated unit testing, load analysis, security audits, and cross-browser quality checks.";
    case "Client Review":
      return "Development milestones are fully loaded in our staging environment and are prepared for your review and feedback.";
    case "Revision":
      return "We are polishing elements and incorporating your review notes back into the development workspace.";
    case "Ready for Delivery":
      return "Staging sign-off is complete. We are preparing deployment artifacts, environment files, and transfer protocols.";
    case "Completed":
      return "The project is completely deployed, configured, and running live. Full operational ownership has been successfully handed over.";
    case "On Hold":
      return "Project operations have been temporarily paused. Please contact your assigned manager for further alignment.";
    case "Cancelled":
      return "Project operations have been cancelled. Please review accounting statements or contact our management team.";
    default:
      return "Your project is progressing through scheduled development milestones. We will update you immediately as the stage changes.";
  }
}
