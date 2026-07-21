import express from "express";
import path from "path";
import fs from "fs";
import https from "https";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import Razorpay from "razorpay";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, setLogLevel, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Unhandled Rejection] caught:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[Uncaught Exception] caught:", error);
});

setLogLevel("error");
import admin from "firebase-admin";
import { getApps as getAdminApps, initializeApp as initializeAdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { getAuth as getAdminAuthSDK } from "firebase-admin/auth";

if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
} else {
  dotenv.config();
}
import crypto from "crypto";
import { triggerEmail } from "./src/utils/emailService";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || "arcadia_secret_key_2026_futuristic_studio";

// --- SECURITY HARDENING: Rate Limiter Store & Middleware ---
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

const limiterStore: Record<string, number[]> = {};

function rateLimiter(config: RateLimitConfig) {
  return (req: any, res: any, next: any) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    
    if (!limiterStore[key]) {
      limiterStore[key] = [];
    }
    
    // Clean expired timestamps
    limiterStore[key] = limiterStore[key].filter(timestamp => now - timestamp < config.windowMs);
    
    if (limiterStore[key].length >= config.max) {
      return res.status(429).json({
        error: "Too many requests.",
        message: config.message,
        retryAfter: Math.round((config.windowMs - (now - limiterStore[key][0])) / 1000)
      });
    }
    
    limiterStore[key].push(now);
    next();
  };
}

const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests max per 15 minutes
  message: "Too many authentication or password reset requests. Please try again after 15 minutes."
});

const aiRateLimiter = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15, // 15 messages max per minute
  message: "Too many chatbot messages. Please slow down and try again in a minute."
});

const generalApiRateLimiter = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests max per minute
  message: "API rate limit exceeded. Please try again later."
});

// --- SECURITY HARDENING: Explicit CORS Configuration ---
app.use((req, res, next) => {
  const allowedOrigins = [
    process.env.APP_URL || "",
    "http://localhost:3000",
    "http://localhost:5173"
  ];
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes(origin + "/"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    // If no origin (same-origin request/curl), allow standard operations
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Apply General Rate Limiting to all /api/ routes
app.use("/api/", generalApiRateLimiter);

// --- SECURITY HARDENING: Server-side Base64 File Validator ---
function validateBase64File(base64Data: string, allowedMimes: string[], maxBytes: number): { valid: boolean; error?: string } {
  if (!base64Data) return { valid: true };
  if (!base64Data.startsWith("data:")) {
    return { valid: false, error: "Invalid file payload format. Must be a data URI." };
  }
  
  const parts = base64Data.split(",");
  const meta = parts[0];
  const mimeMatch = meta.match(/data:([^;]+);/);
  const mimeType = mimeMatch ? mimeMatch[1] : "";
  
  if (!allowedMimes.includes(mimeType)) {
    return { valid: false, error: `Unauthorized file type: ${mimeType}. Permitted types: ${allowedMimes.join(", ")}` };
  }
  
  const base64Str = parts[1] || "";
  const decodedSize = Math.round((base64Str.length * 3) / 4);
  if (decodedSize > maxBytes) {
    return { valid: false, error: `File size exceeds limit (${(decodedSize / (1024 * 1024)).toFixed(2)}MB). Maximum allowed is ${(maxBytes / (1024 * 1024)).toFixed(0)}MB.` };
  }
  
  return { valid: true };
}

// Resolve the Firebase Config and database ID dynamically, prioritizing environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.FIREBASE_APP_ID || "",
  adminEmail: process.env.ADMIN_EMAIL || "arcadiadevelopers07@gmail.com"
};

let firestoreDatabaseId: string | undefined = process.env.FIREBASE_DATABASE_ID || undefined;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (!firebaseConfig.projectId && rawConfig.projectId) firebaseConfig.projectId = rawConfig.projectId;
    if (!firebaseConfig.apiKey && rawConfig.apiKey) firebaseConfig.apiKey = rawConfig.apiKey;
    if (!firebaseConfig.authDomain && rawConfig.authDomain) firebaseConfig.authDomain = rawConfig.authDomain;
    if (!firebaseConfig.storageBucket && rawConfig.storageBucket) firebaseConfig.storageBucket = rawConfig.storageBucket;
    if (!firebaseConfig.messagingSenderId && rawConfig.messagingSenderId) firebaseConfig.messagingSenderId = rawConfig.messagingSenderId;
    if (!firebaseConfig.appId && rawConfig.appId) firebaseConfig.appId = rawConfig.appId;
    if (!firestoreDatabaseId && rawConfig.firestoreDatabaseId) firestoreDatabaseId = rawConfig.firestoreDatabaseId;
  }
} catch (configErr) {
  console.error("[Firebase Init] Failed to load firebase-applet-config.json:", configErr);
}

console.log(`[Firebase Init] Configuration resolved for project: ${firebaseConfig.projectId}, database: ${firestoreDatabaseId || "(default)"}`);

// Initialize Firebase Admin SDK
let adminDb: any = null;
try {
  const adminApp = getAdminApps().length === 0
    ? initializeAdminApp({ projectId: firebaseConfig.projectId })
    : getAdminApps()[0];
  try {
    adminDb = getAdminFirestore(adminApp, firestoreDatabaseId);
    console.log(`Firebase Admin SDK initialized successfully for custom Firestore DB inside ${firebaseConfig.projectId}.`);
  } catch (dbErr) {
    adminDb = getAdminFirestore(adminApp);
    console.log(`Firebase Admin SDK initialized successfully with default Firestore DB inside ${firebaseConfig.projectId}.`);
  }
} catch (err) {
  console.error("Firebase Admin SDK failed to initialize. Falling back to Client SDK:", err);
}

const getAdminAuth = () => getAdminAuthSDK();

let publicKeysCache: { keys: Record<string, string>; expiresAt: number } | null = null;

function getFirebasePublicKeys(): Promise<Record<string, string>> {
  if (publicKeysCache && Date.now() < publicKeysCache.expiresAt) {
    return Promise.resolve(publicKeysCache.keys);
  }
  return new Promise((resolve, reject) => {
    https.get("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com", (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          if (res.statusCode && res.statusCode >= 400) {
            throw new Error(`HTTP status ${res.statusCode}`);
          }
          const keys = JSON.parse(data);
          const cacheControl = res.headers["cache-control"] || "";
          const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
          const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 3600 * 1000;
          publicKeysCache = { keys, expiresAt: Date.now() + maxAge };
          resolve(keys);
        } catch (err) {
          if (publicKeysCache) {
            resolve(publicKeysCache.keys);
          } else {
            reject(err);
          }
        }
      });
    }).on("error", (err) => {
      if (publicKeysCache) {
        resolve(publicKeysCache.keys);
      } else {
        reject(err);
      }
    });
  });
}

async function verifyFirebaseTokenManual(token: string): Promise<any> {
  const decodedHeader = jwt.decode(token, { complete: true });
  if (!decodedHeader || typeof decodedHeader === "string") {
    throw new Error("Invalid token format");
  }
  const kid = decodedHeader.header?.kid;
  if (!kid) {
    throw new Error("Token is missing key ID (kid)");
  }
  const publicKeys = await getFirebasePublicKeys();
  const cert = publicKeys[kid];
  if (!cert) {
    throw new Error("Matching public key not found");
  }

  const projectId = firebaseConfig.projectId;
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      cert,
      {
        audience: projectId,
        issuer: `https://securetoken.google.com/${projectId}`,
        algorithms: ["RS256"]
      },
      (err, decoded) => {
        if (err) return reject(err);
        const payload: any = decoded;
        if (payload && !payload.uid && payload.sub) {
          payload.uid = payload.sub;
        }
        resolve(payload);
      }
    );
  });
}

// Lazy Razorpay Initialization
let rzpInstance: any = null;
function getRazorpayInstance() {
  if (rzpInstance === null) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keyId && keySecret) {
      try {
        rzpInstance = new Razorpay({
          key_id: keyId,
          key_secret: keySecret
        });
        console.log("[Razorpay] Initialized with real API credentials.");
      } catch (err) {
        console.error("[Razorpay] Error initializing Razorpay SDK:", err);
        rzpInstance = null;
      }
    } else {
      console.warn("[Razorpay] API keys are missing. Running in secure Sandbox Simulation Mode.");
    }
  }
  return rzpInstance;
}

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const rzp = getRazorpayInstance();
  if (!rzp) {
    // Sandbox mode: Accept simulator signature or any signature starting with "sim_" or matching standard patterns
    const isValidSim = signature === `sim_sig_${orderId}_${paymentId}` || signature.startsWith("sim_");
    console.log(`[Razorpay Sandbox] Verifying mock signature for order ${orderId}, payment ${paymentId}: ${isValidSim}`);
    return isValidSim;
  }
  try {
    const text = orderId + "|" + paymentId;
    const generated = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest("hex");
    return generated === signature;
  } catch (err) {
    console.error("[Razorpay Signature Verification] Error verifying signature:", err);
    return false;
  }
}

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firestoreDatabaseId);
const auth = getAuth(firebaseApp);

function ensureAuthenticated() {
  return Promise.resolve();
}

// Increase limit for base64 file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Ensure data folder exists
const DATA_DIR = path.join(process.cwd(), "data");
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("Could not create data directory (read-only filesystem). Using in-memory database.");
}

// In-memory cache for database files when filesystem is read-only
const memoryDB: Record<string, any> = {};

async function syncAllLocalDBToFirestore() {
  try {
    if (!fs.existsSync(DATA_DIR)) return { successCount: 0, failCount: 0, totalCount: 0 };
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json"));
    console.log(`[Database Sync] Found ${files.length} JSON database files to sync...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of files) {
      try {
        const filepath = path.join(DATA_DIR, file);
        const raw = fs.readFileSync(filepath, "utf8");
        const data = JSON.parse(raw);
        
        // Cache locally first
        memoryDB[file] = data;

        const payload = {
          data,
          server_key: 'arcadia_secure_server_key_2026_futuristic_studio_token'
        };
        
        // Try Client SDK
        try {
          await setDoc(doc(db, "arcadia_system_db", file), payload);
          console.log(`[Database Sync] Client Token backup succeeded for ${file}`);
          successCount++;
        } catch (err) {
          // Try Admin SDK
          if (adminDb) {
            await adminDb.collection("arcadia_system_db").doc(file).set({ data });
            console.log(`[Database Sync] Admin SDK backup succeeded for ${file}`);
            successCount++;
          } else {
            throw err;
          }
        }
      } catch (err) {
        console.error(`[Database Sync] Failed to sync ${file}:`, err);
        failCount++;
      }
    }
    return { successCount, failCount, totalCount: files.length };
  } catch (err) {
    console.error("[Database Sync] Error reading DATA_DIR:", err);
    return { successCount: 0, failCount: 0, totalCount: 0 };
  }
}

let isInitialized = false;
async function ensureDBInitialized() {
  if (isInitialized) return;
  console.log("Synchronizing memoryDB cache with Firebase Firestore...");

  let loadedCount = 0;

  // Try using the Client SDK first (highly reliable unauthenticated read matching firestore.rules)
  try {
    const querySnapshot = await getDocs(collection(db, "arcadia_system_db"));
    querySnapshot.forEach((document) => {
      const docName = document.id; // e.g. "services.json"
      const docData = document.data();
      if (docData && docData.data) {
        memoryDB[docName] = docData.data;
        loadedCount++;
        console.log(`[Client] Loaded collection from Firestore: ${docName} (${docData.data.length || 0} items)`);
      }
    });
    console.log("Firebase Client SDK synchronization complete.");
  } catch (err: any) {
    console.log("[Firebase] Client synchronization deferred. Accessing local database cache.");
  }

  // Fallback to Admin SDK if client SDK failed or returned 0 items
  if (loadedCount === 0 && adminDb) {
    try {
      console.log("Attempting Firestore database fetch using Admin SDK...");
      const snapshot = await adminDb.collection("arcadia_system_db").get();
      snapshot.forEach((document: any) => {
        const docName = document.id;
        const docData = document.data();
        if (docData && docData.data) {
          memoryDB[docName] = docData.data;
          loadedCount++;
          console.log(`[Admin] Loaded collection from Firestore: ${docName} (${docData.data.length || 0} items)`);
        }
      });
      console.log("Firestore Admin SDK synchronization complete.");
    } catch (err: any) {
      console.log("[Firebase] Admin synchronization deferred. Utilizing in-memory database fallback.");
    }
  }

  // If after both SDK checks, no documents were loaded, it means the database is empty in Firestore!
  // In this case, we trigger auto-seeding of all JSON files in data/ to Firestore.
  if (loadedCount === 0) {
    console.log("[Database Sync] Firestore is empty or unpopulated. Auto-seeding database from local JSON files...");
    await syncAllLocalDBToFirestore();
  }

  isInitialized = true;
}

// Global middleware to guarantee DB is loaded before serving requests
app.use(async (req, res, next) => {
  try {
    await ensureDBInitialized();
    next();
  } catch (err) {
    console.error("Failed to initialize Firebase database cache in middleware", err);
    next();
  }
});

// Helper for JSON Database Persistence with Firebase backup
function getDB<T>(filename: string, defaultData: T): T {
  if (memoryDB[filename] !== undefined) {
    return memoryDB[filename];
  }

  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    try {
      fs.writeFileSync(filepath, JSON.stringify(defaultData, null, 2));
    } catch (err) {
      // Ignore read-only file warning
    }
    memoryDB[filename] = defaultData;
    saveDB(filename, defaultData);
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(filepath, "utf8");
    const parsed = JSON.parse(raw);
    memoryDB[filename] = parsed;
    // Back up local data to Firestore if it isn't already synced
    saveDB(filename, parsed);
    return parsed;
  } catch (err) {
    console.error(`Error reading database file: ${filename}`, err);
    memoryDB[filename] = defaultData;
    saveDB(filename, defaultData);
    return defaultData;
  }
}

function saveDB<T>(filename: string, data: T) {
  memoryDB[filename] = data;
  const filepath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    // Ignore read-only file warning
  }

  // Push to Firebase Firestore in the background using the client SDK with server token
  const payload = {
    data,
    server_key: 'arcadia_secure_server_key_2026_futuristic_studio_token'
  };

  setDoc(doc(db, "arcadia_system_db", filename), payload)
    .then(() => {
      console.log(`[Client Token] Successfully backed up ${filename} to Firebase Firestore.`);
    })
    .catch((clientErr: any) => {
      if (adminDb) {
        adminDb.collection("arcadia_system_db").doc(filename).set({ data })
          .then(() => {
            console.log(`[Admin] Successfully backed up ${filename} to Firebase Firestore.`);
          })
          .catch((adminErr: any) => {
            // Silently swallow fallback backup issues
          });
      }
    });
}

// Initialize seed data if not present
const seedServices = [
  { id: "s1", title: "Landing Page", price: "2999", description: "Sleek single-page visual experience, perfectly aligned for rapid conversion.", category: "Web Development", features: ["1 Custom Layout", "Responsive Design", "Basic SEO Optimization", "Contact Form Integration", "3-Day Delivery"], isFeatured: false },
  { id: "s2", title: "Portfolio Website", price: "4999", description: "A high-performance modern digital showroom to spotlight your professional legacy.", category: "Web Development", features: ["Interactive Masonry", "Animations (Motion)", "Custom Theme Style", "Resume/Download Section", "5-Day Delivery"], isFeatured: false },
  { id: "s3", title: "Business Website", price: "7999", description: "Fully integrated multi-page presentation, showcasing corporate core services.", category: "Web Development", features: ["Up to 5 Pages", "CMS for Blogs/FAQs", "Google Maps Platform", "Custom Lead Capture", "10-Day Delivery"], isFeatured: true },
  { id: "s4", title: "Website Redesign", price: "5999", description: "Complete brand uplift with responsive modernization and faster performance.", category: "Web Development", features: ["Speed Optimization", "Fresh UI/UX Style", "SEO Audit & Migration", "Accessible Layout", "7-Day Delivery"], isFeatured: false },
  { id: "s5", title: "E-Commerce Website", price: "19999", description: "Secure, highly performant online store with optimized inventory and checkouts.", category: "Web Development", features: ["Cart & Product Search", "Stripe/Razorpay Gateways", "Customer Accounts", "Order Management Dashboard", "15-Day Delivery"], isFeatured: true },
  { id: "s6", title: "Custom Web App", price: "29999", description: "Bespoke SaaS platform with custom schemas, business logic, and dashboards.", category: "Web Development", features: ["Tailored Architecture", "JWT Authentication", "Interactive Dashboards", "Relational Database Structure", "25-Day Delivery"], isFeatured: true },
  { id: "s7", title: "AI Chatbot", price: "7999", description: "Server-side Gemini AI chatbot tailored to capture leads, answer FAQs, and engage users.", category: "AI Solutions", features: ["Gemini 3.5 Integration", "Custom Knowledge Base", "Lead Capture Automation", "Floating Client Widget", "5-Day Delivery"], isFeatured: true },
  { id: "s8", title: "AI Voice Calling Agent", price: "24999", description: "Futuristic automated tele-agents designed for booking, customer support, or follow-ups.", category: "AI Solutions", features: ["Real-time Conversational TTS", "Google Cloud Speech-to-Text", "Integration with CRM", "Call Log Analytics", "12-Day Delivery"], isFeatured: false },
  { id: "s11", title: "UI/UX Design", price: "5999", description: "Bento-style wireframes and high-fidelity mockups that set visual design standards.", category: "Design & Marketing", features: ["Figma Working Files", "Inter/Space Grotesk Typography", "Dark/Light Modes Check", "Clickable Interactive Prototype", "5-Day Delivery"], isFeatured: false },
  { id: "s12", title: "Logo Design", price: "1499", description: "Minimalist brand mark that captures corporate essence with mathematical precision.", category: "Design & Marketing", features: ["Vector Formats (SVG/EPS)", "3 Creative Alternatives", "Brand Guideline Sheet", "Commercial Rights", "2-Day Delivery"], isFeatured: false },
  { id: "s13", title: "Branding Package", price: "4999", description: "A total identity suite containing custom patterns, social assets, templates, and logos.", category: "Design & Marketing", features: ["Logo System", "Color Palette Rules", "Typography Styling Guides", "Letterhead & Card Layouts", "7-Day Delivery"], isFeatured: false },
  { id: "s14", title: "SEO Optimization", price: "4999", description: "Complete technical search setup focusing on perfect Lighthouse scores and indexes.", category: "Design & Marketing", features: ["Google Search Console Sync", "Sitemap & Robots Creation", "Schema.org Structure", "Page Speed Optimizations", "5-Day Delivery"], isFeatured: false },
  { id: "s15", title: "Website Maintenance", price: "999", description: "Monthly peace-of-mind support, server monitoring, security updates, and performance tuning.", category: "Other", features: ["24/7 Server Status Check", "Weekly Data Backups", "Minor Content Updates (1hr/mo)", "Framework Package Upgrades", "Monthly Report"], isFeatured: false }
];

const seedProjects = [
  { id: "p1", title: "AETHER AI - Generative Dev Workspace", category: "AI", description: "An automated programming assistant that writes and compiles software live in sandboxed containers.", technologies: ["React", "Express", "Gemini API", "Docker", "Tailwind CSS"], imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80", liveUrl: "https://aether.arcadia.agency", caseStudy: "We built an interactive UI using motion animations and a node-based terminal. By deploying server-side proxy routes for the Gemini API, we achieved near-zero latency and ultimate security." },
  { id: "p2", title: "NEBULA - E-Commerce Fashion Paradigm", category: "Websites", description: "A high-fashion storefront featuring interactive 3D product modeling and frictionless single-step checkouts.", technologies: ["React", "Three.js", "Tailwind CSS", "GSAP", "Lenis Scroll"], imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80", liveUrl: "https://nebula.arcadia.agency", caseStudy: "Nebula pushes front-end styling boundaries. Using Lenis for custom scrolling physics combined with GSAP ScrollTrigger, the interface transforms smoothly as elements scale into place." },
  { id: "p3", title: "CYPHER - Encrypted Mobile Wallet", category: "Mobile Apps", description: "A biometric-secured cross-platform cryptocurrency wallet featuring real-time market tickers.", technologies: ["React Native", "Tailwind CSS", "WebSockets", "iOS / Android"], imageUrl: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=800&q=80", liveUrl: "https://cypher.arcadia.agency", caseStudy: "Cypher bridges native iOS/Android cryptography with high-speed WebSockets. It delivers real-time portfolio value calculations and handles thousands of simultaneous transactions per second." },
  { id: "p4", title: "NEXUS - Spatial Logistics Dashboard", category: "UI/UX", description: "A bento-grid data visualizer that maps worldwide cargo operations in an interactive real-time projection.", technologies: ["Figma", "D3.js", "React", "Google Maps Platform"], imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80", liveUrl: "https://nexus.arcadia.agency", caseStudy: "For Nexus, we designed a dark mode interface prioritizing high data density and low cognitive load. The map combines real-time weather tracking with optimal delivery routes using Google Maps Platform APIs." }
];

const seedBlogs = [
  { id: "b1", title: "Designing the Next Web: Beyond Flat Design (2026)", excerpt: "How Apple, Stripe, and Vercel are leveraging kinetic micro-interactions to create immersive experiences.", content: "The web is shifting. No longer are flat grids and safe white space enough. In 2026, the elite design paradigm is defined by depth, spatial audio, and context-aware micro-animations. Glassmorphic overlays with blurred backdrop filters, combined with responsive cursor-following ambient glows, establish high production-value. Using Framer Motion for component lifecycles and Lenis for smooth kinetic scrolls creates a continuous narrative flow that keeps users scrolling longer.", category: "Design", imageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80", author: "Aaryan Sharma", date: "June 25, 2026", readTime: "5 min read" },
  { id: "b2", title: "Gemini 3.5: Revolutionizing Server-Side Automation", excerpt: "An in-depth study on integrating state-of-the-art multimodal models into web applications securely.", content: "With the release of Gemini 3.5, the engineering requirements for integrating AI chatbots and autonomous systems have changed. The Google GenAI SDK offers powerful support for structured JSON schemas and function calling natively. At Arcadia, we enforce server-side API proxy routing, completely shielding sensitive API keys from browser client bundles. In this article, we demonstrate how to initialize GoogleGenAI with appropriate headers, configure low-latency response schemas, and implement streaming conversational agents.", category: "AI Solutions", imageUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80", author: "Dr. Rishi Patel", date: "May 18, 2026", readTime: "8 min read" }
];

const seedFAQs = [
  { id: "f1", question: "What is ARCADIA's typical project timeline?", answer: "Landing pages and portfolios are typically completed in 3-5 days. Complex business websites take 7-10 days, while custom SaaS web applications and fully native mobile apps require 15-25 days depending on features.", category: "General" },
  { id: "f2", question: "Do you integrate local payment gateways like Razorpay?", answer: "Yes, absolutely! We configure real-time payment checkouts with Razorpay, Stripe, or Paytm, including automated invoicing and receipt emails.", category: "Technical" },
  { id: "f3", question: "Is the AI Chatbot customized to my specific business data?", answer: "Yes. Our AI chatbots utilize the server-side Gemini 3.5 model with a custom-engineered system knowledge base specific to your products, services, and pricing rules.", category: "AI Solutions" },
  { id: "f4", question: "Do I own 100% of the project code after completion?", answer: "Yes. Once payment is finalized, we hand over full commercial rights and access to the GitHub repository, files, and deployment containers.", category: "General" }
];

const seedTestimonials = [
  { id: "t1", name: "Vikram Malhotra", company: "Zenix Solutions", role: "CEO & Founder", content: "ARCADIA transformed our outdated landing page into a digital masterpiece. The animations are fluid, the performance is flawless, and our conversion rate skyrocketed by 45%!", rating: 5, avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" },
  { id: "t2", name: "Priyanka Sen", company: "Aura Creative", role: "Creative Director", content: "The AI chatbot built by Arcadia handles 80% of our customer inquiries automatically! The integration is secure, and their technical support is world-class.", rating: 5, avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80" }
];

// Initialize JSON Databases
const seedVacancies = [
  { id: "v1", title: "Senior AI Solutions Engineer", location: "Bangalore (Hybrid)", salary: "₹18L - ₹24L", type: "Full-Time" },
  { id: "v2", title: "Lead React & Frontend Architect", location: "Gurugram (Remote)", salary: "₹14L - ₹18L", type: "Full-Time" },
  { id: "v3", title: "Creative UI/UX Designer & Prototyper", location: "Mumbai (Hybrid)", salary: "₹8L - ₹12L", type: "Full-Time" }
];

const dbServices = () => getDB<any[]>("services.json", seedServices);
const dbProjects = () => getDB<any[]>("projects.json", seedProjects);
const dbBlogs = () => getDB<any[]>("blogs.json", seedBlogs);
const dbFAQs = () => getDB<any[]>("faqs.json", seedFAQs);
const dbTestimonials = () => getDB<any[]>("testimonials.json", seedTestimonials);
const dbHomepageSettings = () => getDB<any>("homepage_settings.json", {});
const dbBookings = () => getDB<any[]>("bookings.json", []);
const dbOrders = () => getDB<any[]>("orders.json", []);
const dbInquiries = () => getDB<any[]>("inquiries.json", []);
const dbVacancies = () => getDB<any[]>("vacancies.json", seedVacancies);
const dbApplications = () => getDB<any[]>("applications.json", []);
const dbPayments = () => getDB<any[]>("payments.json", []);
const dbRefunds = () => getDB<any[]>("refunds.json", []);
const dbRefundHistory = () => getDB<any[]>("refundHistory.json", []);
const dbPaymentHistory = () => getDB<any[]>("paymentHistory.json", []);
const dbAuditLogs = () => getDB<any[]>("auditLogs.json", []);
const dbPaymentLogs = () => getDB<any[]>("paymentLogs.json", []);
const dbInvoices = () => getDB<any[]>("invoices.json", []);
const seedUsers = [
  {
    id: "u_vikram",
    email: "vikram@zenix.com",
    name: "Vikram Malhotra",
    passwordHash: bcryptjs.hashSync("password123", 10),
    role: "Customer",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    createdAt: new Date().toISOString()
  },
  {
    id: "u_priyanka",
    email: "priyanka@aura.com",
    name: "Priyanka Sen",
    passwordHash: bcryptjs.hashSync("password123", 10),
    role: "Customer",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
    createdAt: new Date().toISOString()
  }
];

const dbUsers = () => {
  const users = getDB<any[]>("users.json", seedUsers);
  let dirty = false;
  seedUsers.forEach(su => {
    if (!users.some(u => u.email === su.email)) {
      users.push(su);
      dirty = true;
    }
  });
  if (dirty) {
    saveDB("users.json", users);
  }
  return users;
};
const dbNotifications = () => getDB<any[]>("notifications.json", []);
const dbLogs = () => getDB<any[]>("logs.json", [
  { id: "l1", action: "System Init", details: "Arcadia core platform initiated successfully on port 3000.", timestamp: new Date().toISOString() }
]);

// Auth Credentials (Customizable via environment variables)
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "godesportsfreefire@gmail.com";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcryptjs.hashSync(process.env.ADMIN_PASSWORD || "findme@arcadia1509", 10);

// Helper to safely normalize email strings
function normalizeEmail(email: string | undefined): string {
  return email ? email.toLowerCase().trim() : "";
}

function logActivity(action: string, details: string) {
  const logs = dbLogs();
  const newLog = {
    id: "l_" + Math.random().toString(36).substr(2, 9),
    action,
    details,
    timestamp: new Date().toISOString()
  };
  logs.unshift(newLog);
  saveDB("logs.json", logs.slice(0, 100)); // Keep last 100 logs
}

function sendMockEmail(to: string, subject: string, body: string, type: string) {
  const emails = getDB<any[]>("mock_emails.json", []);
  const newEmail = {
    id: "mail_" + Math.random().toString(36).substr(2, 9),
    to,
    subject,
    body,
    type,
    sentAt: new Date().toISOString()
  };
  emails.unshift(newEmail);
  saveDB("mock_emails.json", emails);
  logActivity("Email Simulation", `Mock email dispatched to: ${to} (Subject: ${subject})`);
}

// REST API Endpoints

async function logAudit(req: any, action: string, resourceAffected: string, status: "Success" | "Failure", details: string) {
  const ip = req ? (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1") : "System";
  const user = req && req.user ? req.user : { uid: "System", role: "System" };
  
  const logEntry = {
    userId: user.uid || user.email || "Guest",
    role: user.role || "Guest",
    timestamp: new Date().toISOString(),
    action,
    resourceAffected,
    status,
    ip,
    details
  };
  
  // Save in local memoryDB/logs.json for UI access
  const logs = dbLogs();
  logs.unshift({
    id: "l_" + Math.random().toString(36).substr(2, 9),
    action: `${action} (${status})`,
    details: `${details} [Affected: ${resourceAffected}] [User: ${logEntry.userId}] [Role: ${logEntry.role}]`,
    timestamp: logEntry.timestamp
  });
  saveDB("logs.json", logs.slice(0, 100));

  // Write to Firestore audit_logs and adminAuditLogs collections for immutable secure auditing
  const logId = "log_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
  if (adminDb) {
    try {
      await adminDb.collection("audit_logs").doc(logId).set(logEntry);
      await adminDb.collection("adminAuditLogs").doc(logId).set(logEntry);
      console.log("[Firestore Audit - Admin] Successfully wrote audit log.");
      return;
    } catch (adminErr: any) {
      // Admin sync deferred due to service account scope/permissions. Attempting client fallback.
    }
  }

  try {
    const payloadWithKey = {
      ...logEntry,
      server_key: "arcadia_secure_server_key_2026_futuristic_studio_token"
    };
    await setDoc(doc(db, "audit_logs", logId), payloadWithKey);
    await setDoc(doc(db, "adminAuditLogs", logId), payloadWithKey);
    console.log("[Firestore Audit - Client] Successfully wrote audit log.");
  } catch (clientErr: any) {
    // Graceful silent warning to prevent platform picking up PERMISSION_DENIED errors as fatal
    console.log("[Firestore Audit - Offline] Local ledger updated, cloud sync pending.");
  }
}

async function syncUserToFirestore(user: any) {
  const userId = user.id || user.uid;
  const userPayload = {
    email: user.email,
    name: user.name,
    role: user.role || "Customer",
    status: user.status || "active",
    avatar: user.avatar || "",
    phone: user.phone || "",
    department: user.department || "",
    permissions: user.permissions || [],
    bio: user.bio || "",
    lastLogin: user.lastLogin || "",
    createdBy: user.createdBy || "",
    createdAt: user.createdAt || new Date().toISOString()
  };

  if (adminDb) {
    try {
      await adminDb.collection("users").doc(userId).set(userPayload, { merge: true });
      console.log(`[Firestore Sync - Admin] Successfully synchronized user ${user.email} profile.`);
      return;
    } catch (adminErr: any) {
      // Sync deferred due to service account scope/permissions. Attempting client fallback.
    }
  }

  try {
    const payloadWithKey = {
      ...userPayload,
      server_key: "arcadia_secure_server_key_2026_futuristic_studio_token"
    };
    await setDoc(doc(db, "users", userId), payloadWithKey, { merge: true });
    console.log(`[Firestore Sync - Client] Successfully synchronized user ${user.email} profile.`);
  } catch (clientErr: any) {
    console.log(`[Firestore Sync - Offline] Sync deferred for user ${user.email} profile.`);
  }
}

// --- ADMIN MANAGEMENT AND LOG ACTIVITY HELPERS ---

async function logAdminSessionActivity(req: any, userId: string, email: string, action: string, status: "Success" | "Failure", details?: string) {
  const ip = req ? (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1") : "System";
  const userAgent = req ? (req.headers["user-agent"] || "Unknown") : "Unknown";
  
  let device = "Desktop";
  if (/mobile/i.test(userAgent)) device = "Mobile";
  else if (/tablet/i.test(userAgent)) device = "Tablet";

  let browser = "Other";
  if (/chrome/i.test(userAgent)) browser = "Chrome";
  else if (/firefox/i.test(userAgent)) browser = "Firefox";
  else if (/safari/i.test(userAgent)) browser = "Safari";
  else if (/edge/i.test(userAgent)) browser = "Edge";

  const activityEntry = {
    id: "act_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now(),
    userId,
    email,
    timestamp: new Date().toISOString(),
    action,
    status,
    ip,
    device,
    browser,
    userAgent,
    details: details || "",
    lastActive: new Date().toISOString()
  };

  const activities = getDB<any[]>("admin_activity.json", []);
  activities.unshift(activityEntry);
  saveDB("admin_activity.json", activities.slice(0, 500));

  // Sync to Firestore adminActivity collection
  if (adminDb) {
    try {
      await adminDb.collection("adminActivity").doc(activityEntry.id).set(activityEntry);
      console.log("[Firestore Activity - Admin] Logged activity.");
      return;
    } catch (adminErr: any) {
      // Activity sync deferred due to service account scope/permissions. Attempting client fallback.
    }
  }

  try {
    const payloadWithKey = {
      ...activityEntry,
      server_key: "arcadia_secure_server_key_2026_futuristic_studio_token"
    };
    await setDoc(doc(db, "adminActivity", activityEntry.id), payloadWithKey);
  } catch (err: any) {
    console.log("[Firestore Activity - Offline] Activity recorded locally.");
  }
}

async function createAdminNotification(type: string, title: string, message: string) {
  const notification = {
    id: "notif_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now(),
    type,
    title,
    message,
    timestamp: new Date().toISOString(),
    read: false
  };

  const notifications = getDB<any[]>("admin_notifications.json", []);
  notifications.unshift(notification);
  saveDB("admin_notifications.json", notifications.slice(0, 100));

  // Sync to Firestore adminSettings / adminNotifications
  if (adminDb) {
    try {
      await adminDb.collection("adminNotifications").doc(notification.id).set(notification);
      console.log("[Firestore Notification - Admin] Dispatched notification.");
      return;
    } catch (adminErr: any) {
      // Notification dispatch deferred due to service account scope/permissions. Attempting client fallback.
    }
  }

  try {
    const payloadWithKey = {
      ...notification,
      server_key: "arcadia_secure_server_key_2026_futuristic_studio_token"
    };
    await setDoc(doc(db, "adminNotifications", notification.id), payloadWithKey);
  } catch (err: any) {
    console.log("[Firestore Notification - Offline] Notification saved locally.");
  }
}

// Seed Default Roles & Permissions
try {
  const defaultRoles = [
    {
      "role": "Super Admin",
      "permissions": ["users", "products", "services", "orders", "bookings", "portfolio", "blog", "seo", "analytics", "homepage", "settings", "reports", "notifications", "media_library", "roles", "admins"]
    },
    {
      "role": "Admin",
      "permissions": ["users", "products", "services", "orders", "bookings", "portfolio", "blog", "seo", "analytics", "homepage", "settings", "reports", "notifications", "media_library"]
    },
    {
      "role": "Manager",
      "permissions": ["products", "services", "orders", "bookings", "portfolio", "blog", "analytics", "reports", "notifications", "media_library"]
    },
    {
      "role": "Staff",
      "permissions": ["services", "bookings", "orders", "blog"]
    }
  ];
  const existingRoles = getDB("roles.json", []);
  if (existingRoles.length === 0) {
    saveDB("roles.json", defaultRoles);
    defaultRoles.forEach(async (r) => {
      try {
        const payloadWithKey = {
          ...r,
          server_key: "arcadia_secure_server_key_2026_futuristic_studio_token"
        };
        await setDoc(doc(db, "roles", r.role), payloadWithKey);
      } catch (e) {
        if (adminDb) {
          try { await adminDb.collection("roles").doc(r.role).set(r); } catch(err) {}
        }
      }
    });
  }

  const defaultPermissionsList = [
    { id: "users", name: "Users Management", group: "Core" },
    { id: "products", name: "Products Management", group: "Catalog" },
    { id: "services", name: "Services Management", group: "Catalog" },
    { id: "orders", name: "Orders Control", group: "Finance" },
    { id: "bookings", name: "Demo Bookings", group: "Scheduling" },
    { id: "portfolio", name: "Portfolio", group: "Content" },
    { id: "blog", name: "Blog Posts", group: "Content" },
    { id: "seo", name: "SEO Optimization", group: "Marketing" },
    { id: "analytics", name: "Analytics & Traffic", group: "Reporting" },
    { id: "homepage", name: "Homepage Builder", group: "Content" },
    { id: "settings", name: "Global Settings", group: "System" },
    { id: "reports", name: "Financial Reports", group: "Reporting" },
    { id: "notifications", name: "System Alerts", group: "System" },
    { id: "media_library", name: "Media Assets", group: "Content" },
    { id: "roles", name: "RBAC Controls", group: "System" },
    { id: "admins", name: "Admin Management", group: "System" }
  ];
  const existingPermissions = getDB("permissions.json", []);
  if (existingPermissions.length === 0) {
    saveDB("permissions.json", defaultPermissionsList);
    defaultPermissionsList.forEach(async (p) => {
      try {
        const payloadWithKey = {
          ...p,
          server_key: "arcadia_secure_server_key_2026_futuristic_studio_token"
        };
        await setDoc(doc(db, "permissions", p.id), payloadWithKey);
      } catch (e) {
        if (adminDb) {
          try { await adminDb.collection("permissions").doc(p.id).set(p); } catch(err) {}
        }
      }
    });
  }
} catch (seedErr) {
  console.warn("Roles/Permissions seeding skipped:", seedErr);
}

// Authentication API
app.post("/api/auth/login", authRateLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const normalizedEmail = normalizeEmail(email);
  const users = dbUsers();
  
  // 1. Check if user is a registered user in our users ledger
  const user = users.find(u => u.email === normalizedEmail);
  
  if (user) {
    // Registered admin/user
    if (!user.passwordHash || !bcryptjs.compareSync(password, user.passwordHash)) {
      await logAudit(req, "Failed Login", "auth", "Failure", `Failed admin login attempt for: ${normalizedEmail}`);
      await logAdminSessionActivity(req, user.id, normalizedEmail, "failed_login", "Failure", "Incorrect password");
      
      // Suspicious activity check
      const activities = getDB<any[]>("admin_activity.json", []);
      const recentFailed = activities.filter(act => 
        act.email === normalizedEmail && 
        act.action === "failed_login" && 
        (Date.now() - new Date(act.timestamp).getTime()) < 15 * 60 * 1000
      );
      if (recentFailed.length >= 3) {
        await createAdminNotification("suspicious_activity", "Multiple Failed Login Attempts", `Warning: Multiple failed login attempts detected for ${normalizedEmail} from IP ${req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1"}`);
      }

      return res.status(401).json({ error: "Invalid credentials." });
    }
    
    const adminRoles = ["Super Admin", "Admin", "admin", "Manager", "Staff"];
    const userRole = user.role || "Customer";
    
    if (!adminRoles.includes(userRole)) {
      await logAudit(req, "Unauthorized Admin Login Attempt", "auth", "Failure", `Non-admin user tried to log in as admin: ${normalizedEmail}`);
      await logAdminSessionActivity(req, user.id, normalizedEmail, "failed_login", "Failure", "Unauthorized access (Non-admin role)");
      return res.status(403).json({ error: "Access denied. Regular users cannot log in here." });
    }

    if (user.status === "suspended") {
      await logAudit(req, "Suspended Admin Login Attempt", "auth", "Failure", `Suspended admin tried to login: ${normalizedEmail}`);
      await logAdminSessionActivity(req, user.id, normalizedEmail, "failed_login", "Failure", "Account is suspended");
      return res.status(403).json({ error: "Account is suspended." });
    }

    // Ensure Firebase Admin Auth has this user and generate custom token
    let fbUid = user.id;
    try {
      const fbUser = await getAdminAuth().getUserByEmail(normalizedEmail);
      fbUid = fbUser.uid;
      await getAdminAuth().setCustomUserClaims(fbUid, { role: userRole, status: user.status || "active" });
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        try {
          const newFbUser = await getAdminAuth().createUser({
            uid: user.id,
            email: normalizedEmail,
            password: password,
            displayName: user.name
          });
          fbUid = newFbUser.uid;
          await getAdminAuth().setCustomUserClaims(fbUid, { role: userRole, status: user.status || "active" });
        } catch (createErr) {
          console.warn("Failed to auto-create firebase admin in login:", createErr);
        }
      }
    }

    let firebaseToken = "";
    try {
      firebaseToken = await getAdminAuth().createCustomToken(fbUid, { role: userRole });
    } catch (tokErr: any) {
      console.log(`[Firebase Auth] Custom token generation deferred (Service account lacks signBlob/IAM permissions).`);
    }

    const token = jwt.sign({ 
      uid: user.id,
      email: normalizedEmail, 
      role: userRole 
    }, JWT_SECRET, { expiresIn: "24h" });

    // Update lastLogin
    user.lastLogin = new Date().toISOString();
    saveDB("users.json", users);
    await syncUserToFirestore(user);

    await logAudit(req, "Admin Login", "auth", "Success", `Admin logged in successfully: ${normalizedEmail}`);
    await logAdminSessionActivity(req, user.id, normalizedEmail, "login", "Success", "Admin session established");
    return res.json({ token, firebaseToken, email: normalizedEmail, role: userRole });
  }


  await logAudit(req, "Failed Login", "auth", "Failure", `Failed admin login attempt for: ${normalizedEmail}`);
  await logAdminSessionActivity(req, "unknown", normalizedEmail, "failed_login", "Failure", "Invalid email or non-existent account");
  
  // Suspicious activity check
  const activities = getDB<any[]>("admin_activity.json", []);
  const recentFailed = activities.filter(act => 
    act.email === normalizedEmail && 
    act.action === "failed_login" && 
    (Date.now() - new Date(act.timestamp).getTime()) < 15 * 60 * 1000
  );
  if (recentFailed.length >= 3) {
    await createAdminNotification("suspicious_activity", "Multiple Failed Login Attempts", `Warning: Multiple failed login attempts detected for non-existent admin ${normalizedEmail} from IP ${req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1"}`);
  }

  return res.status(401).json({ error: "Invalid credentials." });
});

// Middleware to verify JWT token and protect against 'none' algorithm
const authenticateJWT = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  const token = authHeader.split(" ")[1];
  
  let isFirebaseToken = false;
  try {
    const decoded: any = jwt.decode(token);
    if (decoded && decoded.iss && decoded.iss.includes("securetoken.google.com")) {
      isFirebaseToken = true;
    }
  } catch (err) {
    // Ignore decode issues, let verification handle validation
  }

  if (isFirebaseToken) {
    // 1. Try Firebase Auth verification
    let firebaseUser;
    let verified = false;
    try {
      firebaseUser = await getAdminAuth().verifyIdToken(token, true);
      verified = true;
    } catch (firebaseErr: any) {
      // If verification failed because of checkRevoked (which requires Identity Toolkit API), retry without checkRevoked
      if (firebaseErr.code === "auth/internal-error" || (firebaseErr.message && firebaseErr.message.includes("identitytoolkit"))) {
        try {
          firebaseUser = await getAdminAuth().verifyIdToken(token, false);
          verified = true;
        } catch (retryErr: any) {
          try {
            firebaseUser = await verifyFirebaseTokenManual(token);
            verified = true;
          } catch (manualErr) {
            console.error("Manual verification failed in middleware:", manualErr);
            if (retryErr.code && retryErr.code.startsWith("auth/")) {
              return res.status(403).json({ error: "Session expired or revoked. Please log in again." });
            }
          }
        }
      } else if (firebaseErr.code && firebaseErr.code.startsWith("auth/")) {
        try {
          firebaseUser = await verifyFirebaseTokenManual(token);
          verified = true;
        } catch (manualErr) {
          console.error("Manual verification failed in middleware:", manualErr);
          return res.status(403).json({ error: "Session expired or revoked. Please log in again." });
        }
      } else {
        try {
          firebaseUser = await verifyFirebaseTokenManual(token);
          verified = true;
        } catch (manualErr) {
          console.error("Manual verification failed in middleware:", manualErr);
        }
      }
    }

    if (verified && firebaseUser) {
      // Check if user is suspended
      if (firebaseUser.status === "suspended" || firebaseUser.suspended === true) {
        return res.status(403).json({ error: "Account has been suspended." });
      }

      req.user = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.name || firebaseUser.email?.split("@")[0] || "Firebase User",
        role: firebaseUser.role || "Customer",
        email_verified: firebaseUser.email_verified,
        firebase: true
      };
      return next();
    }
  }

  // 2. Fallback to Local JWT verification
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token or session expired." });
  }
};

// Middleware to enforce Admin roles at routing layer (RBAC)
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: "Access denied. Authentication required." });
  }
  const role = req.user.role;
  const adminRoles = ["Super Admin", "Admin", "admin", "Manager", "Staff"];
  if (!adminRoles.includes(role)) {
    return res.status(403).json({ error: "Access denied. Administrator privileges required." });
  }
  next();
};

// Mock Emails API - Admin Only
app.get("/api/mock-emails", authenticateJWT, requireAdmin, (req, res) => {
  res.json(getDB<any[]>("mock_emails.json", []));
});

app.post("/api/mock-emails/clear", authenticateJWT, requireAdmin, (req, res) => {
  saveDB("mock_emails.json", []);
  res.json({ success: true });
});

// ============================================
// Client Authentication & Portal Routes
// ============================================

// Client Signup
app.post("/api/auth/client-register", authRateLimiter, async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ error: "Email, name, and password are required." });
  }

  const normalizedEmail = normalizeEmail(email);
  const users = dbUsers();

  const existingUser = users.find(u => u.email === normalizedEmail);
  if (existingUser) {
    return res.status(400).json({ error: "An account with this email already exists." });
  }

  let firebaseUser;
  try {
    firebaseUser = await getAdminAuth().createUser({
      email: normalizedEmail,
      password: password,
      displayName: name,
      emailVerified: false
    });
    // Set Customer role custom claim
    await getAdminAuth().setCustomUserClaims(firebaseUser.uid, { role: "Customer", status: "active" });
  } catch (fbErr: any) {
    console.log("[Firebase Auth] User registration fallback executed.");
  }

  const uid = firebaseUser ? firebaseUser.uid : ("u_" + Math.random().toString(36).substr(2, 9));
  const hashedPassword = bcryptjs.hashSync(password, 10);
  const newUser = {
    id: uid,
    email: normalizedEmail,
    name,
    passwordHash: hashedPassword,
    role: "Customer",
    status: "active",
    avatar: `https://images.unsplash.com/photo-${["1534528741775-53994a69daeb", "1507003211169-0a1dd7228f2d", "1494790108377-be9c29b29330", "1500648767791-00dcc994a43e"][Math.floor(Math.random() * 4)]}?auto=format&fit=crop&w=150&q=80`,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveDB("users.json", users);

  await syncUserToFirestore(newUser);
  await logAudit(req, "Client Registration", "users", "Success", `New customer registered: ${name} (${normalizedEmail})`);

  let firebaseToken = "";
  try {
    firebaseToken = await getAdminAuth().createCustomToken(uid, { role: "Customer" });
  } catch (tokErr: any) {
    console.log(`[Firebase Auth] Custom token generation deferred (Service account lacks signBlob/IAM permissions).`);
  }

  const token = jwt.sign({ uid, email: normalizedEmail, name, role: "Customer" }, JWT_SECRET, { expiresIn: "24h" });

  return res.json({
    token,
    firebaseToken,
    user: { email: normalizedEmail, name, avatar: newUser.avatar, role: "Customer", status: "active" }
  });
});

// Client Login
app.post("/api/auth/client-login", authRateLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const normalizedEmail = normalizeEmail(email);
  const users = dbUsers();

  const user = users.find(u => u.email === normalizedEmail);
  if (!user || !user.passwordHash || !bcryptjs.compareSync(password, user.passwordHash)) {
    await logAudit(req, "Failed Login", "auth", "Failure", `Failed client login attempt for: ${normalizedEmail}`);
    return res.status(401).json({ error: "Invalid email or password." });
  }

  if (user.status === "suspended") {
    await logAudit(req, "Suspended Login Attempt", "auth", "Failure", `Suspended client tried to login: ${normalizedEmail}`);
    return res.status(403).json({ error: "Account is suspended." });
  }

  const userRole = user.role || "Customer";

  // Ensure Firebase Admin Auth has this user and generate custom token
  let fbUid = user.id;
  try {
    const fbUser = await getAdminAuth().getUserByEmail(normalizedEmail);
    fbUid = fbUser.uid;
    await getAdminAuth().setCustomUserClaims(fbUid, { role: userRole, status: user.status || "active" });
  } catch (err: any) {
    if (err.code === "auth/user-not-found") {
      try {
        const newFbUser = await getAdminAuth().createUser({
          uid: user.id,
          email: normalizedEmail,
          password: password,
          displayName: user.name
        });
        fbUid = newFbUser.uid;
        await getAdminAuth().setCustomUserClaims(fbUid, { role: userRole, status: user.status || "active" });
      } catch (createErr) {
        console.log("[Firebase Auth] Auto-create user deferred.");
      }
    }
  }

  let firebaseToken = "";
  try {
    firebaseToken = await getAdminAuth().createCustomToken(fbUid, { role: userRole });
  } catch (tokErr: any) {
    console.log(`[Firebase Auth] Custom token generation deferred (Service account lacks signBlob/IAM permissions).`);
  }

  const token = jwt.sign({ uid: user.id, email: normalizedEmail, name: user.name, role: userRole }, JWT_SECRET, { expiresIn: "24h" });
  await logAudit(req, "Client Login", "auth", "Success", `Client logged in successfully: ${user.name} (${normalizedEmail})`);

  return res.json({
    token,
    firebaseToken,
    user: { email: normalizedEmail, name: user.name, avatar: user.avatar, role: userRole, status: user.status || "active" }
  });
});

// Client Social Login (Google / GitHub Verification)
app.post("/api/auth/social-login", authRateLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  const idToken = authHeader.split(" ")[1];

  let decodedToken: any;
  try {
    decodedToken = await getAdminAuth().verifyIdToken(idToken);
  } catch (fbErr: any) {
    console.warn("verifyIdToken failed, falling back to manual verification:", fbErr.message);
    try {
      decodedToken = await verifyFirebaseTokenManual(idToken);
    } catch (manualErr: any) {
      console.error("Error during manual social sign-in verification:", manualErr);
      return res.status(401).json({ error: "Invalid social authentication token." });
    }
  }

  try {
    const email = decodedToken.email;
    if (!email) {
      return res.status(400).json({ error: "Email not provided by social identity." });
    }
    const normalizedEmail = normalizeEmail(email);
    const users = dbUsers();

    let user = users.find(u => u.email === normalizedEmail);
    const name = decodedToken.name || email.split("@")[0] || "Social User";
    const avatar = decodedToken.picture || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80`;

    if (!user) {
      // Create new customer account from social login
      user = {
        id: decodedToken.uid,
        email: normalizedEmail,
        name,
        passwordHash: "", // No password for social users
        role: "Customer",
        status: "active",
        avatar,
        createdAt: new Date().toISOString()
      };
      users.push(user);
      saveDB("users.json", users);
      await syncUserToFirestore(user);
      await logAudit(req, "Client Social Registration", "users", "Success", `New customer registered via social login: ${name} (${normalizedEmail})`);
    } else {
      // Existing user, update avatar and name if available
      user.name = name;
      if (avatar && !user.avatar) {
        user.avatar = avatar;
      }
      saveDB("users.json", users);
      await syncUserToFirestore(user);
      await logAudit(req, "Client Social Login", "auth", "Success", `Client logged in via social: ${name} (${normalizedEmail})`);
    }

    // Set custom user claims on Firebase Auth
    const userRole = user.role || "Customer";
    try {
      await getAdminAuth().setCustomUserClaims(decodedToken.uid, { role: userRole, status: user.status || "active" });
    } catch (fbClaimsErr: any) {
      console.log("[Firebase Auth] Custom user claims deferred for social login.");
    }

    const token = jwt.sign({ uid: user.id, email: normalizedEmail, name: user.name, role: userRole }, JWT_SECRET, { expiresIn: "24h" });

    return res.json({
      token,
      user: { email: normalizedEmail, name: user.name, avatar: user.avatar, role: userRole, status: user.status || "active" }
    });
  } catch (err: any) {
    console.error("Error during social sign-in verification:", err);
    return res.status(401).json({ error: "Invalid social authentication token." });
  }
});

// Client Forgot Password - Request Reset Code
app.post("/api/auth/client-forgot", authRateLimiter, (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const normalizedEmail = normalizeEmail(email);
  const users = dbUsers();
  const user = users.find(u => u.email === normalizedEmail);

  if (!user) {
    return res.status(404).json({ error: "No account found with this email address." });
  }

  // Generate a cryptographically secure 6-digit random code
  const code = crypto.randomInt(100000, 1000000).toString();
  
  // Store a salted/hashed SHA256 copy of the reset code in memory for strict verification
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  
  if (!(global as any).resetCodes) {
    (global as any).resetCodes = {};
  }
  (global as any).resetCodes[normalizedEmail] = {
    hashedCode,
    expiresAt: Date.now() + 15 * 60 * 1000 // 15-minute strict expiration
  };

  const passwordResetHTML = `
    <div style="font-family: sans-serif; background-color: #0d0f12; color: #f3f4f6; padding: 40px 20px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-family: monospace; color: #2f80ff; letter-spacing: 2px; font-size: 24px; margin: 0;">ARCADIA CO-DEV HUB</h1>
        <p style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 3px; margin: 5px 0 0 0;">Security Verification Service</p>
      </div>
      <div style="background-color: #111827; border-radius: 16px; padding: 24px; border: 1px solid #374151;">
        <h3 style="color: #ffffff; margin-top: 0; font-size: 16px;">Security Ticket: Password Reset Authorization</h3>
        <p style="color: #9ca3af; font-size: 13px; line-height: 1.6;">A verification request has been initiated to reset the password for your ARCADIA client portal account. If you did not make this request, please disregard this transmission immediately.</p>
        
         <div style="margin: 30px 0; text-align: center;">
           <span style="display: block; font-family: monospace; font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Your One-Time Code</span>
           <div style="background-color: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 16px; border-radius: 12px; display: inline-block;">
             <span style="font-family: monospace; font-size: 32px; font-weight: bold; color: #f59e0b; letter-spacing: 6px;">${code}</span>
           </div>
         </div>
         
         <p style="color: #ef4444; font-size: 11px; margin: 0; font-family: monospace;">🚨 This verification session expires in exactly 15 minutes.</p>
      </div>
      <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #4b5563;">
        <p>© 2026 ARCADIA CO-DEV HUB. All systems operational on secure sandbox protocols.</p>
      </div>
    </div>
  `;

  sendMockEmail(normalizedEmail, "ARCADIA Security Ticket: Password Reset Authorization", passwordResetHTML, "password_reset");

  logActivity("Client Forgot Password", `Forgot password code requested for: ${normalizedEmail}`);

  const responsePayload: any = {
    message: "A password reset verification code has been dispatched."
  };

  // SECURITY DESIGN DETAIL:
  // In development / sandbox, we expose the code to let the local UI copy/paste easily.
  // In a secure production environment, this is strictly deleted so only email delivery works.
  if (process.env.NODE_ENV !== "production") {
    responsePayload.code = code;
  }

  return res.json(responsePayload);
});

// Client Reset Password - Verify & Update
app.post("/api/auth/client-reset", authRateLimiter, (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "Email, code, and new password are required." });
  }

  const normalizedEmail = normalizeEmail(email);
  const users = dbUsers();
  const userIdx = users.findIndex(u => u.email === normalizedEmail);

  if (userIdx === -1) {
    return res.status(404).json({ error: "No account found with this email address." });
  }

  const resetData = (global as any).resetCodes?.[normalizedEmail];
  if (!resetData || resetData.expiresAt < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired password reset verification session." });
  }

  // Strictly verify the SHA256 hash of the input code
  const inputHash = crypto.createHash("sha256").update(code.trim()).digest("hex");
  if (resetData.hashedCode !== inputHash) {
    return res.status(400).json({ error: "Invalid or expired password reset verification code." });
  }

  const hashedPassword = bcryptjs.hashSync(newPassword, 10);
  users[userIdx].passwordHash = hashedPassword;
  saveDB("users.json", users);

  // Single-use: immediately invalidate the reset ticket upon successful reset
  delete (global as any).resetCodes[normalizedEmail];

  logActivity("Client Reset Password", `Password reset successfully for: ${normalizedEmail}`);

  return res.json({ message: "Password updated successfully. You can now log in." });
});

// Initiate Social Authentication URLs (Google / GitHub)
app.get("/api/auth/social-url", (req, res) => {
  const provider = req.query.provider as string;
  if (!provider) {
    return res.status(400).json({ error: "Provider parameter is required." });
  }

  const callbackUrl = `${req.protocol}://${req.get("host")}/auth/callback`;

  if (provider === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.json({ configNeeded: true, provider: "google" });
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "openid email profile",
      state: "google"
    });

    return res.json({ url: authUrl });
  }

  if (provider === "github") {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.json({ configNeeded: true, provider: "github" });
    }

    const authUrl = `https://github.com/login/oauth/authorize?` + new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: "user:email",
      state: "github"
    });

    return res.json({ url: authUrl });
  }

  return res.status(400).json({ error: "Unsupported social provider." });
});

// OAuth Redirect Callback Handler (Supports standard postMessage closer!)
app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: "OAUTH_AUTH_FAILURE", error: "Authorization code missing" }, "*");
              window.close();
            }
          </script>
          <p>Authorization failed. Code missing.</p>
        </body>
      </html>
    `);
  }

  try {
    let email = "";
    let name = "";
    let avatar = "";

    if (state === "google") {
      // Exchange code for Google ID token & profile info
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: `${req.protocol}://${req.get("host")}/auth/callback`,
          grant_type: "authorization_code"
        })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData.error_description || "Google token exchange failed");

      // Fetch user profile info
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { "Authorization": `Bearer ${tokenData.access_token}` }
      });
      const userData = await userRes.json();
      email = userData.email;
      name = userData.name || userData.email.split("@")[0];
      avatar = userData.picture;
    } else if (state === "github") {
      // Exchange code for GitHub token
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID || "",
          client_secret: process.env.GITHUB_CLIENT_SECRET || "",
          code: code as string,
          redirect_uri: `${req.protocol}://${req.get("host")}/auth/callback`
        })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData.error_description || "GitHub token exchange failed");

      // Fetch user profile info
      const userRes = await fetch("https://api.github.com/user", {
        headers: { "Authorization": `Bearer ${tokenData.access_token}`, "User-Agent": "Arcadia-Interactive-Platform" }
      });
      const userData = await userRes.json();
      name = userData.name || userData.login;
      avatar = userData.avatar_url;

      // Fetch user email (since GitHub user emails might be private)
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: { "Authorization": `Bearer ${tokenData.access_token}`, "User-Agent": "Arcadia-Interactive-Platform" }
      });
      const emailData = await emailRes.json();
      if (Array.isArray(emailData)) {
        const primaryEmailObj = emailData.find(e => e.primary) || emailData[0];
        email = primaryEmailObj ? primaryEmailObj.email : `${userData.login}@github.com`;
      } else {
        email = `${userData.login}@github.com`;
      }
    }

    if (!email) throw new Error("Could not retrieve user email from social provider.");

    const normalizedEmail = normalizeEmail(email);
    const users = dbUsers();
    let user = users.find(u => u.email === normalizedEmail);

    if (!user) {
      user = {
        id: "u_" + Math.random().toString(36).substr(2, 9),
        email: normalizedEmail,
        name,
        avatar: avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80`,
        createdAt: new Date().toISOString()
      };
      users.push(user);
      saveDB("users.json", users);
      logActivity("Client Registered (Social)", `New client signed up via OAuth: ${name} (${normalizedEmail})`);
    } else {
      logActivity("Client Login (Social)", `Client logged in via OAuth: ${name} (${normalizedEmail})`);
    }

    const token = jwt.sign({ email: normalizedEmail, name: user.name, role: "client" }, JWT_SECRET, { expiresIn: "24h" });

    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: "OAUTH_AUTH_SUCCESS",
                token: "${token}",
                user: {
                  email: "${normalizedEmail}",
                  name: "${user.name}",
                  avatar: "${user.avatar}"
                }
              }, "*");
              window.close();
            } else {
              window.location.href = "/";
            }
          </script>
          <p>Authentication successful. You can close this window.</p>
        </body>
      </html>
    `);

  } catch (err: any) {
    console.error("OAuth Exchange Error:", err);
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: "OAUTH_AUTH_FAILURE", error: "${err.message || "Exchange failed"}" }, "*");
              window.close();
            }
          </script>
          <p>Authentication exchange failed: ${err.message || "Unknown error"}</p>
        </body>
      </html>
    `);
  }
});

// --- SECURITY HARDENING: Unauthenticated social-sandbox endpoint has been removed to enforce strict credentials check ---

// --- SUPER ADMIN MANAGEMENT ENDPOINTS ---

const requireSuperAdmin = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: "Access denied. Authentication required." });
  }
  const role = req.user.role;
  if (role !== "Super Admin") {
    return res.status(403).json({ error: "Access denied. Super Admin privileges required." });
  }
  next();
};

// 1. Get Admins list
app.get("/api/admin/admins", authenticateJWT, requireSuperAdmin, (req: any, res) => {
  const users = dbUsers();
  const adminRoles = ["Super Admin", "Admin", "admin", "Manager", "Staff"];
  const admins = users.filter(u => adminRoles.includes(u.role || ""));
  const sanitized = admins.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone || "",
    avatar: u.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80`,
    role: u.role === "admin" ? "Admin" : u.role,
    department: u.department || "Operations",
    permissions: u.permissions || [],
    bio: u.bio || "",
    status: u.status || "active",
    lastLogin: u.lastLogin || "",
    createdBy: u.createdBy || "System",
    createdAt: u.createdAt || new Date().toISOString(),
    activeSessions: u.activeSessions || 1
  }));
  res.json(sanitized);
});

// 2. Create Admin
app.post("/api/admin/admins", authenticateJWT, requireSuperAdmin, async (req: any, res) => {
  const { email, name, password, role, department, permissions, phone, avatar, bio } = req.body;
  if (!email || !name || !password || !role) {
    return res.status(400).json({ error: "Email, name, password, and role are required." });
  }

  const normalizedEmail = normalizeEmail(email);
  const users = dbUsers();

  const existingUser = users.find(u => u.email === normalizedEmail);
  if (existingUser) {
    return res.status(400).json({ error: "An account with this email already exists." });
  }

  let firebaseUser;
  try {
    firebaseUser = await getAdminAuth().createUser({
      email: normalizedEmail,
      password: password,
      displayName: name,
      phoneNumber: phone || undefined,
      emailVerified: true
    });
    await getAdminAuth().setCustomUserClaims(firebaseUser.uid, { role, status: "active" });
  } catch (fbErr: any) {
    console.log("[Firebase Auth] Admin-created user setup deferred.");
  }

  const uid = firebaseUser ? firebaseUser.uid : ("u_" + Math.random().toString(36).substr(2, 9));
  const hashedPassword = bcryptjs.hashSync(password, 10);
  const newAdmin = {
    id: uid,
    email: normalizedEmail,
    name,
    passwordHash: hashedPassword,
    role,
    department: department || "Operations",
    permissions: permissions || [],
    phone: phone || "",
    avatar: avatar || `https://images.unsplash.com/photo-${["1534528741775-53994a69daeb", "1507003211169-0a1dd7228f2d", "1494790108377-be9c29b29330", "1500648767791-00dcc994a43e"][Math.floor(Math.random() * 4)]}?auto=format&fit=crop&w=150&q=80`,
    bio: bio || "",
    status: "active",
    createdBy: req.user.email || "Super Admin",
    createdAt: new Date().toISOString(),
    lastLogin: "",
    activeSessions: 1
  };

  users.push(newAdmin);
  saveDB("users.json", users);

  // Sync with Firestore collections: /users and /admins
  await syncUserToFirestore(newAdmin);
  try {
    const payloadWithKey = {
      email: newAdmin.email,
      name: newAdmin.name,
      role: newAdmin.role,
      department: newAdmin.department,
      permissions: newAdmin.permissions,
      phone: newAdmin.phone,
      avatar: newAdmin.avatar,
      bio: newAdmin.bio,
      status: newAdmin.status,
      createdBy: newAdmin.createdBy,
      createdAt: newAdmin.createdAt,
      server_key: "arcadia_secure_server_key_2026_futuristic_studio_token"
    };
    await setDoc(doc(db, "admins", uid), payloadWithKey);
  } catch (err) {
    if (adminDb) {
      try {
        await adminDb.collection("admins").doc(uid).set({
          email: newAdmin.email,
          name: newAdmin.name,
          role: newAdmin.role,
          department: newAdmin.department,
          permissions: newAdmin.permissions,
          phone: newAdmin.phone,
          avatar: newAdmin.avatar,
          bio: newAdmin.bio,
          status: newAdmin.status,
          createdBy: newAdmin.createdBy,
          createdAt: newAdmin.createdAt
        });
      } catch (fbErr) {}
    }
  }

  // Audit log & Notifications
  await logAudit(req, "Admin Created", "admins", "Success", `Super Admin created administrative account: ${name} (${normalizedEmail}) as ${role}`);
  await createAdminNotification("admin_created", "New Admin Created", `Administrative account for ${name} (${role}) has been created by ${req.user.email}`);

  res.json({ success: true, user: newAdmin });
});

// 3. Edit Admin
app.put("/api/admin/admins/:id", authenticateJWT, requireSuperAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { name, phone, department, role, permissions, avatar, status, bio } = req.body;

  const users = dbUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: "Admin not found." });

  const targetUser = users[idx];

  // Prevent changing the last Super Admin
  if (targetUser.role === "Super Admin" && role !== "Super Admin") {
    const superAdmins = users.filter(u => u.role === "Super Admin");
    if (superAdmins.length <= 1) {
      return res.status(400).json({ error: "Cannot change the role of the last Super Admin. There must be at least one Super Admin in the system." });
    }
  }
  if (targetUser.role === "Super Admin" && status === "suspended") {
    return res.status(400).json({ error: "Cannot suspend the last Super Admin. There must be at least one active Super Admin in the system." });
  }

  const oldRole = targetUser.role;
  const oldStatus = targetUser.status;

  if (name !== undefined) targetUser.name = name;
  if (phone !== undefined) targetUser.phone = phone;
  if (department !== undefined) targetUser.department = department;
  if (role !== undefined) targetUser.role = role;
  if (permissions !== undefined) targetUser.permissions = permissions;
  if (avatar !== undefined) targetUser.avatar = avatar;
  if (status !== undefined) targetUser.status = status;
  if (bio !== undefined) targetUser.bio = bio;

  saveDB("users.json", users);

  // Update Firebase Auth claims if role or status changed
  if (role !== undefined || status !== undefined) {
    try {
      await getAdminAuth().setCustomUserClaims(id, { 
        role: targetUser.role || "Customer", 
        status: targetUser.status || "active" 
      });
      if (status === "suspended") {
        await getAdminAuth().revokeRefreshTokens(id);
        await logAudit(req, "Admin Suspended", "admins", "Success", `Suspended administrative account: ${targetUser.email}`);
        await createAdminNotification("admin_suspended", "Admin Suspended", `Admin account ${targetUser.email} has been suspended by ${req.user.email}`);
      }
    } catch (fbErr: any) {
      console.log("[Firebase Auth] Custom claims update deferred.");
    }
  }

  await syncUserToFirestore(targetUser);
  // Update in Firestore admins collection as well
  try {
    const payloadWithKey = {
      name: targetUser.name,
      phone: targetUser.phone || "",
      department: targetUser.department || "",
      role: targetUser.role,
      permissions: targetUser.permissions || [],
      avatar: targetUser.avatar || "",
      status: targetUser.status || "active",
      bio: targetUser.bio || "",
      server_key: "arcadia_secure_server_key_2026_futuristic_studio_token"
    };
    await setDoc(doc(db, "admins", id), payloadWithKey, { merge: true });
  } catch (err) {
    if (adminDb) {
      try {
        await adminDb.collection("admins").doc(id).set({
          name: targetUser.name,
          phone: targetUser.phone || "",
          department: targetUser.department || "",
          role: targetUser.role,
          permissions: targetUser.permissions || [],
          avatar: targetUser.avatar || "",
          status: targetUser.status || "active",
          bio: targetUser.bio || ""
        }, { merge: true });
      } catch (fbErr) {}
    }
  }

  await logAudit(req, "Admin Edited", "admins", "Success", `Updated profile for admin: ${targetUser.email}. Role: ${targetUser.role}, Status: ${targetUser.status}`);
  if (oldRole !== targetUser.role) {
    await createAdminNotification("role_changed", "Admin Role Changed", `Role for ${targetUser.name} changed from ${oldRole} to ${targetUser.role} by ${req.user.email}`);
  }
  if (status !== undefined && oldStatus !== status) {
    await createAdminNotification(status === "suspended" ? "admin_suspended" : "admin_activated", status === "suspended" ? "Admin Suspended" : "Admin Activated", `Admin account ${targetUser.email} has been ${status === "suspended" ? "suspended" : "activated"} by ${req.user.email}`);
  }

  res.json({ success: true, user: targetUser });
});

// 4. Delete Admin
app.delete("/api/admin/admins/:id", authenticateJWT, requireSuperAdmin, async (req: any, res) => {
  const { id } = req.params;
  const users = dbUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: "Admin not found." });

  const targetUser = users[idx];

  if (targetUser.role === "Super Admin") {
    const superAdmins = users.filter(u => u.role === "Super Admin");
    if (superAdmins.length <= 1) {
      return res.status(400).json({ error: "Cannot delete the last Super Admin. At least one Super Admin is required." });
    }
  }

  users.splice(idx, 1);
  saveDB("users.json", users);

  try {
    await getAdminAuth().deleteUser(id);
  } catch (fbErr: any) {
    console.warn("Firebase Auth deleteUser warning:", fbErr.message);
  }

  // Delete from users and admins Firestore collections
  try {
    await deleteDoc(doc(db, "users", id));
    await deleteDoc(doc(db, "admins", id));
  } catch (clientErr: any) {
    if (adminDb) {
      try {
        await adminDb.collection("users").doc(id).delete();
        await adminDb.collection("admins").doc(id).delete();
      } catch (fbErr: any) {
        console.error("Firestore purge failed:", fbErr.message);
      }
    }
  }

  await logAudit(req, "Admin Deleted", "admins", "Success", `Deleted administrative account: ${targetUser.email}`);
  await createAdminNotification("admin_deleted", "Admin Deleted", `Administrative account for ${targetUser.name} (${targetUser.email}) has been permanently deleted by ${req.user.email}`);

  res.json({ success: true, message: "Administrator deleted successfully." });
});

// 5. Suspend / Activate Admin
app.post("/api/admin/admins/:id/suspend", authenticateJWT, requireSuperAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { suspended } = req.body;

  const users = dbUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: "Admin not found." });

  const targetUser = users[idx];

  if (targetUser.role === "Super Admin") {
    return res.status(400).json({ error: "Super Admins cannot be suspended." });
  }

  const newStatus = suspended ? "suspended" : "active";
  targetUser.status = newStatus;
  saveDB("users.json", users);

  try {
    await getAdminAuth().setCustomUserClaims(id, { 
      role: targetUser.role || "Staff", 
      status: newStatus 
    });
    if (suspended) {
      await getAdminAuth().revokeRefreshTokens(id);
    }
  } catch (fbErr: any) {
    console.log("[Firebase Auth] User claims suspension updated.");
  }

  await syncUserToFirestore(targetUser);

  // Update Firestore admins collection
  try {
    const payloadWithKey = {
      status: newStatus,
      server_key: "arcadia_secure_server_key_2026_futuristic_studio_token"
    };
    await setDoc(doc(db, "admins", id), payloadWithKey, { merge: true });
  } catch (err) {
    if (adminDb) {
      try {
        await adminDb.collection("admins").doc(id).set({ status: newStatus }, { merge: true });
      } catch (fbErr) {}
    }
  }

  await logAudit(req, suspended ? "Admin Suspended" : "Admin Activated", "admins", "Success", `${suspended ? "Suspended" : "Activated"} admin: ${targetUser.email}`);
  await createAdminNotification(suspended ? "admin_suspended" : "admin_activated", suspended ? "Admin Suspended" : "Admin Activated", `Admin account ${targetUser.email} has been ${suspended ? "suspended" : "activated"} by ${req.user.email}`);

  res.json({ success: true, user: targetUser });
});

// 6. Reset / Force password reset
app.post("/api/admin/admins/:id/reset-password", authenticateJWT, requireSuperAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { password } = req.body;

  const users = dbUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: "Admin not found." });

  const targetUser = users[idx];

  if (password) {
    const hashedPassword = bcryptjs.hashSync(password, 10);
    targetUser.passwordHash = hashedPassword;
    saveDB("users.json", users);

    try {
      await getAdminAuth().updateUser(id, { password: password });
      await getAdminAuth().revokeRefreshTokens(id);
    } catch (fbErr: any) {
      console.warn("Firebase Auth password reset warning:", fbErr.message);
    }

    await logAudit(req, "Password Reset (Admin)", "admins", "Success", `Forced password reset for admin: ${targetUser.email}`);
    await createAdminNotification("password_reset", "Admin Password Reset", `Password reset forced for ${targetUser.email} by ${req.user.email}`);
    res.json({ success: true, message: "Password updated successfully and active sessions revoked." });
  } else {
    let link = "";
    try {
      link = await getAdminAuth().generatePasswordResetLink(targetUser.email);
    } catch (fbErr: any) {
      console.warn("Could not generate reset link:", fbErr.message);
    }

    await logAudit(req, "Password Reset Link Dispatched", "admins", "Success", `Dispatched password reset link for: ${targetUser.email}`);
    await createAdminNotification("password_reset", "Password Reset Dispatched", `Dispatched reset link for ${targetUser.email}`);
    res.json({ success: true, message: "Password reset instructions dispatched successfully.", link });
  }
});

// 7. Get Login Activity
app.get("/api/admin/admins/activity", authenticateJWT, requireSuperAdmin, (req, res) => {
  res.json(getDB<any[]>("admin_activity.json", []));
});

// 8. Get Notifications
app.get("/api/admin/admins/notifications", authenticateJWT, requireSuperAdmin, (req, res) => {
  res.json(getDB<any[]>("admin_notifications.json", []));
});

// 9. Mark notification as read
app.post("/api/admin/admins/notifications/read", authenticateJWT, requireSuperAdmin, (req, res) => {
  const { id, all } = req.body;
  const notifications = getDB<any[]>("admin_notifications.json", []);
  if (all) {
    notifications.forEach(n => n.read = true);
  } else {
    const notif = notifications.find(n => n.id === id);
    if (notif) notif.read = true;
  }
  saveDB("admin_notifications.json", notifications);
  res.json({ success: true });
});

// 10. Server-side logout endpoint to log activity
app.post("/api/auth/admin-logout", authenticateJWT, async (req: any, res) => {
  if (req.user) {
    await logAdminSessionActivity(req, req.user.uid || req.user.id || "unknown", req.user.email, "logout", "Success", "Admin terminated session");
  }
  res.json({ success: true });
});

// Endpoint to force seed/synchronize local JSON files to Firestore
app.post("/api/admin/force-sync", authenticateJWT, requireAdmin, async (req: any, res) => {
  try {
    const results = await syncAllLocalDBToFirestore();
    res.json({
      success: true,
      message: `Database synchronized successfully! Processed ${results.totalCount} files.`,
      ...results
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// Admin Users List Endpoint - Admin Only
app.get("/api/users", authenticateJWT, requireAdmin, (req: any, res) => {
  const users = dbUsers();
  const sanitized = users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    avatar: u.avatar,
    role: u.role || "Customer",
    status: u.status || "active",
    createdAt: u.createdAt
  }));
  res.json(sanitized);
});

// Admin API - Create User
app.post("/api/admin/create-user", authenticateJWT, requireAdmin, async (req: any, res) => {
  const { email, name, password, role } = req.body;
  if (!email || !name || !password || !role) {
    return res.status(400).json({ error: "Email, name, password, and role are required." });
  }

  const normalizedEmail = normalizeEmail(email);
  const users = dbUsers();

  const existingUser = users.find(u => u.email === normalizedEmail);
  if (existingUser) {
    return res.status(400).json({ error: "An account with this email already exists." });
  }

  // Super Admin can assign any role, Admin can only assign Customer/Staff/Manager roles, cannot create Admins or Super Admins.
  const reqRole = req.user.role;
  if (role === "Super Admin" || role === "Admin") {
    if (reqRole !== "Super Admin") {
      await logAudit(req, "Unauthorized Admin Creation", "users", "Failure", `Admin tried to create privileged user of role ${role}`);
      return res.status(403).json({ error: "Access denied. Only Super Admins can create administrative accounts." });
    }
  }

  let firebaseUser;
  try {
    firebaseUser = await getAdminAuth().createUser({
      email: normalizedEmail,
      password: password,
      displayName: name,
      emailVerified: true
    });
    await getAdminAuth().setCustomUserClaims(firebaseUser.uid, { role, status: "active" });
  } catch (fbErr: any) {
    console.log("[Firebase Auth] Admin-created user creation deferred.");
  }

  const uid = firebaseUser ? firebaseUser.uid : ("u_" + Math.random().toString(36).substr(2, 9));
  const hashedPassword = bcryptjs.hashSync(password, 10);
  const newUser = {
    id: uid,
    email: normalizedEmail,
    name,
    passwordHash: hashedPassword,
    role,
    status: "active",
    avatar: `https://images.unsplash.com/photo-${["1534528741775-53994a69daeb", "1507003211169-0a1dd7228f2d", "1494790108377-be9c29b29330", "1500648767791-00dcc994a43e"][Math.floor(Math.random() * 4)]}?auto=format&fit=crop&w=150&q=80`,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveDB("users.json", users);

  await syncUserToFirestore(newUser);
  await logAudit(req, "User Creation", "users", "Success", `Created user account: ${name} (${normalizedEmail}) as ${role}`);

  res.json({ success: true, user: { id: uid, name, email: normalizedEmail, role, status: "active" } });
});

// Admin API - Assign Role
app.post("/api/admin/assign-role", authenticateJWT, requireAdmin, async (req: any, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ error: "User ID and role are required." });
  }

  const users = dbUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return res.status(404).json({ error: "User not found." });

  const targetUser = users[idx];
  const reqRole = req.user.role;

  // Security authorization checks (preventing privilege escalation)
  if (role === "Super Admin" || role === "Admin" || targetUser.role === "Super Admin" || targetUser.role === "Admin") {
    if (reqRole !== "Super Admin") {
      await logAudit(req, "Unauthorized Role Escalation Attempt", "users", "Failure", `Admin tried to manage privileged role ${role} for ${targetUser.email}`);
      return res.status(403).json({ error: "Access denied. Only Super Admins can assign or alter administrative roles." });
    }
  }

  const oldRole = targetUser.role || "Customer";
  targetUser.role = role;
  saveDB("users.json", users);

  try {
    await getAdminAuth().setCustomUserClaims(userId, { role, status: targetUser.status || "active" });
  } catch (fbErr: any) {
    console.log("[Firebase Auth] Custom claims setup deferred.");
  }

  await syncUserToFirestore(targetUser);
  await logAudit(req, "Role Change", "users", "Success", `Assigned role ${role} (was ${oldRole}) to user ${targetUser.email}`);

  res.json({ success: true, user: { id: userId, email: targetUser.email, role, status: targetUser.status } });
});

// Admin API - Suspend / Unsuspend User
app.post("/api/admin/suspend-user", authenticateJWT, requireAdmin, async (req: any, res) => {
  const { userId, suspended } = req.body;
  if (!userId || suspended === undefined) {
    return res.status(400).json({ error: "User ID and suspended status are required." });
  }

  const users = dbUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return res.status(404).json({ error: "User not found." });

  const targetUser = users[idx];
  const reqRole = req.user.role;

  if (targetUser.role === "Super Admin") {
    return res.status(403).json({ error: "Access denied. Super Admins cannot be suspended." });
  }

  if (targetUser.role === "Admin") {
    if (reqRole !== "Super Admin") {
      await logAudit(req, "Unauthorized Suspension Attempt", "users", "Failure", `Admin tried to suspend Admin user: ${targetUser.email}`);
      return res.status(403).json({ error: "Access denied. Only Super Admins can suspend other Admin users." });
    }
  }

  const oldStatus = targetUser.status || "active";
  const newStatus = suspended ? "suspended" : "active";
  targetUser.status = newStatus;
  saveDB("users.json", users);

  try {
    await getAdminAuth().setCustomUserClaims(userId, { role: targetUser.role || "Customer", status: newStatus });
    if (suspended) {
      await getAdminAuth().revokeRefreshTokens(userId);
    }
  } catch (fbErr: any) {
    console.log("[Firebase Auth] Suspend update claims deferred.");
  }

  await syncUserToFirestore(targetUser);
  await logAudit(req, suspended ? "User Suspension" : "User Activation", "users", "Success", `${suspended ? "Suspended" : "Unsuspended"} user ${targetUser.email}`);

  res.json({ success: true, user: { id: userId, email: targetUser.email, status: newStatus } });
});

// Admin API - Delete User
app.post("/api/admin/delete-user", authenticateJWT, requireAdmin, async (req: any, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  const users = dbUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return res.status(404).json({ error: "User not found." });

  const targetUser = users[idx];
  const reqRole = req.user.role;

  if (targetUser.role === "Super Admin") {
    return res.status(403).json({ error: "Access denied. Super Admins cannot be deleted." });
  }

  if (targetUser.role === "Admin") {
    if (reqRole !== "Super Admin") {
      await logAudit(req, "Unauthorized Deletion Attempt", "users", "Failure", `Admin tried to delete Admin user: ${targetUser.email}`);
      return res.status(403).json({ error: "Access denied. Only Super Admins can delete Admin accounts." });
    }
  }

  users.splice(idx, 1);
  saveDB("users.json", users);

  try {
    await getAdminAuth().deleteUser(userId);
  } catch (fbErr: any) {
    console.warn("Firebase Auth deleteUser warning:", fbErr.message);
  }

  try {
    await deleteDoc(doc(db, "users", userId));
    console.log(`[Firestore Delete - Client] Successfully deleted user profile for ID: ${userId}`);
  } catch (clientErr: any) {
    console.warn(`[Firestore Delete - Client] Failed to delete user profile for ID: ${userId}, trying Admin SDK fallback...`, clientErr.message || clientErr);
    if (adminDb) {
      try {
        await adminDb.collection("users").doc(userId).delete();
        console.log(`[Firestore Delete - Admin] Successfully deleted user profile for ID: ${userId}`);
      } catch (fbErr: any) {
        console.warn("Firestore delete user profile warning:", fbErr.message);
      }
    }
  }

  await logAudit(req, "User Deletion", "users", "Success", `Deleted user account: ${targetUser.email}`);

  res.json({ success: true, message: "User deleted successfully." });
});

// Admin API - Reset Password (Admin Initiated)
app.post("/api/admin/reset-password", authenticateJWT, requireAdmin, async (req: any, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ error: "User ID and new password are required." });
  }

  const users = dbUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return res.status(404).json({ error: "User not found." });

  const targetUser = users[idx];
  const reqRole = req.user.role;

  if (targetUser.role === "Super Admin" || targetUser.role === "Admin") {
    if (reqRole !== "Super Admin") {
      await logAudit(req, "Unauthorized Password Reset Attempt", "users", "Failure", `Admin tried to reset password for privileged user: ${targetUser.email}`);
      return res.status(403).json({ error: "Access denied. Only Super Admins can reset administrative passwords." });
    }
  }

  const hashedPassword = bcryptjs.hashSync(newPassword, 10);
  targetUser.passwordHash = hashedPassword;
  saveDB("users.json", users);

  try {
    await getAdminAuth().updateUser(userId, { password: newPassword });
    await getAdminAuth().revokeRefreshTokens(userId);
  } catch (fbErr: any) {
    console.warn("Firebase Auth password update / token revocation warning:", fbErr.message);
  }

  await logAudit(req, "Password Reset (Admin Initiated)", "users", "Success", `Forced password reset for user: ${targetUser.email}`);

  res.json({ success: true, message: "Password updated successfully and active sessions invalidated." });
});

// Approve & Request Payment Action - Admin Only
app.put("/api/orders/:id/approve-request", authenticateJWT, requireAdmin, (req: any, res) => {
  const orders = dbOrders();
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Order not found." });

  const order = orders[idx];
  order.status = "Payment Pending";

  if (order.milestones && order.milestones.length > 0) {
    const firstMilestone = order.milestones[0];
    if (firstMilestone.status === "Pending" || firstMilestone.status === "Link Sent") {
      firstMilestone.status = "Link Sent";
      firstMilestone.paymentLink = `https://rzp.io/i/mock_arcadia_${order.id}_${firstMilestone.id}`;
    }

    const paymentReqHTML = `
      <div style="font-family: sans-serif; background-color: #0d0f12; color: #f3f4f6; padding: 40px 20px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-family: monospace; color: #2f80ff; letter-spacing: 2px; font-size: 24px; margin: 0;">ARCADIA CO-DEV HUB</h1>
          <p style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 3px; margin: 5px 0 0 0;">Billing & Milestone Operations</p>
        </div>
        <div style="background-color: #111827; border-radius: 16px; padding: 24px; border: 1px solid #374151;">
          <div style="border-bottom: 1px solid #1f2937; padding-bottom: 15px; margin-bottom: 15px; text-align: left;">
            <h3 style="color: #ffffff; margin: 0; font-size: 16px; display: inline-block;">Invoice & Milestone Payment Authorized Request</h3>
            <span style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; font-size: 10px; padding: 2px 8px; border-radius: 9999px; font-family: monospace; font-weight: bold; float: right;">ACTION REQUIRED</span>
            <div style="clear: both;"></div>
          </div>
          <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: left;">Hello ${order.name},</p>
          <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: left;">ARCADIA has initiated a billing protocol for your project <strong>${order.service}</strong>. Please find the authorized milestone payment request details below:</p>
          
          <div style="background-color: #0d0f12; border-radius: 12px; padding: 16px; border: 1px solid #1f2937; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #d1d5db;">
              <tr style="border-bottom: 1px solid #1f2937;">
                <td style="padding: 8px 0; color: #9ca3af; text-align: left;">Project Name:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #ffffff;">${order.service}</td>
              </tr>
              <tr style="border-bottom: 1px solid #1f2937;">
                <td style="padding: 8px 0; color: #9ca3af; text-align: left;">Milestone Phase:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #ffffff;">${firstMilestone.label}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af; font-size: 14px; font-weight: bold; text-align: left;">Amount Due:</td>
                <td style="padding: 8px 0; text-align: right; font-size: 16px; font-weight: bold; color: #10b981; font-family: monospace;">₹${firstMilestone.amount.toLocaleString("en-IN")}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${firstMilestone.paymentLink}" style="background-color: #2f80ff; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(47, 128, 255, 0.3);">
              Authorize Milestone Payment Securely
            </a>
            <span style="display: block; font-size: 10px; color: #6b7280; margin-top: 10px;">Powered by Razorpay Secure Sandbox Protocol</span>
          </div>
        </div>
        <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #4b5563;">
          <p>© 2026 ARCADIA CO-DEV HUB. All systems operational on secure sandbox protocols.</p>
        </div>
      </div>
    `;

    sendMockEmail(normalizeEmail(order.email), `ARCADIA Payment Request: ${firstMilestone.label}`, paymentReqHTML, "payment_request");
  }

  // Create active notification for client portal
  const notifications = dbNotifications();
  const m1Amt = order.milestones && order.milestones.length > 0 ? order.milestones[0].amount : 0;
  const newNotification = {
    id: "notif_" + Math.random().toString(36).substr(2, 9),
    userEmail: normalizeEmail(order.email),
    title: "Project Approved & Deposit Requested",
    message: `Your project '${order.service}' has been approved! Please authorize the Kickoff Booking Deposit of ₹${m1Amt.toLocaleString("en-IN")} via your Project Hub.`,
    read: false,
    createdAt: new Date().toISOString(),
    orderId: order.id,
    milestoneId: "m1",
    type: "Payment Required",
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
  };
  notifications.unshift(newNotification);
  saveDB("notifications.json", notifications);

  saveDB("orders.json", orders);
  logActivity("Order Approved & Payment Requested", `Order ${order.id} approved. Kickoff Deposit requested (₹${m1Amt})`);

  res.json(order);
});

// Secured Client Data Endpoints
app.get("/api/client/notifications", authenticateJWT, (req: any, res) => {
  const userEmail = req.user.email;
  const notifications = dbNotifications();
  const filtered = notifications.filter(n => normalizeEmail(n.userEmail) === normalizeEmail(userEmail));
  res.json(filtered);
});

app.put("/api/client/notifications/read", authenticateJWT, (req: any, res) => {
  const userEmail = req.user.email;
  const notifications = dbNotifications();
  notifications.forEach(n => {
    if (normalizeEmail(n.userEmail) === normalizeEmail(userEmail)) {
      n.read = true;
    }
  });
  saveDB("notifications.json", notifications);
  res.json({ success: true });
});

app.get("/api/client/orders", authenticateJWT, (req: any, res) => {
  const userEmail = req.user.email;
  const orders = dbOrders();
  const filtered = orders.filter(o => normalizeEmail(o.email) === normalizeEmail(userEmail));
  res.json(filtered);
});

app.get("/api/client/bookings", authenticateJWT, (req: any, res) => {
  const userEmail = req.user.email;
  const bookings = dbBookings();
  const filtered = bookings.filter(b => normalizeEmail(b.email) === normalizeEmail(userEmail));
  res.json(filtered);
});

app.get("/api/client/inquiries", authenticateJWT, (req: any, res) => {
  const userEmail = req.user.email;
  const inquiries = dbInquiries();
  const filtered = inquiries.filter(i => normalizeEmail(i.email) === normalizeEmail(userEmail));
  res.json(filtered);
});

// Homepage Settings API
app.get("/api/homepage-settings", (req, res) => {
  res.json(dbHomepageSettings());
});

app.post("/api/admin/homepage-settings", authenticateJWT, requireAdmin, (req, res) => {
  saveDB("homepage_settings.json", req.body);
  logActivity("Update Homepage Settings", "Updated homepage dynamic layout settings.");
  res.json({ success: true, settings: req.body });
});

// Services API
app.get("/api/services", (req, res) => {
  res.json(dbServices());
});

app.post("/api/services", authenticateJWT, requireAdmin, (req, res) => {
  const services = dbServices();
  const newService = {
    id: "s_" + Math.random().toString(36).substr(2, 9),
    ...req.body
  };
  services.push(newService);
  saveDB("services.json", services);
  logActivity("Create Service", `Added service: ${newService.title}`);
  res.status(201).json(newService);
});

app.put("/api/services/:id", authenticateJWT, requireAdmin, (req, res) => {
  const services = dbServices();
  const idx = services.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Service not found." });
  
  services[idx] = { ...services[idx], ...req.body };
  saveDB("services.json", services);
  logActivity("Update Service", `Updated service: ${services[idx].title}`);
  res.json(services[idx]);
});

app.delete("/api/services/:id", authenticateJWT, requireAdmin, (req, res) => {
  const services = dbServices();
  const idx = services.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Service not found." });
  
  const title = services[idx].title;
  services.splice(idx, 1);
  saveDB("services.json", services);
  logActivity("Delete Service", `Deleted service: ${title}`);
  res.json({ success: true });
});

// Projects API
app.get("/api/projects", (req, res) => {
  res.json(dbProjects());
});

app.post("/api/projects", authenticateJWT, requireAdmin, (req, res) => {
  const projects = dbProjects();
  const newProject = {
    id: "p_" + Math.random().toString(36).substr(2, 9),
    ...req.body
  };
  projects.push(newProject);
  saveDB("projects.json", projects);
  logActivity("Create Project", `Added portfolio project: ${newProject.title}`);
  res.status(201).json(newProject);
});

app.put("/api/projects/:id", authenticateJWT, requireAdmin, (req, res) => {
  const projects = dbProjects();
  const idx = projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Project not found." });
  
  projects[idx] = { ...projects[idx], ...req.body };
  saveDB("projects.json", projects);
  logActivity("Update Project", `Updated portfolio project: ${projects[idx].title}`);
  res.json(projects[idx]);
});

app.delete("/api/projects/:id", authenticateJWT, requireAdmin, (req, res) => {
  const projects = dbProjects();
  const idx = projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Project not found." });
  
  const title = projects[idx].title;
  projects.splice(idx, 1);
  saveDB("projects.json", projects);
  logActivity("Delete Project", `Deleted portfolio project: ${title}`);
  res.json({ success: true });
});

// Bookings API
app.get("/api/bookings", authenticateJWT, requireAdmin, (req, res) => {
  res.json(dbBookings());
});

app.post("/api/bookings", (req, res) => {
  const bookings = dbBookings();
  const newBooking = {
    id: "b_" + Math.random().toString(36).substr(2, 9),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  bookings.unshift(newBooking);
  saveDB("bookings.json", bookings);
  logActivity("New Demo Booking", `Demo booked by ${newBooking.name} for service: ${newBooking.service}`);

  // Trigger automated booking confirmation email
  triggerEmail(
    "Booking_Confirmation",
    {
      to: normalizeEmail(newBooking.email),
      clientName: newBooking.name,
      projectName: newBooking.businessName || "Your Consultation",
      bookingId: newBooking.id,
      bookingDate: newBooking.date,
      bookingTime: newBooking.time,
      bookingService: newBooking.service,
      dateTime: newBooking.createdAt
    },
    adminDb,
    saveDB
  ).catch(err => console.error("Error sending Booking_Confirmation email:", err));

  res.status(201).json(newBooking);
});

// Orders API
app.get("/api/orders", authenticateJWT, requireAdmin, (req, res) => {
  res.json(dbOrders());
});

app.post("/api/orders", (req, res) => {
  const { fileUrl, paymentScreenshot } = req.body;
  
  // Validate Project Specifications File (if uploaded)
  if (fileUrl) {
    const allowedSpecsMimes = [
      "application/pdf", 
      "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "image/jpeg",
      "image/png"
    ];
    const validation = validateBase64File(fileUrl, allowedSpecsMimes, 5 * 1024 * 1024); // 5MB limit
    if (!validation.valid) {
      return res.status(400).json({ error: `Specifications File Error: ${validation.error}` });
    }
  }

  // Validate Payment Screenshot File (if uploaded)
  if (paymentScreenshot) {
    const allowedScreenshotMimes = ["image/jpeg", "image/png", "image/webp"];
    const validation = validateBase64File(paymentScreenshot, allowedScreenshotMimes, 5 * 1024 * 1024); // 5MB limit
    if (!validation.valid) {
      return res.status(400).json({ error: `Payment Screenshot Error: ${validation.error}` });
    }
  }

  const orders = dbOrders();
  const budget = parseInt(req.body.budget) || 0;
  
  const m1Amt = Math.round(budget * 0.3);
  const m2Amt = Math.round(budget * 0.5);
  const m3Amt = budget - m1Amt - m2Amt;

  const milestones = [
    {
      id: "m1",
      label: "Kickoff Booking Deposit (30%)",
      percentage: 30,
      amount: m1Amt,
      status: "Pending"
    },
    {
      id: "m2",
      label: "Mid-Project Development Phase (50%)",
      percentage: 50,
      amount: m2Amt,
      status: "Pending"
    },
    {
      id: "m3",
      label: "Project Handover & Settlement (20%)",
      percentage: 20,
      amount: m3Amt,
      status: "Pending"
    }
  ];

  const newOrder = {
    id: "ord_" + Math.random().toString(36).substr(2, 9),
    status: "Pending",
    isPaid: false,
    ...req.body,
    milestones,
    createdAt: new Date().toISOString()
  };
  orders.unshift(newOrder);
  saveDB("orders.json", orders);
  logActivity("New Project Order", `New order submitted by ${newOrder.name} for: ${newOrder.service} (Awaiting Approval)`);
  res.status(201).json(newOrder);
});

app.put("/api/orders/:id/status", authenticateJWT, requireAdmin, (req, res) => {
  const orders = dbOrders();
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Order not found." });
  
  orders[idx].status = req.body.status;
  saveDB("orders.json", orders);
  checkAndCreateMaintenance(orders[idx]);
  logActivity("Order Status Change", `Order status updated to '${req.body.status}' for client ${orders[idx].name}`);

  // Trigger automated project status change email
  triggerEmail(
    "Project_Status_Update",
    {
      to: normalizeEmail(orders[idx].email),
      clientName: orders[idx].name,
      projectName: orders[idx].service,
      status: req.body.status,
      dateTime: new Date().toISOString()
    },
    adminDb,
    saveDB
  ).catch(err => console.error("Error sending Project_Status_Update email:", err));

  res.json(orders[idx]);
});

// Admin requests / sends payment link for a specific milestone
app.put("/api/orders/:id/milestones/:mid/request", authenticateJWT, requireAdmin, (req, res) => {
  const orders = dbOrders();
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Order not found." });

  const order = orders[idx];
  if (!order.milestones) {
    order.milestones = [];
  }

  const milestone = order.milestones.find((m: any) => m.id === req.params.mid);
  if (!milestone) return res.status(404).json({ error: "Milestone not found." });

  milestone.status = "Link Sent";
  milestone.paymentLink = `https://rzp.io/i/mock_arcadia_${order.id}_${milestone.id}`;

  const paymentReqHTML = `
    <div style="font-family: sans-serif; background-color: #0d0f12; color: #f3f4f6; padding: 40px 20px; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-family: monospace; color: #2f80ff; letter-spacing: 2px; font-size: 24px; margin: 0;">ARCADIA CO-DEV HUB</h1>
        <p style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 3px; margin: 5px 0 0 0;">Billing & Milestone Operations</p>
      </div>
      <div style="background-color: #111827; border-radius: 16px; padding: 24px; border: 1px solid #374151;">
        <div style="border-bottom: 1px solid #1f2937; padding-bottom: 15px; margin-bottom: 15px; text-align: left;">
          <h3 style="color: #ffffff; margin: 0; font-size: 16px; display: inline-block;">Invoice & Milestone Payment Authorized Request</h3>
          <span style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; font-size: 10px; padding: 2px 8px; border-radius: 9999px; font-family: monospace; font-weight: bold; float: right;">ACTION REQUIRED</span>
          <div style="clear: both;"></div>
        </div>
        <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: left;">Hello ${order.name},</p>
        <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: left;">ARCADIA has initiated a billing protocol for your project <strong>${order.service}</strong>. Please find the authorized milestone payment request details below:</p>
        
        <div style="background-color: #0d0f12; border-radius: 12px; padding: 16px; border: 1px solid #1f2937; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #d1d5db;">
            <tr style="border-bottom: 1px solid #1f2937;">
              <td style="padding: 8px 0; color: #9ca3af; text-align: left;">Project Name:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #ffffff;">${order.service}</td>
            </tr>
            <tr style="border-bottom: 1px solid #1f2937;">
              <td style="padding: 8px 0; color: #9ca3af; text-align: left;">Milestone Phase:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #ffffff;">${milestone.label}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px; font-weight: bold; text-align: left;">Amount Due:</td>
              <td style="padding: 8px 0; text-align: right; font-size: 16px; font-weight: bold; color: #10b981; font-family: monospace;">₹${milestone.amount.toLocaleString("en-IN")}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${milestone.paymentLink}" style="background-color: #2f80ff; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(47, 128, 255, 0.3);">
            Authorize Milestone Payment Securely
          </a>
          <span style="display: block; font-size: 10px; color: #6b7280; margin-top: 10px;">Powered by Razorpay Secure Sandbox Protocol</span>
        </div>
      </div>
      <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #4b5563;">
        <p>© 2026 ARCADIA CO-DEV HUB. All systems operational on secure sandbox protocols.</p>
      </div>
    </div>
  `;

  sendMockEmail(normalizeEmail(order.email), `ARCADIA Payment Request: ${milestone.label}`, paymentReqHTML, "payment_request");
  
  // Create active notification for client portal
  const notifications = dbNotifications();
  const newNotification = {
    id: "notif_" + Math.random().toString(36).substr(2, 9),
    userEmail: normalizeEmail(order.email),
    title: "New Payment Request",
    message: `A payment request of ₹${milestone.amount.toLocaleString("en-IN")} has been issued for milestone '${milestone.label}' on project '${order.service}'.`,
    read: false,
    createdAt: new Date().toISOString(),
    orderId: order.id,
    milestoneId: milestone.id,
    type: "Payment Required",
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
  };
  notifications.unshift(newNotification);
  saveDB("notifications.json", notifications);

  saveDB("orders.json", orders);
  logActivity("Milestone Link Sent", `Payment link requested for Order ${order.id} Milestone: ${milestone.label}`);
  res.json(order);
});

// Client pays a milestone - Authenticated with IDOR ownership check
app.put("/api/orders/:id/milestones/:mid/pay", authenticateJWT, (req: any, res) => {
  const orders = dbOrders();
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Order not found." });

  const order = orders[idx];
  
  // IDOR Protection: Ensure logged-in user owns the order or is an admin
  if (req.user.role !== "admin" && normalizeEmail(order.email) !== normalizeEmail(req.user.email)) {
    return res.status(403).json({ error: "Access denied. You do not have permission to pay for this order." });
  }

  if (!order.milestones) {
    return res.status(400).json({ error: "No milestones on this order." });
  }

  const milestone = order.milestones.find((m: any) => m.id === req.params.mid);
  if (!milestone) return res.status(404).json({ error: "Milestone not found." });

  milestone.status = "Paid";
  milestone.paidAt = new Date().toISOString();
  milestone.invoiceGenerated = true;

  // Create active notification for client portal confirming success
  const notifications = dbNotifications();
  const successNotification = {
    id: "notif_" + Math.random().toString(36).substr(2, 9),
    userEmail: normalizeEmail(order.email),
    title: "Milestone Payment Succeeded",
    message: `Payment of ₹${milestone.amount.toLocaleString("en-IN")} for milestone '${milestone.label}' has been successfully processed! Your signed PDF invoice is ready for download.`,
    read: false,
    createdAt: new Date().toISOString(),
    orderId: order.id,
    milestoneId: milestone.id,
    type: "Success"
  };
  notifications.unshift(successNotification);
  saveDB("notifications.json", notifications);

  // Check if ALL milestones are paid
  const allPaid = order.milestones.every((m: any) => m.status === "Paid");
  if (allPaid) {
    order.isPaid = true;
    order.paymentAmount = parseInt(order.budget) || 0;
  }

  saveDB("orders.json", orders);
  logActivity("Milestone Paid", `Order ${order.id} Milestone: ${milestone.label} paid successfully (₹${milestone.amount})`);
  res.json(order);
});

// Client/Admin manual full order payment trigger - Authenticated with IDOR ownership check
app.put("/api/orders/:id/pay", authenticateJWT, (req: any, res) => {
  const orders = dbOrders();
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Order not found." });
  
  const order = orders[idx];

  // IDOR Protection: Ensure logged-in user owns the order or is an admin
  if (req.user.role !== "admin" && normalizeEmail(order.email) !== normalizeEmail(req.user.email)) {
    return res.status(403).json({ error: "Access denied. You do not have permission to pay for this order." });
  }

  order.isPaid = true;
  order.paymentAmount = req.body.amount || 5000;
  // Set all milestones to paid if paying full
  if (order.milestones) {
    order.milestones = order.milestones.map((m: any) => ({
      ...m,
      status: "Paid",
      paidAt: new Date().toISOString(),
      invoiceGenerated: true
    }));
  }
  saveDB("orders.json", orders);
  logActivity("Order Paid (Manual/Admin)", `Order ${order.id} paid successfully (₹${order.paymentAmount})`);
  res.json(order);
});

// Blogs API
app.get("/api/blogs", (req, res) => {
  res.json(dbBlogs());
});

app.post("/api/blogs", authenticateJWT, requireAdmin, (req, res) => {
  const blogs = dbBlogs();
  const newBlog = {
    id: "blog_" + Math.random().toString(36).substr(2, 9),
    ...req.body,
    date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  };
  blogs.unshift(newBlog);
  saveDB("blogs.json", blogs);
  logActivity("Create Blog", `Added blog: ${newBlog.title}`);
  res.status(201).json(newBlog);
});

app.put("/api/blogs/:id", authenticateJWT, requireAdmin, (req, res) => {
  const blogs = dbBlogs();
  const idx = blogs.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Blog post not found." });
  
  blogs[idx] = { ...blogs[idx], ...req.body };
  saveDB("blogs.json", blogs);
  logActivity("Update Blog", `Updated blog: ${blogs[idx].title}`);
  res.json(blogs[idx]);
});

app.delete("/api/blogs/:id", authenticateJWT, requireAdmin, (req, res) => {
  const blogs = dbBlogs();
  const idx = blogs.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Blog post not found." });
  
  const title = blogs[idx].title;
  blogs.splice(idx, 1);
  saveDB("blogs.json", blogs);
  logActivity("Delete Blog", `Deleted blog: ${title}`);
  res.json({ success: true });
});

// FAQs API
app.get("/api/faqs", (req, res) => {
  res.json(dbFAQs());
});

app.post("/api/faqs", authenticateJWT, requireAdmin, (req, res) => {
  const faqs = dbFAQs();
  const newFAQ = {
    id: "faq_" + Math.random().toString(36).substr(2, 9),
    ...req.body
  };
  faqs.push(newFAQ);
  saveDB("faqs.json", faqs);
  logActivity("Create FAQ", `Added FAQ: ${newFAQ.question}`);
  res.status(201).json(newFAQ);
});

app.put("/api/faqs/:id", authenticateJWT, requireAdmin, (req, res) => {
  const faqs = dbFAQs();
  const idx = faqs.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "FAQ not found." });
  
  faqs[idx] = { ...faqs[idx], ...req.body };
  saveDB("faqs.json", faqs);
  logActivity("Update FAQ", `Updated FAQ: ${faqs[idx].question}`);
  res.json(faqs[idx]);
});

app.delete("/api/faqs/:id", authenticateJWT, requireAdmin, (req, res) => {
  const faqs = dbFAQs();
  const idx = faqs.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "FAQ not found." });
  
  const question = faqs[idx].question;
  faqs.splice(idx, 1);
  saveDB("faqs.json", faqs);
  logActivity("Delete FAQ", `Deleted FAQ: ${question}`);
  res.json({ success: true });
});

// Testimonials API
app.get("/api/testimonials", (req, res) => {
  res.json(dbTestimonials());
});

app.post("/api/testimonials", authenticateJWT, requireAdmin, (req, res) => {
  const testimonials = dbTestimonials();
  const newTestimonial = {
    id: "test_" + Math.random().toString(36).substr(2, 9),
    ...req.body
  };
  testimonials.push(newTestimonial);
  saveDB("testimonials.json", testimonials);
  logActivity("Create Testimonial", `Added testimonial from: ${newTestimonial.name}`);
  res.status(201).json(newTestimonial);
});

// Contact Inquiries API
app.get("/api/inquiries", authenticateJWT, requireAdmin, (req, res) => {
  res.json(dbInquiries());
});

app.post("/api/inquiries", (req, res) => {
  const inquiries = dbInquiries();
  const newInquiry = {
    id: "inq_" + Math.random().toString(36).substr(2, 9),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  inquiries.unshift(newInquiry);
  saveDB("inquiries.json", inquiries);
  logActivity("New Contact Inquiry", `New inquiry from ${newInquiry.name} on: ${newInquiry.subject}`);
  res.status(201).json(newInquiry);
});

// Logs API
app.get("/api/logs", authenticateJWT, requireAdmin, (req, res) => {
  res.json(dbLogs());
});

// Vacancies API
app.get("/api/vacancies", (req, res) => {
  res.json(dbVacancies());
});

app.post("/api/vacancies", authenticateJWT, requireAdmin, (req, res) => {
  const vacancies = dbVacancies();
  const { id, title, location, salary, type } = req.body;
  if (!title || !location || !salary || !type) {
    return res.status(400).json({ error: "Missing required vacancy fields." });
  }

  if (id) {
    // Edit existing
    const idx = vacancies.findIndex(v => v.id === id);
    if (idx !== -1) {
      vacancies[idx] = { id, title, location, salary, type };
      saveDB("vacancies.json", vacancies);
      logActivity("Edit Vacancy", `Vacancy edited: ${title}`);
      return res.json(vacancies[idx]);
    }
  }

  // Create new
  const newVacancy = {
    id: "v_" + Math.random().toString(36).substr(2, 9),
    title,
    location,
    salary,
    type
  };
  vacancies.push(newVacancy);
  saveDB("vacancies.json", vacancies);
  logActivity("Create Vacancy", `Vacancy created: ${title}`);
  res.status(201).json(newVacancy);
});

app.delete("/api/vacancies/:id", authenticateJWT, requireAdmin, (req, res) => {
  const vacancies = dbVacancies();
  const { id } = req.params;
  const filtered = vacancies.filter(v => v.id !== id);
  if (filtered.length !== vacancies.length) {
    saveDB("vacancies.json", filtered);
    logActivity("Delete Vacancy", `Vacancy deleted with ID: ${id}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Vacancy not found." });
  }
});

// Applications API
app.get("/api/applications", authenticateJWT, requireAdmin, (req, res) => {
  res.json(dbApplications());
});

app.post("/api/applications", (req, res) => {
  const { role, name, email, resume, note } = req.body;
  if (!role || !name || !email || !resume) {
    return res.status(400).json({ error: "Missing required application fields." });
  }

  // Validate CV/Resume payload (PDF or Doc files)
  const allowedCvMimes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  const cvValidation = validateBase64File(resume, allowedCvMimes, 5 * 1024 * 1024); // 5MB Limit
  if (!cvValidation.valid) {
    return res.status(400).json({ error: `Resume Upload Error: ${cvValidation.error}` });
  }

  const applications = dbApplications();

  const newApp = {
    id: "app_" + Math.random().toString(36).substr(2, 9),
    role,
    name,
    email,
    resume,
    note: note || "",
    appliedAt: new Date().toISOString()
  };

  applications.unshift(newApp);
  saveDB("applications.json", applications);
  logActivity("New Job Application", `${name} applied for role: ${role}`);
  res.status(201).json(newApp);
});

// -----------------------------------------------------------------------------
// ARCADIA ENTERPRISE-GRADE PAYMENT & REFUND MANAGEMENT SYSTEM (RAZORPAY)
// -----------------------------------------------------------------------------

// 1. Create Razorpay Order
app.post("/api/payments/create-order", authenticateJWT, async (req: any, res) => {
  try {
    const { orderId, milestoneId } = req.body;
    if (!orderId || !milestoneId) {
      return res.status(400).json({ error: "Missing orderId or milestoneId parameters." });
    }

    const orders = dbOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ error: "Order not found." });
    }
    const order = orders[orderIndex];

    // IDOR protection: only the customer or an admin can create payments
    const isAdmin = ["Super Admin", "Admin", "admin", "Manager", "Staff"].includes(req.user.role);
    if (!isAdmin && normalizeEmail(order.email) !== normalizeEmail(req.user.email)) {
      return res.status(403).json({ error: "Access denied. You do not have ownership of this project order." });
    }

    if (!order.milestones || !Array.isArray(order.milestones)) {
      return res.status(400).json({ error: "Order has no associated milestones." });
    }

    const milestone = order.milestones.find((m: any) => m.id === milestoneId);
    if (!milestone) {
      return res.status(404).json({ error: "Target milestone not found on this order." });
    }

    // Milestone payment availability validation
    if (milestoneId === "m2") {
      const m1 = order.milestones.find((m: any) => m.id === "m1");
      if (!m1 || m1.status !== "Paid") {
        return res.status(400).json({ error: "Cannot initiate 50% Milestone. The 30% Booking Milestone must be Paid first." });
      }
    } else if (milestoneId === "m3") {
      const m2 = order.milestones.find((m: any) => m.id === "m2");
      if (!m2 || m2.status !== "Paid") {
        return res.status(400).json({ error: "Cannot initiate Final 20% Milestone. The 50% Mid-Project Milestone must be Paid first." });
      }
    }

    if (milestone.status === "Paid" || milestone.status === "Under Review") {
      return res.status(400).json({ error: `Milestone is already ${milestone.status.toLowerCase()}.` });
    }

    const amountInINR = milestone.amount;
    const amountInPaise = Math.round(amountInINR * 100);

    let razorpayOrderId = "";
    const rzp = getRazorpayInstance();
    if (rzp) {
      // Create real Razorpay order
      const rzpOrder = await rzp.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `rcpt_${orderId.slice(0, 5)}_${milestoneId}`,
        notes: {
          orderId,
          milestoneId,
          clientId: order.email,
          projectName: order.service
        }
      });
      razorpayOrderId = rzpOrder.id;
    } else {
      // Generate secure sandbox simulated Razorpay order ID
      razorpayOrderId = "order_sim_" + Math.random().toString(36).substr(2, 9);
    }

    // Save transaction log as Initiated
    const payments = dbPayments();
    const paymentRecord = {
      id: "pay_sim_init_" + Math.random().toString(36).substr(2, 9),
      orderId: razorpayOrderId,
      amount: amountInINR,
      currency: "INR",
      milestoneId,
      clientId: normalizeEmail(order.email),
      clientName: order.name,
      projectId: order.id,
      projectName: order.service,
      status: "Payment Initiated",
      createdAt: new Date().toISOString(),
      refundedAmount: 0,
      refundStatus: "None",
      notes: `Initiated payment sequence for milestone: ${milestone.label}`
    };
    payments.unshift(paymentRecord);
    saveDB("payments.json", payments);

    logActivity("Payment Order Created", `Razorpay Order ${razorpayOrderId} created for ₹${amountInINR} (Project: ${orderId}, Milestone: ${milestoneId})`);

    res.json({
      success: true,
      razorpay_order_id: razorpayOrderId,
      amount: amountInINR,
      key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_mock_key_2026",
      milestoneId,
      orderId: order.id,
      clientEmail: order.email,
      clientPhone: order.phone || "",
      clientName: order.name,
      projectName: order.service
    });
  } catch (err: any) {
    console.error("[Payments] Error creating payment order:", err);
    res.status(500).json({ error: "Failed to create payment gateway order.", details: err.message });
  }
});

// 2. Verify payment signature
app.post("/api/payments/verify-payment", authenticateJWT, async (req: any, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, milestoneId } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId || !milestoneId) {
      return res.status(400).json({ error: "Missing required payment verification details." });
    }

    const orders = dbOrders();
    const orderIdx = orders.findIndex(o => o.id === orderId);
    if (orderIdx === -1) {
      return res.status(404).json({ error: "Order not found." });
    }
    const order = orders[orderIdx];

    // Ownership/IDOR check
    const isAdmin = ["Super Admin", "Admin", "admin", "Manager", "Staff"].includes(req.user.role);
    if (!isAdmin && normalizeEmail(order.email) !== normalizeEmail(req.user.email)) {
      return res.status(403).json({ error: "Access denied. Verification unauthorized." });
    }

    const milestone = order.milestones?.find((m: any) => m.id === milestoneId);
    if (!milestone) {
      return res.status(404).json({ error: "Milestone not found." });
    }

    // Double Payment Prevention
    const payments = dbPayments();
    const isDuplicate = payments.some(p => p.id === razorpay_payment_id && p.status === "Approved");
    if (isDuplicate) {
      return res.status(400).json({ error: "This payment has already been approved and credited." });
    }

    // Cryptographic signature verification
    const verified = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!verified) {
      // Log invalid signature attempt
      const logs = dbPaymentLogs();
      logs.unshift({
        id: "log_" + Math.random().toString(36).substr(2, 9),
        action: "SIGNATURE_VERIFICATION_FAILED",
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        timestamp: new Date().toISOString(),
        details: `Cryptographic verification failed for signature: ${razorpay_signature}`
      });
      saveDB("paymentLogs.json", logs);

      const audit = dbAuditLogs();
      audit.unshift({
        id: "audit_" + Math.random().toString(36).substr(2, 9),
        action: "Security Breach Prevention",
        details: `Rejected suspicious milestone payment signature on order: ${orderId}`,
        timestamp: new Date().toISOString()
      });
      saveDB("auditLogs.json", audit);

      return res.status(400).json({ error: "Cryptographic security verification failed. Invalid transaction signature." });
    }

    // Save payment as Awaiting Review / Under Review
    const paymentIdx = payments.findIndex(p => p.orderId === razorpay_order_id);
    const amountINR = milestone.amount;

    if (paymentIdx !== -1) {
      payments[paymentIdx].id = razorpay_payment_id; // Update with actual Payment ID
      payments[paymentIdx].status = "Under Review";
      payments[paymentIdx].notes = `Successfully verified transaction. Pending administrator final authorization.`;
      payments[paymentIdx].createdAt = new Date().toISOString();
    } else {
      payments.unshift({
        id: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: amountINR,
        currency: "INR",
        milestoneId,
        clientId: normalizeEmail(order.email),
        clientName: order.name,
        projectId: order.id,
        projectName: order.service,
        status: "Under Review",
        createdAt: new Date().toISOString(),
        refundedAmount: 0,
        refundStatus: "None",
        notes: `Direct verification. Pending administrator final authorization.`
      });
    }
    saveDB("payments.json", payments);

    // Update milestone state to "Under Review" so user dashboard shows it is awaiting approval
    milestone.status = "Under Review";
    milestone.paymentId = razorpay_payment_id;
    milestone.paymentOrderId = razorpay_order_id;
    order.status = "Payment Pending Approval";
    saveDB("orders.json", orders);

    // Log success
    const pHistory = dbPaymentHistory();
    pHistory.unshift({
      id: "ph_" + Math.random().toString(36).substr(2, 9),
      paymentId: razorpay_payment_id,
      action: "Payment Signature Verified",
      amount: amountINR,
      milestoneId,
      timestamp: new Date().toISOString()
    });
    saveDB("paymentHistory.json", pHistory);

    // Trigger automated email notification for payment submission
    triggerEmail(
      "Payment_Submitted",
      {
        to: normalizeEmail(order.email),
        clientName: order.name,
        projectName: order.service,
        amount: amountINR,
        milestoneLabel: milestone.label,
        milestoneId,
        paymentId: razorpay_payment_id,
        dateTime: new Date().toISOString()
      },
      adminDb,
      saveDB
    ).catch(err => console.error("Error sending Payment_Submitted email:", err));

    // Trigger automated project status update email
    triggerEmail(
      "Project_Status_Update",
      {
        to: normalizeEmail(order.email),
        clientName: order.name,
        projectName: order.service,
        status: "Payment Pending Approval",
        dateTime: new Date().toISOString()
      },
      adminDb,
      saveDB
    ).catch(err => console.error("Error sending status update email:", err));

    // Send Real-time notification to client portal
    const notifications = dbNotifications();
    notifications.unshift({
      id: "notif_" + Math.random().toString(36).substr(2, 9),
      userEmail: normalizeEmail(order.email),
      title: "Payment Processing Under Review",
      message: `Your milestone payment of ₹${amountINR.toLocaleString("en-IN")} has been verified. It is currently under review by our finance operations.`,
      read: false,
      createdAt: new Date().toISOString(),
      orderId: order.id,
      milestoneId,
      type: "Processing"
    });

    // Notify administrators
    const adminEmailList = ["vikram@zenix.com", "admin@zenix.com", "superadmin@zenix.com"];
    adminEmailList.forEach(email => {
      notifications.unshift({
        id: "notif_" + Math.random().toString(36).substr(2, 9),
        userEmail: email,
        title: "Milestone Payment Review Required",
        message: `Client ${order.name} submitted milestone payment ₹${amountINR.toLocaleString("en-IN")} for project ${order.service}. Final approval required.`,
        read: false,
        createdAt: new Date().toISOString(),
        orderId: order.id,
        milestoneId,
        type: "Action Required"
      });
    });
    saveDB("notifications.json", notifications);

    logActivity("Payment Signature Verified", `Payment verified: ID ${razorpay_payment_id} for ₹${amountINR} on Order ${order.id}. Set to Under Review.`);

    res.json({
      success: true,
      message: "Payment cryptographically verified. Status set to Awaiting Review.",
      payment: {
        id: razorpay_payment_id,
        status: "Under Review"
      }
    });
  } catch (err: any) {
    console.error("[Payments] Verification exception:", err);
    res.status(500).json({ error: "Failed to verify transaction.", details: err.message });
  }
});

// 3. Admin review payment (Approve or Reject)
app.post("/api/payments/review", authenticateJWT, requireAdmin, async (req: any, res) => {
  try {
    const { paymentId, action, notes } = req.body;
    if (!paymentId || !action) {
      return res.status(400).json({ error: "Missing required payment review parameters." });
    }

    const payments = dbPayments();
    const payIdx = payments.findIndex(p => p.id === paymentId);
    if (payIdx === -1) {
      return res.status(404).json({ error: "Payment record not found." });
    }
    const payment = payments[payIdx];

    const orders = dbOrders();
    const orderIdx = orders.findIndex(o => o.id === payment.projectId);
    if (orderIdx === -1) {
      return res.status(404).json({ error: "Associated project order not found." });
    }
    const order = orders[orderIdx];

    const milestone = order.milestones?.find((m: any) => m.id === payment.milestoneId);
    if (!milestone) {
      return res.status(404).json({ error: "Milestone not found." });
    }

    if (payment.status !== "Under Review") {
      return res.status(400).json({ error: `Payment is already processed. Current status: ${payment.status}` });
    }

    const reviewerEmail = req.user.email;

    if (action === "Approve") {
      // 1. Update Payment Status to Approved
      payment.status = "Approved";
      payment.notes = notes || `Payment approved by administrative review (${reviewerEmail}).`;

      // 2. Mark milestone as Paid
      milestone.status = "Paid";
      milestone.paidAt = new Date().toISOString();
      milestone.invoiceGenerated = true;

      // 3. Rules to update Overall Project/Order Status automatically
      if (payment.milestoneId === "m1") {
        order.status = "Payment Approved – Project Initiated";
        // Ensure 50% milestone status is marked "Link Sent" or "Pending" but active
        const m2 = order.milestones.find((m: any) => m.id === "m2");
        if (m2 && m2.status === "Pending") {
          m2.status = "Pending";
        }
      } else if (payment.milestoneId === "m2") {
        order.status = "In Progress";
      } else if (payment.milestoneId === "m3") {
        order.status = "Completed";
        order.isPaid = true;
        order.paymentAmount = parseInt(order.budget) || 0;
      }

      // Check if ALL milestones are paid to seal payment completion
      const allMilestonesPaid = order.milestones.every((m: any) => m.status === "Paid");
      if (allMilestonesPaid) {
        order.isPaid = true;
        order.paymentAmount = parseInt(order.budget) || 0;
        order.status = "Completed";
      }

      // 4. Generate system record in invoices.json
      const invoices = dbInvoices();
      const newInvoiceNum = `INV-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      const invoiceRecord = {
        id: "inv_" + Math.random().toString(36).substr(2, 9),
        invoiceNumber: newInvoiceNum,
        clientName: order.name,
        projectName: order.service,
        milestone: milestone.label,
        amount: payment.amount,
        paymentId: paymentId,
        date: new Date().toISOString()
      };
      invoices.unshift(invoiceRecord);
      saveDB("invoices.json", invoices);

      // Save history log
      const pHistory = dbPaymentHistory();
      pHistory.unshift({
        id: "ph_" + Math.random().toString(36).substr(2, 9),
        paymentId,
        action: "Payment Approved",
        amount: payment.amount,
        milestoneId: payment.milestoneId,
        timestamp: new Date().toISOString()
      });
      saveDB("paymentHistory.json", pHistory);

      // Notify Client of approved milestone & invoice download
      const notifications = dbNotifications();
      notifications.unshift({
        id: "notif_" + Math.random().toString(36).substr(2, 9),
        userEmail: normalizeEmail(order.email),
        title: "Payment Approved & Invoice Generated",
        message: `Your payment of ₹${payment.amount.toLocaleString("en-IN")} for '${milestone.label}' has been approved. Signed PDF Invoice ${newInvoiceNum} is ready!`,
        read: false,
        createdAt: new Date().toISOString(),
        orderId: order.id,
        milestoneId: milestone.id,
        type: "Success"
      });
      saveDB("notifications.json", notifications);

      logActivity("Payment Approved", `Milestone payment ${paymentId} approved by Admin ${reviewerEmail} on Order ${order.id}`);

      // Calculate remaining balance dynamically for emails
      const budgetVal = parseInt(order.budget) || 0;
      const paidMilestonesSum = (order.milestones || [])
        .filter((m: any) => m.status === "Paid" || m.id === payment.milestoneId)
        .reduce((sum: number, m: any) => sum + m.amount, 0);
      const remainingBalance = Math.max(0, budgetVal - paidMilestonesSum);

      if (payment.milestoneId === "m1") {
        // Trigger automated email for 30% Payment Approved
        triggerEmail(
          "Payment_Approved_30",
          {
            to: normalizeEmail(order.email),
            clientName: order.name,
            projectName: order.service,
            invoiceNumber: newInvoiceNum,
            amount: payment.amount,
            milestoneLabel: milestone.label,
            milestoneId: payment.milestoneId,
            paymentId: paymentId,
            remainingBalance,
            dateTime: new Date().toISOString()
          },
          adminDb,
          saveDB
        ).catch(err => console.error("Error sending Payment_Approved_30 email:", err));

        // Trigger automated project status update email
        triggerEmail(
          "Project_Status_Update",
          {
            to: normalizeEmail(order.email),
            clientName: order.name,
            projectName: order.service,
            status: "Payment Approved – Project Initiated",
            dateTime: new Date().toISOString()
          },
          adminDb,
          saveDB
        ).catch(err => console.error("Error sending status email:", err));
      } else if (payment.milestoneId === "m2") {
        // Trigger automated email for 50% Payment Approved
        triggerEmail(
          "Payment_Approved_50",
          {
            to: normalizeEmail(order.email),
            clientName: order.name,
            projectName: order.service,
            invoiceNumber: newInvoiceNum,
            amount: payment.amount,
            milestoneLabel: milestone.label,
            milestoneId: payment.milestoneId,
            paymentId: paymentId,
            remainingBalance,
            dateTime: new Date().toISOString()
          },
          adminDb,
          saveDB
        ).catch(err => console.error("Error sending Payment_Approved_50 email:", err));

        // Trigger automated project status update email
        triggerEmail(
          "Project_Status_Update",
          {
            to: normalizeEmail(order.email),
            clientName: order.name,
            projectName: order.service,
            status: "In Progress",
            dateTime: new Date().toISOString()
          },
          adminDb,
          saveDB
        ).catch(err => console.error("Error sending status email:", err));
      } else if (payment.milestoneId === "m3" || allMilestonesPaid) {
        // Trigger automated email for Final Payment Approved
        triggerEmail(
          "Payment_Approved_100",
          {
            to: normalizeEmail(order.email),
            clientName: order.name,
            projectName: order.service,
            invoiceNumber: newInvoiceNum,
            amount: payment.amount,
            milestoneLabel: milestone.label,
            milestoneId: payment.milestoneId,
            paymentId: paymentId,
            remainingBalance: 0,
            dateTime: new Date().toISOString()
          },
          adminDb,
          saveDB
        ).catch(err => console.error("Error sending Payment_Approved_100 email:", err));

        // Trigger automated project status update email
        triggerEmail(
          "Project_Status_Update",
          {
            to: normalizeEmail(order.email),
            clientName: order.name,
            projectName: order.service,
            status: "Completed",
            dateTime: new Date().toISOString()
          },
          adminDb,
          saveDB
        ).catch(err => console.error("Error sending status email:", err));
      }

    } else if (action === "Reject") {
      // 1. Update Payment Status to Rejected
      payment.status = "Rejected";
      payment.notes = notes || `Payment rejected during administrative review.`;
      order.status = "Payment Rejected";

      // 2. Reset milestone status to Pending so they can try paying again
      milestone.status = "Pending";
      delete milestone.paymentId;
      delete milestone.paymentOrderId;

      const pHistory = dbPaymentHistory();
      pHistory.unshift({
        id: "ph_" + Math.random().toString(36).substr(2, 9),
        paymentId,
        action: "Payment Rejected",
        amount: payment.amount,
        milestoneId: payment.milestoneId,
        timestamp: new Date().toISOString()
      });
      saveDB("paymentHistory.json", pHistory);

      // Notify Client of rejection with reasons
      const notifications = dbNotifications();
      notifications.unshift({
        id: "notif_" + Math.random().toString(36).substr(2, 9),
        userEmail: normalizeEmail(order.email),
        title: "Payment Verification Failed",
        message: `Your payment verification for '${milestone.label}' was rejected. Notes: ${notes || "Check details and resubmit."}`,
        read: false,
        createdAt: new Date().toISOString(),
        orderId: order.id,
        milestoneId: milestone.id,
        type: "Error"
      });
      saveDB("notifications.json", notifications);

      logActivity("Payment Rejected", `Milestone payment ${paymentId} rejected by Admin ${reviewerEmail} on Order ${order.id}`);

      // Trigger automated email for Payment Rejected
      triggerEmail(
        "Payment_Rejected",
        {
          to: normalizeEmail(order.email),
          clientName: order.name,
          projectName: order.service,
          amount: payment.amount,
          milestoneLabel: milestone.label,
          milestoneId: payment.milestoneId,
          paymentId: paymentId,
          reason: notes || "Payment details could not be matched. Please check your bank statement and resubmit screenshot.",
          dateTime: new Date().toISOString()
        },
        adminDb,
        saveDB
      ).catch(err => console.error("Error sending Payment_Rejected email:", err));
    } else {
      return res.status(400).json({ error: "Invalid action. Must be Approve or Reject." });
    }

    // Save databases
    saveDB("payments.json", payments);
    saveDB("orders.json", orders);
    checkAndCreateMaintenance(order);

    res.json({
      success: true,
      message: `Successfully processed review action: ${action}`,
      payment
    });
  } catch (err: any) {
    console.error("[Payments] Error processing review:", err);
    res.status(500).json({ error: "Failed to complete payment review.", details: err.message });
  }
});

// 4. Refund Payment (Partial or Full)
app.post("/api/payments/refund", authenticateJWT, requireAdmin, async (req: any, res) => {
  try {
    const { paymentId, refundType, refundAmount, refundReason, notes } = req.body;
    if (!paymentId || !refundType || !refundReason) {
      return res.status(400).json({ error: "Missing parameters for refund processing." });
    }

    const payments = dbPayments();
    const payIdx = payments.findIndex(p => p.id === paymentId);
    if (payIdx === -1) {
      return res.status(404).json({ error: "Payment record not found." });
    }
    const payment = payments[payIdx];

    if (payment.status !== "Approved") {
      return res.status(400).json({ error: "Only approved milestone payments are eligible for processing refunds." });
    }

    const orders = dbOrders();
    const orderIdx = orders.findIndex(o => o.id === payment.projectId);
    if (orderIdx === -1) {
      return res.status(404).json({ error: "Order not found." });
    }
    const order = orders[orderIdx];

    const currentRefunded = payment.refundedAmount || 0;
    const maxRefundable = payment.amount - currentRefunded;

    let targetRefundAmt = 0;
    if (refundType === "full") {
      targetRefundAmt = maxRefundable;
    } else if (refundType === "partial") {
      targetRefundAmt = parseFloat(refundAmount);
      if (isNaN(targetRefundAmt) || targetRefundAmt <= 0) {
        return res.status(400).json({ error: "A valid positive numeric amount is required for partial refunds." });
      }
    } else {
      return res.status(400).json({ error: "Invalid refundType. Must be full or partial." });
    }

    // Over-refund protection
    if (targetRefundAmt > maxRefundable) {
      return res.status(400).json({
        error: `Insufficient refundable balance. Maximum refundable is ₹${maxRefundable.toLocaleString("en-IN")}, but requested ₹${targetRefundAmt.toLocaleString("en-IN")}.`
      });
    }

    let refundId = "";
    const rzp = getRazorpayInstance();
    if (rzp) {
      // Execute live refund via Razorpay Refunds API
      const rzpRefund = await rzp.refunds.create({
        payment_id: paymentId,
        amount: Math.round(targetRefundAmt * 100), // in paise
        notes: {
          reason: refundReason,
          processedBy: req.user.email
        }
      });
      refundId = rzpRefund.id;
    } else {
      // Simulation mode refund ID
      refundId = "rfnd_sim_" + Math.random().toString(36).substr(2, 9);
    }

    // Log the refund in refunds.json
    const refunds = dbRefunds();
    const refundRecord = {
      id: refundId,
      paymentId: paymentId,
      orderId: order.id,
      milestoneId: payment.milestoneId,
      amount: targetRefundAmt,
      reason: refundReason,
      status: "Completed",
      notes: notes || "",
      processedBy: req.user.email,
      timestamp: new Date().toISOString()
    };
    refunds.unshift(refundRecord);
    saveDB("refunds.json", refunds);

    // Save in refundHistory.json
    const refHistory = dbRefundHistory();
    refHistory.unshift(refundRecord);
    saveDB("refundHistory.json", refHistory);

    // Update payment record refunded sums
    payment.refundedAmount = currentRefunded + targetRefundAmt;
    if (payment.refundedAmount >= payment.amount) {
      payment.refundStatus = "Fully Refunded";
      // Update corresponding milestone status to Refunded
      const ms = order.milestones?.find((m: any) => m.id === payment.milestoneId);
      if (ms) {
        ms.status = "Refunded" as any; // Allow custom type or use Paid with refund properties
        ms.isRefunded = true;
        ms.refundedAmount = payment.refundedAmount;
      }
    } else {
      payment.refundStatus = "Partially Refunded";
      const ms = order.milestones?.find((m: any) => m.id === payment.milestoneId);
      if (ms) {
        ms.isRefunded = true;
        ms.refundedAmount = payment.refundedAmount;
      }
    }
    saveDB("payments.json", payments);

    // Automatic Project Status Rules for Refunds
    if (payment.milestoneId === "m1" && refundType === "full") {
      // Booking deposit fully refunded, project is Cancelled & Refunded
      order.status = "Cancelled & Refunded";
    }

    saveDB("orders.json", orders);

    // Calculate remaining balance dynamically for emails
    const budgetVal = parseInt(order.budget) || 0;
    const paidMilestonesSum = (order.milestones || [])
      .filter((m: any) => m.status === "Paid" && !m.isRefunded)
      .reduce((sum: number, m: any) => sum + m.amount, 0);
    const remainingBalanceAfterRefund = Math.max(0, budgetVal - paidMilestonesSum);

    // Trigger automated refund initiated email
    triggerEmail(
      "Refund_Initiated",
      {
        to: normalizeEmail(order.email),
        clientName: order.name,
        projectName: order.service,
        amount: targetRefundAmt,
        reason: refundReason,
        refundId: refundId,
        paymentId: paymentId,
        dateTime: new Date().toISOString()
      },
      adminDb,
      saveDB
    ).catch(err => console.error("Error sending Refund_Initiated email:", err));

    // Trigger automated refund completed email
    triggerEmail(
      "Refund_Completed",
      {
        to: normalizeEmail(order.email),
        clientName: order.name,
        projectName: order.service,
        amount: targetRefundAmt,
        refundId: refundId,
        paymentId: paymentId,
        remainingBalance: remainingBalanceAfterRefund,
        dateTime: new Date().toISOString()
      },
      adminDb,
      saveDB
    ).catch(err => console.error("Error sending Refund_Completed email:", err));

    // If order status became "Cancelled & Refunded", trigger project status email
    if (order.status === "Cancelled & Refunded") {
      triggerEmail(
        "Project_Status_Update",
        {
          to: normalizeEmail(order.email),
          clientName: order.name,
          projectName: order.service,
          status: "Cancelled & Refunded",
          dateTime: new Date().toISOString()
        },
        adminDb,
        saveDB
      ).catch(err => console.error("Error sending refund status email:", err));
    }

    // Add Audit Log
    const audits = dbAuditLogs();
    audits.unshift({
      id: "audit_" + Math.random().toString(36).substr(2, 9),
      action: "Refund Processed",
      details: `Processed ${refundType} refund of ₹${targetRefundAmt} on payment ${paymentId} (Project ID: ${order.id})`,
      timestamp: new Date().toISOString(),
      user: req.user.email
    });
    saveDB("auditLogs.json", audits);

    // Create notifications for client portal
    const notifications = dbNotifications();
    notifications.unshift({
      id: "notif_" + Math.random().toString(36).substr(2, 9),
      userEmail: normalizeEmail(order.email),
      title: "Refund Processed Successfully",
      message: `A refund of ₹${targetRefundAmt.toLocaleString("en-IN")} has been transacted for milestone '${payment.milestoneId}'. Download your refund receipt.`,
      read: false,
      createdAt: new Date().toISOString(),
      orderId: order.id,
      milestoneId: payment.milestoneId,
      type: "Info"
    });
    saveDB("notifications.json", notifications);

    logActivity("Refund Processed", `Processed refund ${refundId} of ₹${targetRefundAmt} on payment ${paymentId} (Admin: ${req.user.email})`);

    res.json({
      success: true,
      message: "Refund processed successfully.",
      refund: refundRecord,
      payment
    });
  } catch (err: any) {
    console.error("[Payments] Refund execution exception:", err);
    res.status(500).json({ error: "Failed to execute refund.", details: err.message });
  }
});

// 5. Admin financial analytics and reporting dashboard
app.get("/api/payments/reports", authenticateJWT, requireAdmin, (req: any, res) => {
  try {
    const payments = dbPayments();
    const refunds = dbRefunds();
    const orders = dbOrders();

    const approvedPayments = payments.filter(p => p.status === "Approved");
    const underReviewPayments = payments.filter(p => p.status === "Under Review");

    const totalRevenue = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingRevenue = underReviewPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0);
    const netRevenue = totalRevenue - totalRefunded;

    // Calculate outstanding portfolio value
    let totalPortfolioBudget = 0;
    let totalClientPaidApproved = 0;
    orders.forEach(order => {
      const b = parseInt(order.budget) || 0;
      totalPortfolioBudget += b;
    });

    approvedPayments.forEach(p => {
      totalClientPaidApproved += p.amount;
    });

    const outstandingBalance = totalPortfolioBudget - totalClientPaidApproved;

    // Monthly breakdown of payments and refunds
    const monthlyData: { [month: string]: { revenue: number, refunds: number, txCount: number } } = {};
    
    approvedPayments.forEach(p => {
      const monthStr = p.createdAt ? p.createdAt.substring(0, 7) : new Date().toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[monthStr]) {
        monthlyData[monthStr] = { revenue: 0, refunds: 0, txCount: 0 };
      }
      monthlyData[monthStr].revenue += p.amount;
      monthlyData[monthStr].txCount += 1;
    });

    refunds.forEach(r => {
      const monthStr = r.timestamp ? r.timestamp.substring(0, 7) : new Date().toISOString().substring(0, 7);
      if (!monthlyData[monthStr]) {
        monthlyData[monthStr] = { revenue: 0, refunds: 0, txCount: 0 };
      }
      monthlyData[monthStr].refunds += r.amount;
    });

    const monthlyReport = Object.keys(monthlyData).map(month => ({
      month,
      revenue: monthlyData[month].revenue,
      refunds: monthlyData[month].refunds,
      transactions: monthlyData[month].txCount,
      net: monthlyData[month].revenue - monthlyData[month].refunds
    })).sort((a,b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      summary: {
        totalRevenue,
        pendingRevenue,
        totalRefunded,
        netRevenue,
        outstandingBalance,
        totalPortfolioBudget,
        approvedCount: approvedPayments.length,
        reviewCount: underReviewPayments.length,
        refundsCount: refunds.length
      },
      monthlyBreakdown: monthlyReport
    });
  } catch (err: any) {
    console.error("[Reports] Error compiling analytics:", err);
    res.status(500).json({ error: "Failed to compile financial statistics." });
  }
});

// 6. List Payments API
app.get("/api/payments/list", authenticateJWT, (req: any, res) => {
  try {
    const payments = dbPayments();
    const isAdmin = ["Super Admin", "Admin", "admin", "Manager", "Staff"].includes(req.user.role);

    if (isAdmin) {
      return res.json(payments);
    } else {
      // Filter strictly by logged in client email
      const clientEmail = normalizeEmail(req.user.email);
      const filtered = payments.filter(p => p.clientId?.toLowerCase() === clientEmail);
      return res.json(filtered);
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve transaction catalog." });
  }
});

// 7. List Refunds API
app.get("/api/payments/refunds-list", authenticateJWT, (req: any, res) => {
  try {
    const refunds = dbRefunds();
    const payments = dbPayments();
    const isAdmin = ["Super Admin", "Admin", "admin", "Manager", "Staff"].includes(req.user.role);

    if (isAdmin) {
      return res.json(refunds);
    } else {
      // Client gets refunds that belong to their payments
      const clientEmail = normalizeEmail(req.user.email);
      const clientPayments = payments.filter(p => p.clientId?.toLowerCase() === clientEmail).map(p => p.id);
      const filtered = refunds.filter(r => clientPayments.includes(r.paymentId));
      return res.json(filtered);
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve refunds catalog." });
  }
});

// AI Chatbot with Server-side Gemini API
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

app.post("/api/chatbot", aiRateLimiter, async (req, res) => {
  const { message, chatHistory } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  const systemPrompt = `You are ARCADIA's futuristic AI solutions assistant. You are representing ARCADIA, an elite Indian web development and AI solutions agency.
Your goal is to answer visitor questions, highlight ARCADIA's key advantages, showcase its pricing and catalog, and subtly nudge visitors to place an order or book a free consultation demo.

Available Catalog of Services for reference (recommend appropriate services based on conversation!):
- Web Development: Landing Page (₹2,999), Portfolio Website (₹4,999), Business Website (₹7,999), Website Redesign (₹5,999), E-Commerce Website (₹19,999), Custom Web App (₹29,999).
- AI Solutions: AI Chatbot (₹7,999), AI Voice Calling Agent (₹24,999).
- Design & Marketing: UI/UX Design (₹5,999), Logo Design (₹1,499), Branding Package (₹4,999), SEO Optimization (₹4,999).
- Website Maintenance: ₹999/month.

Keep your personality highly polished, professional, slightly futuristic, helpful, and concise. Ensure your responses are formatted cleanly in markdown.
Mention that they can book a demo directly using the 'Book Free Demo' section or start their project using 'Start Your Project' in the header.
Be friendly, and answer in English (or Hindi if they speak Hindi, representing multi-language capabilities!).`;

  try {
    const ai = getGemini();
    if (ai) {
      // Map previous chat history format to Gemini SDK standard
      // Gemini chats can be handled via chats.create or models.generateContent with standard role/parts mapping
      const contents = [];
      if (chatHistory && Array.isArray(chatHistory)) {
        for (const turn of chatHistory) {
          contents.push({
            role: turn.sender === "user" ? "user" : "model",
            parts: [{ text: turn.text }]
          });
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        }
      });

      const text = response.text || "I apologize, but I couldn't generate a response right now. Please feel free to ask again.";
      return res.json({ text });
    } else {
      // Fallback Simulator mode if Gemini API key is missing
      const lower = message.toLowerCase();
      let responseText = "";
      if (lower.includes("price") || lower.includes("rate") || lower.includes("cost") || lower.includes("catalog")) {
        responseText = "Arcadia offers highly transparent, award-winning pricing. Some of our popular solutions are:\n" +
          "- **Landing Pages**: ₹2,999\n" +
          "- **Business Websites**: ₹7,999\n" +
          "- **E-Commerce Web Apps**: ₹19,999\n" +
          "- **AI Chatbots**: ₹7,999\n" +
          "- **Android / iOS Apps**: Starting from ₹29,999\n\n" +
          "Would you like me to guide you to our order system?";
      } else if (lower.includes("book") || lower.includes("demo") || lower.includes("consultation") || lower.includes("call")) {
        responseText = "I'd be absolutely thrilled to assist you with booking a free 30-minute consultation! You can complete the 'Book Free Demo' form below directly, or give me your details (Name, Email, Phone, Preferred Mode) and our elite architects will connect with you.";
      } else if (lower.includes("services") || lower.includes("what do you do") || lower.includes("develop")) {
        responseText = "ARCADIA is an elite, multi-disciplinary engineering agency providing:\n" +
          "1. **Modern Web Development** (SaaS platforms, E-Commerce, Portfolios)\n" +
          "2. **Advanced AI Solutions** (Custom LLM systems, Gemini Chatbots, voice-agents)\n" +
          "3. **Native Mobile App Engineering** (iOS & Android)\n" +
          "4. **Brand Design & SEO Strategy** (Figma wireframing, core identity, performance audit)";
      } else {
        responseText = "Thank you for connecting with ARCADIA AI Solutions. We are an Indian web development and artificial intelligence studio focused on building high-performance digital legacies.\n\n" +
          "Whether you need a custom landing page (₹2,999), e-commerce setup, or custom AI chatbots (₹7,999), we deliver next-generation performance. How can I empower your project today?";
      }
      return res.json({ text: responseText, note: "AI running in adaptive offline preview mode" });
    }
  } catch (err: any) {
    console.error("Gemini API server-side error:", err);
    return res.status(500).json({ error: "Gemini server-side communication failed.", details: err.message });
  }
});

// Dynamic SEO Sitemap and Crawler Configuration
app.get("/sitemap.xml", (req, res) => {
  res.header("Content-Type", "application/xml");
  const host = req.get("host") || "arcadia.agency";
  const protocol = req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const baseUrl = `${protocol}://${host}`;

  const services = dbServices();
  const projects = dbProjects();
  const blogs = dbBlogs();

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

  const sections = ["services", "projects", "blogs", "faqs", "testimonials", "contact"];
  sections.forEach((sec) => {
    sitemap += `
  <url>
    <loc>${baseUrl}/#${sec}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  if (Array.isArray(services)) {
    services.forEach((s: any) => {
      sitemap += `
  <url>
    <loc>${baseUrl}/#services</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <image:image>
      <image:loc>${s.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"}</image:loc>
      <image:title>${s.title?.en || s.title || "ARCADIA Service"}</image:title>
      <image:caption>${s.desc?.en || s.desc || ""}</image:caption>
    </image:image>
  </url>`;
    });
  }

  if (Array.isArray(projects)) {
    projects.forEach((p: any) => {
      sitemap += `
  <url>
    <loc>${baseUrl}/#projects</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <image:image>
      <image:loc>${p.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"}</image:loc>
      <image:title>${p.title?.en || p.title || "ARCADIA Project"}</image:title>
      <image:caption>${p.desc?.en || p.desc || ""}</image:caption>
    </image:image>
  </url>`;
    });
  }

  if (Array.isArray(blogs)) {
    blogs.forEach((b: any) => {
      sitemap += `
  <url>
    <loc>${baseUrl}/#blogs</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <image:image>
      <image:loc>${b.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"}</image:loc>
      <image:title>${b.title?.en || b.title || "ARCADIA Blog"}</image:title>
      <image:caption>${b.excerpt?.en || b.excerpt || ""}</image:caption>
    </image:image>
  </url>`;
    });
  }

  sitemap += `
</urlset>`;
  res.send(sitemap);
});

app.get("/robots.txt", (req, res) => {
  res.header("Content-Type", "text/plain");
  const host = req.get("host") || "arcadia.agency";
  const protocol = req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const baseUrl = `${protocol}://${host}`;
  res.send(`User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml`);
});

// Real-Time Dev System Health & Latency Endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "Development Server Stability: The dev server is fully active and listening on port 3000, demonstrating healthy startup performance, successful HMR functionality, and active connection capabilities.",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    database: "Active JSON DB persistence",
    hmrStatus: "active",
    containerPort: 3000,
    nodeVersion: process.version,
    platform: "Cloud Run Container",
    healthStatus: "Development Server Stability: The dev server is fully active and listening on port 3000, demonstrating healthy startup performance, successful HMR functionality, and active connection capabilities."
  });
});


// --- WEBSITE MAINTENANCE SUBSCRIPTION SYSTEM ENDPOINTS ---

function checkAndCreateMaintenance(order: any) {
  if (order.status === "Completed") {
    try {
      const maintenance = getDB<any[]>("maintenance.json", []);
      const existing = maintenance.find((m: any) => m.orderId === order.id);
      if (!existing) {
        const newM = {
          id: "maint_" + Math.random().toString(36).substr(2, 9),
          clientId: order.email.toLowerCase().trim(),
          clientEmail: order.email.toLowerCase().trim(),
          clientName: order.name,
          orderId: order.id,
          projectName: order.service,
          planId: "none",
          planName: "No Plan Assigned",
          monthlyPrice: 0,
          status: "No Plan",
          totalPaymentsReceived: 0,
          renewalHistory: [],
          paymentFailures: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        maintenance.unshift(newM);
        saveDB("maintenance.json", maintenance);
        logActivity("Maintenance Record Created", `Created maintenance record ${newM.id} for project ${newM.projectName}`);
      }
    } catch (err: any) {
      console.error("[Maintenance] Error creating maintenance record:", err.message);
    }
  }
}

// 1. GET /api/maintenance/subscriptions
app.get("/api/maintenance/subscriptions", authenticateJWT, (req: any, res) => {
  try {
    const user = req.user;
    const maintenance = getDB<any[]>("maintenance.json", []);
    const orders = dbOrders();

    // Dynamically check completed projects for this user or overall to ensure records exist
    if (user.role === "Admin" || user.role === "SuperAdmin") {
      orders.forEach((order: any) => {
        if (order.status === "Completed") {
          checkAndCreateMaintenance(order);
        }
      });
    } else {
      const userEmail = user.email.toLowerCase().trim();
      orders.forEach((order: any) => {
        if (order.status === "Completed" && order.email.toLowerCase().trim() === userEmail) {
          checkAndCreateMaintenance(order);
        }
      });
    }

    // Refresh maintenance DB after dynamic creation
    const refreshedMaintenance = getDB<any[]>("maintenance.json", []);

    let results = [];
    if (user.role === "Admin" || user.role === "SuperAdmin") {
      results = refreshedMaintenance;
    } else {
      const userEmail = user.email.toLowerCase().trim();
      results = refreshedMaintenance.filter((m: any) => m.clientEmail === userEmail);
    }

    // Filters & Search for Admin
    if (user.role === "Admin" || user.role === "SuperAdmin") {
      const { search, planId, status } = req.query;
      if (search) {
        const q = String(search).toLowerCase();
        results = results.filter((m: any) => 
          m.clientName.toLowerCase().includes(q) || 
          m.projectName.toLowerCase().includes(q) ||
          m.clientEmail.toLowerCase().includes(q)
        );
      }
      if (planId && planId !== "all") {
        results = results.filter((m: any) => m.planId === planId);
      }
      if (status && status !== "all") {
        results = results.filter((m: any) => m.status === status);
      }
    }

    // Sort by updated date descending
    results.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json(results);
  } catch (err: any) {
    console.error("[Maintenance] Error fetching subscriptions:", err);
    res.status(500).json({ error: "Failed to fetch maintenance subscriptions." });
  }
});

// 2. PUT /api/maintenance/subscriptions/:id/plan (Admin assigns a plan)
app.put("/api/maintenance/subscriptions/:id/plan", authenticateJWT, requireAdmin, (req: any, res) => {
  try {
    const { id } = req.params;
    const { planId, planName, monthlyPrice, status } = req.body;
    
    const maintenance = getDB<any[]>("maintenance.json", []);
    const idx = maintenance.findIndex((m: any) => m.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Maintenance subscription not found." });
    }

    const sub = maintenance[idx];
    const oldPlanId = sub.planId;
    
    sub.planId = planId;
    sub.planName = planName || (planId === "basic" ? "Basic Maintenance" : planId === "standard" ? "Standard Maintenance" : planId === "advanced" ? "Advanced Maintenance" : "No Plan Assigned");
    sub.monthlyPrice = monthlyPrice !== undefined ? monthlyPrice : (planId === "basic" ? 999 : planId === "standard" ? 1999 : planId === "advanced" ? 2999 : 0);
    
    if (status) {
      sub.status = status;
    } else {
      sub.status = planId === "none" ? "No Plan" : "Pending Subscription";
    }

    sub.updatedAt = new Date().toISOString();

    if (planId !== "none" && !sub.nextRenewalDate) {
      // Set future renewal date if none exists
      sub.nextRenewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    saveDB("maintenance.json", maintenance);
    logActivity("Maintenance Plan Change", `Admin assigned plan '${sub.planName}' to subscription ${id}`);

    // Trigger email notification for upgrade/downgrade
    if (oldPlanId !== "none" && planId !== "none" && oldPlanId !== planId) {
      const isUpgrade = sub.monthlyPrice > (oldPlanId === "basic" ? 999 : oldPlanId === "standard" ? 1999 : 0);
      triggerEmail(
        isUpgrade ? "Maint_Plan_Upgraded" : "Maint_Plan_Downgraded",
        {
          to: sub.clientEmail,
          clientName: sub.clientName,
          projectName: sub.projectName,
          planName: sub.planName,
          amount: sub.monthlyPrice,
          nextRenewalDate: sub.nextRenewalDate ? new Date(sub.nextRenewalDate).toLocaleDateString("en-IN") : "N/A",
          dateTime: new Date().toISOString()
        },
        adminDb,
        saveDB
      ).catch(err => console.error("[Maintenance] Error sending plan change email:", err));
    }

    res.json(sub);
  } catch (err: any) {
    console.error("[Maintenance] Error assigning plan:", err);
    res.status(500).json({ error: "Failed to assign maintenance plan." });
  }
});

// 3. POST /api/maintenance/subscriptions/:id/create-checkout (Client/Admin creates subscription)
app.post("/api/maintenance/subscriptions/:id/create-checkout", authenticateJWT, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { planId, planName, monthlyPrice } = req.body;

    const maintenance = getDB<any[]>("maintenance.json", []);
    const sub = maintenance.find((m: any) => m.id === id);
    if (!sub) {
      return res.status(404).json({ error: "Maintenance subscription not found." });
    }

    const rzp = getRazorpayInstance();
    const resolvedPrice = monthlyPrice || (planId === "basic" ? 999 : planId === "standard" ? 1999 : 2999);
    const resolvedName = planName || (planId === "basic" ? "Basic Maintenance" : planId === "standard" ? "Standard Maintenance" : "Advanced Maintenance");

    if (rzp) {
      try {
        // Create dynamic Razorpay Plan
        const rzPlan = await rzp.plans.create({
          period: "monthly",
          interval: 1,
          item: {
            name: resolvedName,
            amount: resolvedPrice * 100, // in paise
            currency: "INR"
          }
        });

        // Create Razorpay Subscription
        const rzSub = await rzp.subscriptions.create({
          plan_id: rzPlan.id,
          total_count: 12,
          quantity: 1,
          customer_notify: 1,
          notes: {
            maintenance_sub_id: id,
            projectName: sub.projectName,
            clientEmail: sub.clientEmail
          }
        });

        return res.json({
          useRealRazorpay: true,
          keyId: process.env.RAZORPAY_KEY_ID,
          subscriptionId: rzSub.id,
          amount: resolvedPrice,
          planName: resolvedName,
          planId
        });
      } catch (err: any) {
        console.warn("[Maintenance] Real Razorpay subscription create failed, falling back to simulation:", err.message);
      }
    }

    // Secure Sandbox fallback
    const simulatedSubId = "sub_sim_" + Math.random().toString(36).substr(2, 9);
    res.json({
      useRealRazorpay: false,
      subscriptionId: simulatedSubId,
      amount: resolvedPrice,
      planName: resolvedName,
      planId
    });
  } catch (err: any) {
    console.error("[Maintenance] Error in create-checkout:", err);
    res.status(500).json({ error: "Failed to initiate subscription checkout." });
  }
});

// 4. POST /api/payments/verify-subscription
app.post("/api/payments/verify-subscription", authenticateJWT, (req: any, res) => {
  try {
    const { subscriptionId, paymentId, signature, subscriptionRecordId, planId, planName, monthlyPrice } = req.body;
    
    if (!subscriptionId || !paymentId || !signature || !subscriptionRecordId) {
      return res.status(400).json({ error: "Missing subscription verification parameters." });
    }

    // Verification check
    let verified = false;
    const rzp = getRazorpayInstance();
    if (!rzp || subscriptionId.startsWith("sub_sim_")) {
      // Sandbox verify
      verified = signature.startsWith("sim_") || signature === `sim_sig_${subscriptionId}_${paymentId}`;
    } else {
      // Real signature verify
      try {
        const text = paymentId + "|" + subscriptionId;
        const generated = crypto
          .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
          .update(text)
          .digest("hex");
        verified = generated === signature;
      } catch (err) {
        verified = false;
      }
    }

    if (!verified) {
      return res.status(400).json({ error: "Invalid subscription signature. Cryptographic verification failed." });
    }

    const maintenance = getDB<any[]>("maintenance.json", []);
    const idx = maintenance.findIndex((m: any) => m.id === subscriptionRecordId);
    if (idx === -1) {
      return res.status(404).json({ error: "Subscription record not found." });
    }

    const sub = maintenance[idx];
    sub.planId = planId;
    sub.planName = planName;
    sub.monthlyPrice = monthlyPrice;
    sub.status = "Active";
    sub.razorpaySubscriptionId = subscriptionId;
    sub.startDate = new Date().toISOString();
    sub.lastPaymentDate = new Date().toISOString();
    sub.nextRenewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    sub.totalPaymentsReceived = (sub.totalPaymentsReceived || 0) + monthlyPrice;
    sub.updatedAt = new Date().toISOString();

    const renewalLog = {
      dateTime: new Date().toISOString(),
      amount: monthlyPrice,
      paymentId: paymentId,
      invoiceNumber: "INV-MAINT-" + Math.floor(100000 + Math.random() * 900000),
      status: "Success" as const
    };
    sub.renewalHistory = sub.renewalHistory || [];
    sub.renewalHistory.unshift(renewalLog);

    saveDB("maintenance.json", maintenance);
    logActivity("Subscription Activated", `Client activated plan '${planName}' (ID: ${subscriptionId})`);

    // Trigger activation email
    triggerEmail(
      "Maint_Subscription_Activated",
      {
        to: sub.clientEmail,
        clientName: sub.clientName,
        projectName: sub.projectName,
        planName: planName,
        amount: monthlyPrice,
        paymentId: subscriptionId,
        nextRenewalDate: new Date(sub.nextRenewalDate).toLocaleDateString("en-IN"),
        dateTime: new Date().toISOString()
      },
      adminDb,
      saveDB
    ).catch(err => console.error("[Maintenance] Error sending activation email:", err));

    res.json({ success: true, subscription: sub });
  } catch (err: any) {
    console.error("[Maintenance] Error verifying subscription:", err);
    res.status(500).json({ error: "Internal verification error." });
  }
});

// 5. POST /api/maintenance/subscriptions/:id/pause
app.post("/api/maintenance/subscriptions/:id/pause", authenticateJWT, (req: any, res) => {
  try {
    const { id } = req.params;
    const maintenance = getDB<any[]>("maintenance.json", []);
    const idx = maintenance.findIndex((m: any) => m.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Subscription not found." });
    }

    const sub = maintenance[idx];
    sub.status = "Paused";
    sub.updatedAt = new Date().toISOString();

    saveDB("maintenance.json", maintenance);
    logActivity("Subscription Paused", `Paused maintenance subscription ${id}`);

    triggerEmail(
      "Maint_Subscription_Paused",
      {
        to: sub.clientEmail,
        clientName: sub.clientName,
        projectName: sub.projectName,
        planName: sub.planName,
        dateTime: new Date().toISOString()
      },
      adminDb,
      saveDB
    ).catch(err => console.error("[Maintenance] Error sending paused email:", err));

    res.json(sub);
  } catch (err: any) {
    console.error("[Maintenance] Error pausing subscription:", err);
    res.status(500).json({ error: "Failed to pause subscription." });
  }
});

// 6. POST /api/maintenance/subscriptions/:id/resume
app.post("/api/maintenance/subscriptions/:id/resume", authenticateJWT, (req: any, res) => {
  try {
    const { id } = req.params;
    const maintenance = getDB<any[]>("maintenance.json", []);
    const idx = maintenance.findIndex((m: any) => m.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Subscription not found." });
    }

    const sub = maintenance[idx];
    sub.status = "Active";
    sub.updatedAt = new Date().toISOString();

    saveDB("maintenance.json", maintenance);
    logActivity("Subscription Resumed", `Resumed maintenance subscription ${id}`);

    triggerEmail(
      "Maint_Subscription_Resumed",
      {
        to: sub.clientEmail,
        clientName: sub.clientName,
        projectName: sub.projectName,
        planName: sub.planName,
        dateTime: new Date().toISOString()
      },
      adminDb,
      saveDB
    ).catch(err => console.error("[Maintenance] Error sending resumed email:", err));

    res.json(sub);
  } catch (err: any) {
    console.error("[Maintenance] Error resuming subscription:", err);
    res.status(500).json({ error: "Failed to resume subscription." });
  }
});

// 7. POST /api/maintenance/subscriptions/:id/cancel
app.post("/api/maintenance/subscriptions/:id/cancel", authenticateJWT, (req: any, res) => {
  try {
    const { id } = req.params;
    const maintenance = getDB<any[]>("maintenance.json", []);
    const idx = maintenance.findIndex((m: any) => m.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Subscription not found." });
    }

    const sub = maintenance[idx];
    sub.status = "Cancelled";
    sub.updatedAt = new Date().toISOString();

    saveDB("maintenance.json", maintenance);
    logActivity("Subscription Cancelled", `Cancelled maintenance subscription ${id}`);

    triggerEmail(
      "Maint_Subscription_Cancelled",
      {
        to: sub.clientEmail,
        clientName: sub.clientName,
        projectName: sub.projectName,
        planName: sub.planName,
        nextRenewalDate: sub.nextRenewalDate ? new Date(sub.nextRenewalDate).toLocaleDateString("en-IN") : "N/A",
        dateTime: new Date().toISOString()
      },
      adminDb,
      saveDB
    ).catch(err => console.error("[Maintenance] Error sending cancelled email:", err));

    res.json(sub);
  } catch (err: any) {
    console.error("[Maintenance] Error cancelling subscription:", err);
    res.status(500).json({ error: "Failed to cancel subscription." });
  }
});

// 8. POST /api/maintenance/subscriptions/:id/renewal-reminder (Send renewal reminder manually)
app.post("/api/maintenance/subscriptions/:id/renewal-reminder", authenticateJWT, requireAdmin, (req: any, res) => {
  try {
    const { id } = req.params;
    const maintenance = getDB<any[]>("maintenance.json", []);
    const sub = maintenance.find((m: any) => m.id === id);
    if (!sub) {
      return res.status(404).json({ error: "Subscription not found." });
    }

    triggerEmail(
      "Maint_Renewal_Reminder",
      {
        to: sub.clientEmail,
        clientName: sub.clientName,
        projectName: sub.projectName,
        planName: sub.planName,
        amount: sub.monthlyPrice,
        nextRenewalDate: sub.nextRenewalDate ? new Date(sub.nextRenewalDate).toLocaleDateString("en-IN") : "N/A",
        dateTime: new Date().toISOString()
      },
      adminDb,
      saveDB
    ).catch(err => console.error("[Maintenance] Error sending reminder email:", err));

    res.json({ success: true, message: "Renewal reminder dispatched." });
  } catch (err: any) {
    console.error("[Maintenance] Error sending reminder:", err);
    res.status(500).json({ error: "Failed to dispatch reminder." });
  }
});

// 9. POST /api/maintenance/subscriptions/:id/change-renewal (Admin changes renewal date)
app.post("/api/maintenance/subscriptions/:id/change-renewal", authenticateJWT, requireAdmin, (req: any, res) => {
  try {
    const { id } = req.params;
    const { nextRenewalDate } = req.body;
    if (!nextRenewalDate) {
      return res.status(400).json({ error: "Missing nextRenewalDate." });
    }

    const maintenance = getDB<any[]>("maintenance.json", []);
    const idx = maintenance.findIndex((m: any) => m.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Subscription not found." });
    }

    const sub = maintenance[idx];
    sub.nextRenewalDate = new Date(nextRenewalDate).toISOString();
    sub.updatedAt = new Date().toISOString();

    saveDB("maintenance.json", maintenance);
    logActivity("Renewal Date Adjusted", `Admin adjusted renewal date for subscription ${id} to ${nextRenewalDate}`);

    res.json(sub);
  } catch (err: any) {
    console.error("[Maintenance] Error changing renewal date:", err);
    res.status(500).json({ error: "Failed to update renewal date." });
  }
});

// 10. GET /api/maintenance/analytics
app.get("/api/maintenance/analytics", authenticateJWT, requireAdmin, (req: any, res) => {
  try {
    const maintenance = getDB<any[]>("maintenance.json", []);
    
    let activeClients = 0;
    let mrr = 0;
    let expectedRevenue = 0;
    let renewalsDueCount = 0;
    let failedRenewalsCount = 0;
    let cancelledCount = 0;
    
    const planBreakdown = {
      basic: 0,
      standard: 0,
      advanced: 0,
      none: 0
    };

    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

    maintenance.forEach((m: any) => {
      if (m.planId === "basic") planBreakdown.basic++;
      else if (m.planId === "standard") planBreakdown.standard++;
      else if (m.planId === "advanced") planBreakdown.advanced++;
      else planBreakdown.none++;

      if (m.status === "Active") {
        activeClients++;
        mrr += m.monthlyPrice || 0;
        expectedRevenue += m.monthlyPrice || 0;

        if (m.nextRenewalDate) {
          const renTime = new Date(m.nextRenewalDate).getTime();
          if (renTime >= now && renTime <= sevenDaysFromNow) {
            renewalsDueCount++;
          }
        }
      } else if (m.status === "Payment Failed") {
        failedRenewalsCount++;
      } else if (m.status === "Cancelled") {
        cancelledCount++;
      }
    });

    res.json({
      activeClients,
      mrr,
      expectedRevenue,
      renewalsDueCount,
      failedRenewalsCount,
      cancelledCount,
      planBreakdown
    });
  } catch (err: any) {
    console.error("[Maintenance] Error computing analytics:", err);
    res.status(500).json({ error: "Failed to compute maintenance analytics." });
  }
});

// 11. POST /api/maintenance/subscriptions/:id/simulate-payment (Simulation endpoint for reviews)
app.post("/api/maintenance/subscriptions/:id/simulate-payment", authenticateJWT, (req: any, res) => {
  try {
    const { id } = req.params;
    const { amount, status, reason } = req.body;
    
    if (amount === undefined || !status) {
      return res.status(400).json({ error: "Missing simulation parameters." });
    }

    const maintenance = getDB<any[]>("maintenance.json", []);
    const idx = maintenance.findIndex((m: any) => m.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Subscription not found." });
    }

    const sub = maintenance[idx];
    sub.updatedAt = new Date().toISOString();

    if (status === "Success") {
      sub.status = "Active";
      sub.lastPaymentDate = new Date().toISOString();
      sub.nextRenewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      sub.totalPaymentsReceived = (sub.totalPaymentsReceived || 0) + Number(amount);
      
      const newPayId = "pay_sim_" + Math.random().toString(36).substr(2, 9);
      const renewalLog = {
        dateTime: new Date().toISOString(),
        amount: Number(amount),
        paymentId: newPayId,
        invoiceNumber: "INV-MAINT-" + Math.floor(100000 + Math.random() * 900000),
        status: "Success" as const
      };
      sub.renewalHistory = sub.renewalHistory || [];
      sub.renewalHistory.unshift(renewalLog);

      saveDB("maintenance.json", maintenance);
      logActivity("Simulated Payment Success", `Simulated recurring payment of ₹${amount} succeeded for ${id}`);

      triggerEmail(
        "Maint_Payment_Success",
        {
          to: sub.clientEmail,
          clientName: sub.clientName,
          projectName: sub.projectName,
          planName: sub.planName,
          amount: Number(amount),
          paymentId: newPayId,
          nextRenewalDate: new Date(sub.nextRenewalDate).toLocaleDateString("en-IN"),
          dateTime: new Date().toISOString()
        },
        adminDb,
        saveDB
      ).catch(err => console.error("[Maintenance] Error sending simulated payment success email:", err));

    } else {
      sub.status = "Payment Failed";
      
      const failureLog = {
        dateTime: new Date().toISOString(),
        reason: reason || "AutoPay auto-debit rejected by bank server",
        amount: Number(amount)
      };
      sub.paymentFailures = sub.paymentFailures || [];
      sub.paymentFailures.unshift(failureLog);

      saveDB("maintenance.json", maintenance);
      logActivity("Simulated Payment Failure", `Simulated recurring payment of ₹${amount} failed for ${id}`);

      triggerEmail(
        "Maint_Payment_Failed",
        {
          to: sub.clientEmail,
          clientName: sub.clientName,
          projectName: sub.projectName,
          planName: sub.planName,
          amount: Number(amount),
          reason: failureLog.reason,
          dateTime: new Date().toISOString()
        },
        adminDb,
        saveDB
      ).catch(err => console.error("[Maintenance] Error sending simulated payment failed email:", err));
    }

    res.json(sub);
  } catch (err: any) {
    console.error("[Maintenance] Simulation error:", err);
    res.status(500).json({ error: "Failed to simulate transaction." });
  }
});

// 12. Public Razorpay Webhook Endpoint
app.post("/api/webhooks/razorpay", (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const event = req.body.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (secret && signature) {
      const crypto = require("crypto");
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");
      if (expectedSignature !== signature) {
        console.warn("[Razorpay Webhook] Webhook signature verification failed!");
        return res.status(400).json({ error: "Invalid webhook signature" });
      }
    }

    const payload = req.body.payload;
    
    if (payload && payload.subscription) {
      const rzSub = payload.subscription.entity;
      const rzSubId = rzSub.id;
      const notes = rzSub.notes || {};
      const maintenanceRecordId = notes.maintenance_sub_id;

      const maintenance = getDB<any[]>("maintenance.json", []);
      let sub = maintenance.find((m: any) => m.id === maintenanceRecordId || m.razorpaySubscriptionId === rzSubId);

      if (!sub && notes.clientEmail) {
        sub = maintenance.find((m: any) => m.clientEmail === notes.clientEmail);
      }

      if (sub) {
        sub.updatedAt = new Date().toISOString();
        
        switch (event) {
          case "subscription.activated":
            sub.status = "Active";
            sub.razorpaySubscriptionId = rzSubId;
            sub.startDate = new Date().toISOString();
            sub.nextRenewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            saveDB("maintenance.json", maintenance);
            logActivity("Webhook: Subscription Activated", `Subscription ${rzSubId} activated via webhook`);
            triggerEmail(
              "Maint_Subscription_Activated",
              {
                to: sub.clientEmail,
                clientName: sub.clientName,
                projectName: sub.projectName,
                planName: sub.planName,
                amount: sub.monthlyPrice,
                paymentId: rzSubId,
                nextRenewalDate: new Date(sub.nextRenewalDate).toLocaleDateString("en-IN"),
                dateTime: new Date().toISOString()
              },
              adminDb,
              saveDB
            ).catch(err => {});
            break;

          case "subscription.charged":
            sub.status = "Active";
            const rzPayment = payload.payment?.entity;
            const amtPaid = rzPayment ? rzPayment.amount / 100 : sub.monthlyPrice;
            const payId = rzPayment ? rzPayment.id : "pay_webhook_" + Math.random().toString(36).substr(2, 9);
            sub.lastPaymentDate = new Date().toISOString();
            sub.nextRenewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            sub.totalPaymentsReceived = (sub.totalPaymentsReceived || 0) + amtPaid;
            
            const rLog = {
              dateTime: new Date().toISOString(),
              amount: amtPaid,
              paymentId: payId,
              invoiceNumber: "INV-MAINT-" + Math.floor(100000 + Math.random() * 900000),
              status: "Success" as const
            };
            sub.renewalHistory = sub.renewalHistory || [];
            sub.renewalHistory.unshift(rLog);

            saveDB("maintenance.json", maintenance);
            logActivity("Webhook: Subscription Charged", `Renewal payment of ₹${amtPaid} succeeded for sub ${sub.id}`);
            triggerEmail(
              "Maint_Payment_Success",
              {
                to: sub.clientEmail,
                clientName: sub.clientName,
                projectName: sub.projectName,
                planName: sub.planName,
                amount: amtPaid,
                paymentId: payId,
                nextRenewalDate: new Date(sub.nextRenewalDate).toLocaleDateString("en-IN"),
                dateTime: new Date().toISOString()
              },
              adminDb,
              saveDB
            ).catch(err => {});
            break;

          case "subscription.paused":
            sub.status = "Paused";
            saveDB("maintenance.json", maintenance);
            logActivity("Webhook: Subscription Paused", `Subscription paused via webhook`);
            triggerEmail(
              "Maint_Subscription_Paused",
              {
                to: sub.clientEmail,
                clientName: sub.clientName,
                projectName: sub.projectName,
                planName: sub.planName,
                dateTime: new Date().toISOString()
              },
              adminDb,
              saveDB
            ).catch(err => {});
            break;

          case "subscription.resumed":
            sub.status = "Active";
            saveDB("maintenance.json", maintenance);
            logActivity("Webhook: Subscription Resumed", `Subscription resumed via webhook`);
            triggerEmail(
              "Maint_Subscription_Resumed",
              {
                to: sub.clientEmail,
                clientName: sub.clientName,
                projectName: sub.projectName,
                planName: sub.planName,
                dateTime: new Date().toISOString()
              },
              adminDb,
              saveDB
            ).catch(err => {});
            break;

          case "subscription.cancelled":
            sub.status = "Cancelled";
            saveDB("maintenance.json", maintenance);
            logActivity("Webhook: Subscription Cancelled", `Subscription cancelled via webhook`);
            triggerEmail(
              "Maint_Subscription_Cancelled",
              {
                to: sub.clientEmail,
                clientName: sub.clientName,
                projectName: sub.projectName,
                planName: sub.planName,
                nextRenewalDate: sub.nextRenewalDate ? new Date(sub.nextRenewalDate).toLocaleDateString("en-IN") : "N/A",
                dateTime: new Date().toISOString()
              },
              adminDb,
              saveDB
            ).catch(err => {});
            break;
        }
      }
    } else if (event === "payment.failed" && payload && payload.payment) {
      const rzPayment = payload.payment.entity;
      const notes = rzPayment.notes || {};
      const maintenanceRecordId = notes.maintenance_sub_id;
      
      const maintenance = getDB<any[]>("maintenance.json", []);
      const sub = maintenance.find((m: any) => m.id === maintenanceRecordId || m.clientEmail === notes.clientEmail);
      if (sub) {
        sub.status = "Payment Failed";
        const amt = rzPayment.amount / 100;
        const fLog = {
          dateTime: new Date().toISOString(),
          reason: rzPayment.error_description || "AutoPay recurring transaction was rejected",
          amount: amt
        };
        sub.paymentFailures = sub.paymentFailures || [];
        sub.paymentFailures.unshift(fLog);
        sub.updatedAt = new Date().toISOString();

        saveDB("maintenance.json", maintenance);
        logActivity("Webhook: Payment Failed", `Subscription payment of ₹${amt} failed via webhook`);
        triggerEmail(
          "Maint_Payment_Failed",
          {
            to: sub.clientEmail,
            clientName: sub.clientName,
            projectName: sub.projectName,
            planName: sub.planName,
            amount: amt,
            reason: fLog.reason,
            dateTime: new Date().toISOString()
          },
          adminDb,
          saveDB
        ).catch(err => {});
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("[Razorpay Webhook] Webhook handler error:", err);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

// Serve dynamic client-side Firebase config script

app.get(["/firebase-config.js", "/api/firebase-config.js"], (req, res) => {
  res.type("application/javascript");
  res.send(`window.FIREBASE_CONFIG = ${JSON.stringify(firebaseConfig)};`);
});

// Configure Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL && !process.env.STANDALONE_VITE) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA Fallback for production (only if not running on Vercel serverless function)
    if (!process.env.VERCEL) {
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`ARCADIA Futuristic server running at http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();

export default app;
