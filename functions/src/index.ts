import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted, FirestoreEvent } from "firebase-functions/v2/firestore";
import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2";
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Set global options to default region us-central1 and appropriate memory allocations
setGlobalOptions({ maxInstances: 10, timeoutSeconds: 60 });

/**
 * -------------------------------------------------------------
 * HELPER METHODS FOR INTEGRATING WITH MIRRORED JSON DATABASE
 * -------------------------------------------------------------
 */

async function getJsonDb(filename: string): Promise<any[]> {
  const docRef = db.collection("arcadia_system_db").doc(filename);
  const docSnap = await docRef.get();
  if (docSnap.exists) {
    return docSnap.data()?.data || [];
  }
  return [];
}

async function saveJsonDb(filename: string, data: any[]) {
  const docRef = db.collection("arcadia_system_db").doc(filename);
  await docRef.set({
    data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function triggerMockEmail(to: string, subject: string, body: string, type: string) {
  const emails = await getJsonDb("mock_emails.json");
  const newEmail = {
    id: "mail_" + Math.random().toString(36).substring(2, 11),
    to,
    subject,
    body,
    type,
    sentAt: new Date().toISOString()
  };
  emails.unshift(newEmail);
  await saveJsonDb("mock_emails.json", emails);
  console.log(`[Email Service] Mock email successfully appended to mock_emails.json for ${to}`);
}

/**
 * -------------------------------------------------------------
 * 1. ORDER NUMBERING AUTOMATION
 * -------------------------------------------------------------
 */

/**
 * Trigger: Automatically generate formatted order numbers on creation in 'orders' collection.
 * Format: ARCADIA-2026-XXXX (using atomically incremented transactions)
 */
export const generateOrderNumber = onDocumentCreated("orders/{orderId}", async (event: FirestoreEvent<any | undefined>) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const orderId = event.params.orderId;
  const orderRef = snapshot.ref;

  try {
    await db.runTransaction(async (transaction) => {
      const counterRef = db.collection("system_counters").doc("orders_sequence");
      const counterDoc = await transaction.get(counterRef);
      
      let nextNum = 1;
      if (counterDoc.exists) {
        nextNum = (counterDoc.data()?.current || 0) + 1;
      }
      
      transaction.set(counterRef, { current: nextNum }, { merge: true });
      
      const year = new Date().getFullYear();
      const paddedNum = String(nextNum).padStart(4, "0");
      const orderNumber = `ARCADIA-${year}-${paddedNum}`;

      transaction.update(orderRef, {
        orderNumber: orderNumber,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    console.log(`Successfully generated order number for order ${orderId}`);
  } catch (error) {
    console.error(`Failed to generate order number for order ${orderId}:`, error);
  }
});

/**
 * -------------------------------------------------------------
 * 2. INVOICE GENERATION AUTOMATION
 * -------------------------------------------------------------
 */

/**
 * Trigger: Generate Invoice metadata & log events on a successful Payment transaction
 */
export const onPaymentSuccess = onDocumentUpdated("payments/{paymentId}", async (event: FirestoreEvent<any | undefined>) => {
  const change = event.data;
  if (!change) return;

  const beforeData = change.before.data();
  const afterData = change.after.data();

  // Trigger only on status transition to Success
  if (beforeData?.status !== "Success" && afterData?.status === "Success") {
    const orderId = afterData.orderId;
    const customerId = afterData.customerId;
    const paymentId = event.params.paymentId;

    try {
      const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
      const invoiceId = `inv_${Date.now()}`;
      
      await db.runTransaction(async (tx) => {
        // Create an Invoice document
        const invoiceRef = db.collection("invoices").doc(invoiceId);
        tx.set(invoiceRef, {
          id: invoiceId,
          orderId: orderId,
          customerId: customerId,
          invoiceNumber: invoiceNum,
          amount: afterData.amount,
          gstAmount: Number((afterData.amount * 0.18).toFixed(2)), // 18% GST calculation
          pdfUrl: `https://storage.googleapis.com/${admin.storage().bucket().name}/invoices/${customerId}/${invoiceId}.pdf`,
          status: "Paid",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update corresponding Order with the payment and invoice ID
        const orderRef = db.collection("orders").doc(orderId);
        tx.update(orderRef, {
          paymentStatus: "Paid",
          invoiceId: invoiceId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create an audit Log
        const logId = `log_${Date.now()}`;
        const logRef = db.collection("activityLogs").doc(logId);
        tx.set(logRef, {
          id: logId,
          userId: customerId,
          action: `Successful payment verification mapped to invoice ${invoiceNum}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      console.log(`Payment successfully finalized for Order ${orderId}`);
    } catch (error) {
      console.error(`Failed to map successful payment ${paymentId}:`, error);
    }
  }
});

/**
 * -------------------------------------------------------------
 * 3. DUAL-PARADIGM MIRRORED REAL-TIME SYNCHRONIZATION TRIGGER
 * -------------------------------------------------------------
 * This trigger handles automatic database updates that occur via the Express full-stack backend
 * by listening to changes in the 'arcadia_system_db' collection and running the automation.
 */
export const onDatabaseDocUpdated = onDocumentUpdated("arcadia_system_db/{docName}", async (event: FirestoreEvent<any | undefined>) => {
  const change = event.data;
  if (!change) return;

  const docName = event.params.docName;
  const beforeData = change.before.data()?.data || [];
  const afterData = change.after.data()?.data || [];

  if (docName === "orders.json") {
    // A. Order Numbering Automation for server-side mirrored orders
    let hasChanges = false;
    const ordersList = [...afterData];

    for (let i = 0; i < ordersList.length; i++) {
      const order = ordersList[i];
      if (!order.orderNumber || order.orderNumber.startsWith("placeholder") || order.orderNumber === "PENDING" || order.orderNumber === "") {
        // Increment global counter inside transaction
        const counterRef = db.collection("system_counters").doc("orders_sequence");
        const nextNum = await db.runTransaction(async (transaction) => {
          const counterDoc = await transaction.get(counterRef);
          let current = 0;
          if (counterDoc.exists) {
            current = counterDoc.data()?.current || 0;
          }
          const next = current + 1;
          transaction.set(counterRef, { current: next }, { merge: true });
          return next;
        });

        const year = new Date().getFullYear();
        const paddedNum = String(nextNum).padStart(4, "0");
        order.orderNumber = `ARCADIA-${year}-${paddedNum}`;
        order.updatedAt = new Date().toISOString();
        hasChanges = true;
        console.log(`[Mirrored Order Numbering] Auto-assigned number ${order.orderNumber} at index ${i}`);
      }
    }

    if (hasChanges) {
      await change.after.ref.set({ data: ordersList, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
  } else if (docName === "payments.json") {
    // B. Invoice Generation Automation for server-side mirrored payments
    const paymentsBefore = beforeData as any[];
    const paymentsAfter = afterData as any[];
    
    let hasInvoiceCreated = false;
    const invoicesList = await getJsonDb("invoices.json");
    const ordersList = await getJsonDb("orders.json");

    for (const payment of paymentsAfter) {
      // Find payments that transitioned to "Success"
      const wasSuccessBefore = paymentsBefore.some(p => p.id === payment.id && p.status === "Success");
      if (payment.status === "Success" && !wasSuccessBefore) {
        const alreadyExists = invoicesList.some((inv: any) => inv.paymentId === payment.id || inv.orderId === payment.orderId);
        if (!alreadyExists) {
          const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
          const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          
          const newInvoice = {
            id: invoiceId,
            orderId: payment.orderId,
            customerId: payment.customerId,
            invoiceNumber: invoiceNum,
            amount: payment.amount,
            gstAmount: Number((payment.amount * 0.18).toFixed(2)),
            pdfUrl: `https://storage.googleapis.com/${admin.storage().bucket().name}/invoices/${payment.customerId}/${invoiceId}.pdf`,
            status: "Paid",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            paymentId: payment.id
          };

          invoicesList.unshift(newInvoice);
          
          // Sync corresponding Order status
          const orderIdx = ordersList.findIndex((ord: any) => ord.id === payment.orderId);
          if (orderIdx !== -1) {
            ordersList[orderIdx].paymentStatus = "Paid";
            ordersList[orderIdx].invoiceId = invoiceId;
            ordersList[orderIdx].updatedAt = new Date().toISOString();
          }

          // Append audit activity log
          const logsList = await getJsonDb("logs.json");
          const logId = `log_${Date.now()}`;
          logsList.unshift({
            id: logId,
            userId: payment.customerId,
            action: `Successful payment verification mapped to invoice ${invoiceNum}`,
            timestamp: new Date().toISOString()
          });
          
          await saveJsonDb("logs.json", logsList.slice(0, 100));
          hasInvoiceCreated = true;
          console.log(`[Mirrored Invoice Automation] Generated Invoice ${invoiceNum} for payment: ${payment.id}`);
        }
      }
    }

    if (hasInvoiceCreated) {
      await saveJsonDb("invoices.json", invoicesList);
      await saveJsonDb("orders.json", ordersList);
    }
  }
});

/**
 * -------------------------------------------------------------
 * 4. AUTOMATED EMAIL TRIGGERS (WELCOME / VERIFICATION / RENEWAL)
 * -------------------------------------------------------------
 */

/**
 * Trigger: Welcome email and email verification dispatch on user document creation.
 */
export const onUserDocCreated = onDocumentCreated("users/{userId}", async (event: FirestoreEvent<any | undefined>) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const userData = snapshot.data();
  const email = userData?.email;
  const name = userData?.name || "Client";

  if (!email) return;

  try {
    // A. Dispatch Welcome Email
    const welcomeSubject = "Welcome to Arcadia – Co-Dev Hub!";
    const welcomeBody = `
      <p>Dear <strong>${name}</strong>,</p>
      <p>Welcome to Arcadia! Your client workspace is now fully initialized. You have successfully joined the next-generation co-development hub where elite software engineering meets absolute operational transparency.</p>
      <p>Here is what you can do inside your client console right now:</p>
      <ul>
        <li><strong>Track Active Schedules:</strong> Monitor real-time progress and milestones of your active software briefs.</li>
        <li><strong>Approve Milestone Payments:</strong> Securely review, approve, and settle developmental stage invoices using our integrated billing client.</li>
        <li><strong>Collaborate in Real-Time:</strong> Chat directly with assigned system engineers and product architects.</li>
        <li><strong>Book Consultations:</strong> Instantly schedule live consultations, system design reviews, or technical support sessions.</li>
      </ul>
      <p>If you have any questions or require custom assistance, simply reply to this email. Our engineering managers are always here to help.</p>
    `;
    await triggerMockEmail(email, welcomeSubject, welcomeBody, "Welcome");

    // B. Dispatch Email Verification code if unverified
    if (userData?.emailVerified === false) {
      const verifCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      await snapshot.ref.update({
        emailVerificationCode: verifCode,
        emailVerificationSentAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const verifSubject = "Verify Your Email Address – Arcadia Co-Dev Hub";
      const verifBody = `
        <p>Dear <strong>${name}</strong>,</p>
        <p>Thank you for registering at Arcadia! To complete your profile setup and secure your client workspace, please verify your email address.</p>
        <div style="text-align: center; margin: 28px 0;">
          <span style="background-color: rgba(59, 130, 246, 0.1); border: 1px dashed #3b82f6; color: #3b82f6; font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 12px 36px; border-radius: 8px; font-family: monospace;">
            ${verifCode}
          </span>
        </div>
        <p>Enter this verification code in your client dashboard to activate your workspace access. This code will expire in 15 minutes.</p>
      `;
      await triggerMockEmail(email, verifSubject, verifBody, "Verification");
    }
  } catch (err) {
    console.error(`Failed to handle welcome flow for user ${event.params.userId}:`, err);
  }
});

/**
 * Trigger: Email verification confirmation on document update
 */
export const onUserDocUpdated = onDocumentUpdated("users/{userId}", async (event: FirestoreEvent<any | undefined>) => {
  const change = event.data;
  if (!change) return;

  const beforeData = change.before.data();
  const afterData = change.after.data();

  // If emailVerified transitioned from false to true, send confirmation email
  if (beforeData?.emailVerified === false && afterData?.emailVerified === true) {
    const email = afterData?.email;
    const name = afterData?.name || "Client";
    if (!email) return;

    try {
      const subject = "Email Verified Successfully – Arcadia";
      const body = `
        <p>Dear <strong>${name}</strong>,</p>
        <p>Your email address <strong>${email}</strong> has been successfully verified!</p>
        <p>Your client workspace access is now fully unlocked. You can now submit active inquiries, start software projects, and schedule developmental milestones with our engineering hub.</p>
        <p>Thank you for verifying your profile!</p>
      `;
      await triggerMockEmail(email, subject, body, "Verification_Success");
    } catch (err) {
      console.error(`Failed to send verification success email for user ${event.params.userId}:`, err);
    }
  }
});

/**
 * Schedule: Daily automated renewal email check (3 days prior to renewal dates)
 */
export const maintenanceRenewalScanner = onSchedule("0 1 * * *", async () => {
  try {
    const subs = await getJsonDb("maintenance.json");
    console.log(`[Renewal Scanner] Scanning ${subs.length} maintenance subscriptions...`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let reminderCount = 0;

    for (const sub of subs) {
      if (sub.status === "Active" && sub.nextRenewalDate) {
        const renewalDate = new Date(sub.nextRenewalDate);
        renewalDate.setHours(0, 0, 0, 0);

        // Calculate time difference in days
        const diffTime = renewalDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 3) {
          const subject = `Upcoming Subscription Renewal Reminder – 3 Days Left`;
          const body = `
            <p>Dear <strong>${sub.clientName}</strong>,</p>
            <p>This is a friendly automated reminder that your monthly website maintenance subscription for <strong>${sub.projectName}</strong> is scheduled to auto-renew in <strong>3 days</strong>.</p>
            
            <div style="background-color: #0d1117; border-radius: 12px; padding: 20px; border: 1px solid #1f2937; margin: 20px 0;">
              <h3 style="color: #ffffff; font-size: 15px; margin: 0 0 14px 0; font-family: monospace; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">RENEWAL DETAILS</h3>
              <table style="width: 100%; font-size: 13px; color: #9ca3af; border-collapse: collapse;">
                <tr><td style="padding: 6px 0;">Project Name:</td><td style="color: #ffffff; text-align: right; font-weight: bold;">${sub.projectName}</td></tr>
                <tr><td style="padding: 6px 0;">Maintenance Plan:</td><td style="color: #3b82f6; text-align: right; font-weight: bold;">${sub.planName}</td></tr>
                <tr><td style="padding: 6px 0;">Renewal Amount:</td><td style="color: #10b981; text-align: right; font-weight: bold;">₹${sub.monthlyPrice?.toLocaleString("en-IN") || "0"}</td></tr>
                <tr><td style="padding: 6px 0;">AutoPay Date:</td><td style="color: #f59e0b; text-align: right; font-weight: bold;">${new Date(sub.nextRenewalDate).toLocaleDateString("en-IN")}</td></tr>
              </table>
            </div>

            <p>The system will automatically process this charge via your default payment method (UPI AutoPay, Card, or Net Banking) configured in Razorpay. Please ensure your account has sufficient balance to prevent monitoring and backup service disruptions.</p>
            <p>You can manage your payment details or adjust your plan settings at any time in your client dashboard.</p>
          `;
          await triggerMockEmail(sub.clientEmail, subject, body, "Maint_Renewal_Reminder");
          reminderCount++;
        }
      }
    }
    console.log(`[Renewal Scanner] Completed. Dispatched ${reminderCount} renewal reminders.`);
  } catch (err) {
    console.error("[Renewal Scanner] Error running renewal checks:", err);
  }
});

/**
 * -------------------------------------------------------------
 * 5. GDPR USER DELETION CLEANUP (DUAL-PARADIGM SWEEP)
 * -------------------------------------------------------------
 */

async function cleanupUserData(userId: string, email?: string) {
  console.log(`[GDPR Cleanup] Initiating secure data purging for User ID: ${userId}, Email: ${email || "unknown"}`);

  // A. Clean up individual Firestore collections
  const batch = db.batch();
  
  const mappings = [
    { col: "users", key: "id" },
    { col: "orders", key: "customerId" },
    { col: "payments", key: "customerId" },
    { col: "bookings", key: "userId" },
    { col: "inquiries", key: "userId" },
    { col: "supportTickets", key: "clientId" },
    { col: "notifications", key: "userId" },
    { col: "chatRooms", key: "userId" }
  ];

  for (const map of mappings) {
    try {
      const snap = await db.collection(map.col).where(map.key, "==", userId).get();
      snap.forEach((doc) => {
        batch.delete(doc.ref);
      });
    } catch (e) {
      console.error(`[GDPR Cleanup] Error querying collection ${map.col}:`, e);
    }

    if (email && (map.col === "bookings" || map.col === "inquiries")) {
      try {
        const snap = await db.collection(map.col).where("email", "==", email).get();
        snap.forEach((doc) => {
          batch.delete(doc.ref);
        });
      } catch (e) {
        console.error(`[GDPR Cleanup] Error querying collection ${map.col} by email:`, e);
      }
    }
  }

  try {
    await batch.commit();
    console.log(`[GDPR Cleanup] Completed batch Firestore deletes for userId: ${userId}`);
  } catch (err) {
    console.error(`[GDPR Cleanup] Error committing batch delete for userId: ${userId}:`, err);
  }

  // B. Clean up mirrored JSON database collections in arcadia_system_db
  const jsonDbs = [
    "users.json",
    "orders.json",
    "payments.json",
    "bookings.json",
    "inquiries.json",
    "notifications.json"
  ];

  for (const filename of jsonDbs) {
    try {
      const dataList = await getJsonDb(filename);
      if (dataList && Array.isArray(dataList)) {
        let filteredList = [];

        if (filename === "users.json") {
          filteredList = dataList.filter((item: any) => item.id !== userId && item.uid !== userId);
        } else if (filename === "orders.json" || filename === "payments.json") {
          filteredList = dataList.filter((item: any) => item.customerId !== userId);
        } else if (filename === "bookings.json" || filename === "inquiries.json") {
          filteredList = dataList.filter((item: any) => {
            const matchUser = item.userId !== userId;
            const matchEmail = email ? item.email !== email && item.clientEmail !== email : true;
            return matchUser && matchEmail;
          });
        } else if (filename === "notifications.json") {
          filteredList = dataList.filter((item: any) => item.userId !== userId);
        } else {
          filteredList = dataList;
        }

        if (filteredList.length !== dataList.length) {
          await saveJsonDb(filename, filteredList);
          console.log(`[GDPR Cleanup] Cleaned up ${dataList.length - filteredList.length} items from ${filename}`);
        }
      }
    } catch (e) {
      console.error(`[GDPR Cleanup] Error cleaning up ${filename}:`, e);
    }
  }

  // C. Delete from Firebase Auth if still exists
  try {
    const authUser = await admin.auth().getUser(userId);
    if (authUser) {
      await admin.auth().deleteUser(userId);
      console.log(`[GDPR Cleanup] Auth account deleted for userId: ${userId}`);
    }
  } catch (e: any) {
    if (e.code !== "auth/user-not-found") {
      console.error(`[GDPR Cleanup] Error checking/deleting auth user ${userId}:`, e);
    }
  }
}

/**
 * Trigger: GDPR Compliant secure user purge-on-demand via Auth User deletion
 */
export const onUserAuthDeleted = functions.auth.user().onDelete(async (user) => {
  await cleanupUserData(user.uid, user.email);
});

/**
 * Trigger: GDPR Compliant secure user purge-on-demand via Firestore user doc deletion
 */
export const onUserDocDeleted = onDocumentDeleted("users/{userId}", async (event: FirestoreEvent<any | undefined>) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const userData = snapshot.data();
  const userId = event.params.userId;
  const email = userData?.email;
  await cleanupUserData(userId, email);
});

/**
 * Callable: GDPR Compliant secure user purge-on-demand manually called from dashboard
 */
export const purgeUserData = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required for GDPR secure purge.");
  }

  try {
    const userRecord = await admin.auth().getUser(uid);
    await cleanupUserData(uid, userRecord.email);
    return { success: true, message: "User account and related Firestore PII purged successfully." };
  } catch (err: any) {
    console.error(`Error executing secure purge for UID ${uid}:`, err);
    throw new HttpsError("internal", err.message || "An error occurred during secure purge.");
  }
});

/**
 * -------------------------------------------------------------
 * 6. AUXILIARY PIPELINES (SCHEDULING & INQUIRY ALERTS)
 * -------------------------------------------------------------
 */

/**
 * Trigger: Dispatch notifications and audit logging on contact messages or reviews
 */
export const onNewContactMessage = onDocumentCreated("contactMessages/{msgId}", async (event: FirestoreEvent<any | undefined>) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const msgData = snapshot.data();
  const alertId = `alert_${Date.now()}`;

  try {
    // Notify administrators of active prospective leads
    await db.collection("notifications").doc(alertId).set({
      id: alertId,
      userId: "admins",
      title: "New Business Lead Inquiry",
      message: `Prospective client ${msgData?.name} sent an inquiry: ${msgData?.subject}`,
      read: false,
      type: "Lead",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to route contact alert:", error);
  }
});

/**
 * Schedule: Daily aggregation stats rollup
 */
export const dailyAnalyticsRollup = onSchedule("0 0 * * *", async () => {
  const today = new Date().toISOString().split("T")[0];
  const rollupId = `stats_${today}`;

  try {
    const ordersSnap = await db.collection("orders").where("createdAt", ">=", new Date(Date.now() - 24 * 60 * 60 * 1000)).get();
    let dailyRevenue = 0;
    ordersSnap.forEach((doc) => {
      dailyRevenue += doc.data().price || 0;
    });

    await db.collection("analytics").doc(rollupId).set({
      id: rollupId,
      date: today,
      eventType: "DailyRollup",
      revenue: dailyRevenue,
      volume: ordersSnap.size,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Daily stats rollup written: ${rollupId}`);
  } catch (error) {
    console.error("Daily analytics aggregation failed:", error);
  }
});

/**
 * Schedule: Automated Backups triggering
 */
export const backupFirestoreDatabase = onSchedule("0 2 * * *", async () => {
  const client = new admin.firestore.v1.FirestoreAdminClient();
  const databaseName = client.databasePath(admin.instanceId().app.options.projectId || "arcadia-developers", "(default)");
  const bucketName = `gs://${admin.instanceId().app.options.projectId || "arcadia-developers"}-backups`;

  try {
    await client.exportDocuments({
      name: databaseName,
      outputUriPrefix: bucketName,
      collectionIds: []
    });
    console.log(`Backup process dispatched successfully to ${bucketName}`);
  } catch (error) {
    console.error("Automated backup scheduling failed:", error);
  }
});

