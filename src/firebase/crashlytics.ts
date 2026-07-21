import { db, auth } from "./config";
import { collection, doc, setDoc } from "firebase/firestore";

export interface CrashReport {
  id: string;
  message: string;
  stack?: string;
  url: string;
  route: string;
  userAgent: string;
  userId?: string;
  userEmail?: string;
  severity: "error" | "warning" | "fatal";
  status: "open" | "resolved" | "ignored";
  createdAt: string;
}

// Active user tracking reference
let activeUser: { id: string; email: string } | null = null;

export function setCrashlyticsUser(user: { id: string; email: string } | null) {
  activeUser = user;
}

/**
 * Log a detailed client-side runtime exception or error to Firebase Firestore (Crashlytics for Web)
 */
export async function recordException(
  error: Error | any,
  severity: "error" | "warning" | "fatal" = "error"
): Promise<string> {
  const reportId = "crash_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  
  const report: CrashReport = {
    id: reportId,
    message: message || "Unknown runtime exception",
    stack: stack || new Error().stack || "",
    url: window.location.href,
    route: window.location.pathname + window.location.hash,
    userAgent: navigator.userAgent,
    userId: activeUser?.id || auth.currentUser?.uid || "guest",
    userEmail: activeUser?.email || auth.currentUser?.email || "anonymous",
    severity,
    status: "open",
    createdAt: new Date().toISOString()
  };

  try {
    const reportRef = doc(collection(db, "crashReports"), reportId);
    await setDoc(reportRef, report);
    console.warn(`[Firebase Crashlytics] Captured and logged exception ${reportId}:`, message);
  } catch (err) {
    // Fail silently in production, log locally
    console.error("[Firebase Crashlytics] Failed to log exception to Firestore:", err);
  }

  return reportId;
}

/**
 * Initialize global event handlers to listen for uncaught exceptions or unhandled promise rejections
 */
export function initCrashlytics() {
  if (typeof window === "undefined") return;

  // Uncaught exceptions
  window.addEventListener("error", (event) => {
    // Avoid logging benign or duplicate console warnings
    if (!event.error && !event.message) return;
    
    const errorObj = event.error || new Error(event.message);
    recordException(errorObj, "fatal");
  });

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const errorObj = reason instanceof Error ? reason : new Error(String(reason));
    recordException(errorObj, "error");
  });

  console.log("[Firebase Crashlytics] Web Monitoring active and capturing runtime exceptions.");
}
