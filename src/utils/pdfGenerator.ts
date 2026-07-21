import { jsPDF } from "jspdf";
import { Order } from "../types";

export const generateInvoicePDF = (order: Order, milestoneId?: string) => {
  const doc = new jsPDF("p", "mm", "a4");

  // Fetch milestone if milestoneId is provided
  const milestone = milestoneId && order.milestones 
    ? order.milestones.find(m => m.id === milestoneId) 
    : undefined;

  // Helper for text formatting
  const formattedDate = new Date((milestone && milestone.paidAt) || order.createdAt || Date.now()).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const deadlineDate = new Date(order.deadline).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Top Dark Accent Header Band
  doc.setFillColor(11, 15, 25); // #0B0F19
  doc.rect(0, 0, 210, 45, "F");

  // Neon Blue Line below Header
  doc.setFillColor(59, 130, 246); // #3B82F6 - Arcadia Blue
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
  doc.setTextColor(156, 163, 175); // light gray
  doc.text("ARCADIA DIGITAL SOLUTIONS INC.", 130, 16);
  doc.text(`E-mail: ${(window as any).FIREBASE_CONFIG?.adminEmail || "arcadiadevelopers07@gmail.com"}`, 130, 21);
  doc.text("Web: www.arcadia.digital", 130, 26);
  doc.text("Contact: +91 8328218878", 130, 31);

  // Invoice Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(11, 15, 25);
  doc.text(milestone ? "MILESTONE INVOICE" : "INVOICE", 15, 68);

  // Status Badge (Paid or Pending)
  const isPaid = milestone ? (milestone.status === "Paid") : order.isPaid;
  if (isPaid) {
    doc.setFillColor(220, 252, 231); // light green bg
    doc.rect(145, 58, 50, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(21, 128, 61); // dark green text
    doc.text(milestone ? "MILESTONE PAID" : "PAID IN FULL", milestone ? 149 : 157, 64.5);
  } else {
    doc.setFillColor(254, 243, 199); // light yellow bg
    doc.rect(145, 58, 50, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(180, 83, 9); // dark yellow text
    doc.text("PAYMENT PENDING", 149, 64.5);
  }

  // Invoice details grid
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Invoice Number:", 15, 84);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // slate-900
  const invoiceNum = milestone 
    ? `MS-${order.id.slice(0, 5).toUpperCase()}-${milestone.id.toUpperCase()}`
    : `INV-${order.id.slice(0, 8).toUpperCase()}`;
  doc.text(invoiceNum, 50, 84);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Invoice Date:", 15, 90);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(formattedDate, 50, 90);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Order ID:", 15, 96);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`#${order.id.slice(0, 10).toUpperCase()}`, 50, 96);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Delivery Deadline:", 15, 102);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(deadlineDate, 50, 102);

  // Client info (Bill To)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(11, 15, 25);
  doc.text("BILL TO:", 115, 84);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(order.name, 115, 90);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(order.company || "Personal Brand", 115, 96);
  doc.text(order.email, 115, 102);
  doc.text(order.phone || "N/A", 115, 108);

  // Separator Line
  doc.setFillColor(226, 232, 240); // slate-200
  doc.rect(15, 116, 180, 0.5, "F");

  // Project description / brief
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(11, 15, 25);
  doc.text("Project Description & Brief:", 15, 125);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  const splitDesc = doc.splitTextToSize(order.description || "No project description provided.", 180);
  doc.text(splitDesc, 15, 131);

  // Adjust table y-coordinate based on description size
  const descHeight = splitDesc.length * 4.5;
  const tableY = Math.max(142, 131 + descHeight + 8);

  // Table Headers
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(15, tableY, 180, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("SERVICE / SOLUTION DESCRIPTION", 20, tableY + 6.5);
  doc.text("QTY", 130, tableY + 6.5);
  doc.text("RATE", 148, tableY + 6.5);
  doc.text("TOTAL", 175, tableY + 6.5);

  // Separator below headers
  doc.setFillColor(226, 232, 240);
  doc.rect(15, tableY + 10, 180, 0.5, "F");

  // Table Row (Single item for this order)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  
  const descText = milestone 
    ? `${order.service} [${milestone.label}]`
    : `${order.service} Setup`;
  doc.text(descText, 20, tableY + 17);
  doc.text("1", 132, tableY + 17);

  const billingAmount = milestone ? milestone.amount : (parseInt(order.budget) || 0);
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

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Tax / GST (0%):", 130, totalsY + 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("INR 0.00", 168, totalsY + 6);

  doc.setFillColor(226, 232, 240);
  doc.rect(130, totalsY + 10, 65, 0.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(11, 15, 25);
  doc.text("Total Amount Due:", 130, totalsY + 16);
  doc.setFontSize(11);
  doc.setTextColor(59, 130, 246); // accent blue
  doc.text(formattedBudget, 168, totalsY + 16);

  // Bottom Notes & Payment Directions
  const notesY = Math.max(totalsY + 32, 215);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(11, 15, 25);
  doc.text("PAYMENT INFORMATION & TERMS", 15, notesY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("1. All digital systems remain proprietary until payment confirmation completes.", 15, notesY + 5.5);
  doc.text("2. Payments are non-refundable after architectural sign-off.", 15, notesY + 10.5);
  doc.text("3. Thank you for placing your software engineering and design trust with ARCADIA.", 15, notesY + 15.5);

  // Digital Signature Seal
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("ARCADIA ARCHITECT", 152, notesY + 10.5);
  doc.setFillColor(15, 23, 42);
  doc.rect(148, notesY + 12.5, 45, 0.2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Authorized Digital Signatory", 154, notesY + 16);

  // ARCADIA PVT LTD Digital Signed Stamp
  if (isPaid) {
    // Outer Border
    doc.setDrawColor(37, 99, 235); // Blue-600
    doc.setLineWidth(0.6);
    doc.setFillColor(239, 246, 255); // very light blue background
    doc.rect(144, notesY + 20, 52, 22, "FD");

    // Inner dotted box
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.3);
    doc.rect(146, notesY + 22, 48, 18);

    // Text details inside stamp
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(29, 78, 216); // Blue-700
    doc.text("ARCADIA STUDIO PVT LTD", 149, notesY + 26);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(22, 163, 74); // green
    doc.text("● DIGITALLY APPROVED & SIGNED", 148.5, notesY + 30.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`VERIFICATION REF: ARC-${order.id.slice(0,4).toUpperCase()}`, 149, notesY + 35);
    doc.text(`STAMP DATE: ${new Date().toLocaleDateString("en-IN")}`, 149, notesY + 38.5);
  }

  // Footer banner
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 280, 210, 17, "F");
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 280, 210, 0.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("ARCADIA DIGITAL SOLUTIONS • SECURE CYBERNETIC WEB PLATFORM", 15, 290);
  doc.setFont("helvetica", "normal");
  doc.text("Page 1 of 1", 185, 290);

  // Save PDF file
  const docName = milestone
    ? `Signed_Milestone_Invoice_${order.id.slice(0, 5).toUpperCase()}_${milestone.id.toUpperCase()}.pdf`
    : `Signed_Full_Invoice_INV-${order.id.slice(0, 8).toUpperCase()}_Arcadia.pdf`;
  doc.save(docName);
};

export const generateRefundPDF = (order: Order, refund: any) => {
  const doc = new jsPDF("p", "mm", "a4");

  const formattedDate = new Date(refund.timestamp || Date.now()).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Top Dark Accent Header Band
  doc.setFillColor(11, 15, 25); // #0B0F19
  doc.rect(0, 0, 210, 45, "F");

  // Neon Red Line below Header for refunds
  doc.setFillColor(239, 68, 68); // Red-500
  doc.rect(0, 45, 210, 3, "F");

  // Arcadia Logo Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text("ARCADIA", 15, 22);

  // Logo Accent Dot (Red for refund)
  doc.setFillColor(239, 68, 68);
  doc.circle(71, 18, 1.5, "F");

  // Arcadia contact on top right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(156, 163, 175);
  doc.text("ARCADIA DIGITAL SOLUTIONS INC.", 130, 16);
  doc.text(`E-mail: ${(window as any).FIREBASE_CONFIG?.adminEmail || "arcadiadevelopers07@gmail.com"}`, 130, 21);
  doc.text("Web: www.arcadia.digital", 130, 26);
  doc.text("Contact: +91 8328218878", 130, 31);

  // Refund Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(11, 15, 25);
  doc.text("REFUND RECEIPT", 15, 68);

  // Status Badge (Refunded)
  doc.setFillColor(254, 226, 226); // light red bg
  doc.rect(145, 58, 50, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(220, 38, 38); // dark red text
  doc.text("REFUNDED", 159, 64.5);

  // Refund details grid
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Refund Number:", 15, 84);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`RFD-${refund.id.slice(0, 8).toUpperCase()}`, 50, 84);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Refund Date:", 15, 90);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(formattedDate, 50, 90);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Original Order ID:", 15, 96);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`#${order.id.slice(0, 10).toUpperCase()}`, 50, 96);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Payment ID:", 15, 102);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(refund.paymentId, 50, 102);

  // Client info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(11, 15, 25);
  doc.text("REFUND TO:", 115, 84);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(order.name, 115, 90);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(order.company || "Personal Brand", 115, 96);
  doc.text(order.email, 115, 102);

  // Separator Line
  doc.setFillColor(226, 232, 240);
  doc.rect(15, 116, 180, 0.5, "F");

  // Refund Reason
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(11, 15, 25);
  doc.text("Reason for Refund:", 15, 125);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(refund.reason || "Client request / project cancellation.", 15, 131);

  // Table
  const tableY = 145;
  doc.setFillColor(248, 250, 252);
  doc.rect(15, tableY, 180, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("REFUND DESCRIPTION", 20, tableY + 6.5);
  doc.text("QTY", 130, tableY + 6.5);
  doc.text("REFUNDED AMOUNT", 152, tableY + 6.5);

  // Separator below headers
  doc.setFillColor(226, 232, 240);
  doc.rect(15, tableY + 10, 180, 0.5, "F");

  // Row
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Refund of Milestone Payment [${refund.milestoneId || "m1"}] for ${order.service}`, 20, tableY + 17);
  doc.text("1", 132, tableY + 17);

  const formattedRefundAmount = "INR " + refund.amount.toLocaleString("en-IN");
  doc.text(formattedRefundAmount, 152, tableY + 17);

  doc.rect(15, tableY + 22, 180, 0.5, "F");

  // Totals
  const totalsY = tableY + 30;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(11, 15, 25);
  doc.text("Total Refunded Amount:", 115, totalsY);
  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38); // red
  doc.text(formattedRefundAmount, 168, totalsY);

  // Bottom Notes
  const notesY = 215;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(11, 15, 25);
  doc.text("REFUND PROTOCOLS", 15, notesY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("1. This is an official digital refund ledger issued under secure sandbox protocols.", 15, notesY + 5.5);
  doc.text("2. Please allow 5-7 working days for the amount to reflect in your original payment mode.", 15, notesY + 10.5);

  // Digital Signature Seal
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("ARCADIA AUDITOR", 152, notesY + 10.5);
  doc.setFillColor(15, 23, 42);
  doc.rect(148, notesY + 12.5, 45, 0.2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Authorized Refund Agent", 154, notesY + 16);

  // ARCADIA Digital Stamp
  doc.setDrawColor(220, 38, 38); // Red
  doc.setLineWidth(0.6);
  doc.setFillColor(254, 242, 242);
  doc.rect(144, notesY + 20, 52, 22, "FD");

  doc.setDrawColor(239, 68, 68);
  doc.setLineWidth(0.3);
  doc.rect(146, notesY + 22, 48, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(185, 28, 28);
  doc.text("ARCADIA CO-DEV HUB", 149, notesY + 26);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(185, 28, 28);
  doc.text("● REFUND TRANSACTED SECURELY", 148.5, notesY + 30.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`REF ID: RFD-${refund.id.slice(0, 4).toUpperCase()}`, 149, notesY + 35);
  doc.text(`STAMP DATE: ${new Date().toLocaleDateString("en-IN")}`, 149, notesY + 38.5);

  // Footer banner
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 280, 210, 17, "F");
  doc.setFillColor(239, 68, 68);
  doc.rect(0, 280, 210, 0.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("ARCADIA DIGITAL SOLUTIONS • SECURE REFUND LEDGER", 15, 290);
  doc.setFont("helvetica", "normal");
  doc.text("Page 1 of 1", 185, 290);

  const docName = `Refund_Receipt_RFD-${refund.id.slice(0, 8).toUpperCase()}.pdf`;
  doc.save(docName);
};
