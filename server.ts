import express from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 5713;
// Use RSA keys if provided, otherwise fallback to secret
const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY ? fs.readFileSync(process.env.JWT_PRIVATE_KEY, "utf8") : null;
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY ? fs.readFileSync(process.env.JWT_PUBLIC_KEY, "utf8") : null;
const JWT_SECRET = process.env.JWT_SECRET || "arcadia_secret_key_2026_futuristic_studio";


// Increase limit for base64 file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Try multiple possible data dir locations (compatible with local dev and Vercel serverless)
const DATA_DIR = (() => {
  const candidates = [
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), "..", "data"),
    "/var/task/data",
    "/var/task/api/data",
    path.join("/tmp", "arcadia_data")
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  // Default: try to create at cwd
  const fallback = path.join(process.cwd(), "data");
  try { fs.mkdirSync(fallback, { recursive: true }); } catch {}
  return fallback;
})();

// In-memory cache for serverless container state persistence
const memoryStore: Record<string, any> = {};

// Helper for JSON Database Persistence
function getDB<T>(filename: string, defaultData: T): T {
  if (memoryStore[filename]) {
    return memoryStore[filename] as T;
  }
  
  const primaryPath = path.join(DATA_DIR, filename);
  const tmpPath = path.join("/tmp", "arcadia_data", filename);
  
  // Try reading from /tmp first (in case serverless container modified it earlier)
  for (const filepath of [tmpPath, primaryPath]) {
    if (fs.existsSync(filepath)) {
      try {
        const raw = fs.readFileSync(filepath, "utf8");
        const parsed = JSON.parse(raw);
        // If file exists but array is empty, fall back to seed data
        if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(defaultData) && (defaultData as any[]).length > 0) {
          memoryStore[filename] = defaultData;
          return defaultData;
        }
        memoryStore[filename] = parsed;
        return parsed as T;
      } catch (err) {
        console.error(`Error reading database file from ${filepath}:`, err);
      }
    }
  }

  // If not found or failed, store and try writing defaultData
  memoryStore[filename] = defaultData;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(primaryPath, JSON.stringify(defaultData, null, 2), "utf8");
  } catch (err) {
    // Read-only filesystem on Vercel; try writing to /tmp/arcadia_data instead
    try {
      const tmpDir = path.join("/tmp", "arcadia_data");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(tmpPath, JSON.stringify(defaultData, null, 2), "utf8");
    } catch {}
  }
  return defaultData;
}

function saveDB<T>(filename: string, data: T) {
  // Update in-memory store immediately so running server instance sees new changes
  memoryStore[filename] = data;

  const primaryPath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(primaryPath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    // If primary path is read-only (Vercel serverless), write to /tmp/arcadia_data
    try {
      const tmpDir = path.join("/tmp", "arcadia_data");
      const tmpPath = path.join(tmpDir, filename);
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf8");
    } catch (tmpErr) {
      console.error(`Could not write database file ${filename} to disk or /tmp:`, tmpErr);
    }
  }
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
const dbBookings = () => getDB<any[]>("bookings.json", []);
const dbOrders = () => getDB<any[]>("orders.json", []);
const dbInquiries = () => getDB<any[]>("inquiries.json", []);
const dbVacancies = () => getDB<any[]>("vacancies.json", seedVacancies);
const dbApplications = () => getDB<any[]>("applications.json", []);
const dbUsers = () => getDB<any[]>("users.json", []);
const dbNotifications = () => getDB<any[]>("notifications.json", []);
const dbLogs = () => getDB<any[]>("logs.json", [
  { id: "l1", action: "System Init", details: "Arcadia core platform initiated successfully on port 3000.", timestamp: new Date().toISOString() }
]);

// Auth Credentials
const DEFAULT_ADMIN_EMAIL = process.env.USER_EMAIL || "godesportsfreefire@gmail.com";
const BACKUP_ADMIN_EMAIL = "admin@arcadia.agency";
const ADMIN_PASSWORD_HASH = bcryptjs.hashSync("admin", 10);

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

// Authentication API
// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: "Too many login attempts, please try again later." }
});

// Input validation schemas
const adminLoginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1)
});

app.post("/api/auth/login", authLimiter, (req, res) => {
  const parseResult = adminLoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid input data." });
  }
  const { email, password } = parseResult.data;

  const normalizedEmail = email.toLowerCase().trim();
  if (normalizedEmail === "arcadia" && password === "findme@arcadia1509") {
    const signOptions = JWT_PRIVATE_KEY ? { algorithm: "RS256" as const } : {};
    const token = jwt.sign({ email: normalizedEmail, role: "admin" }, JWT_PRIVATE_KEY || JWT_SECRET, { expiresIn: "24h", ...signOptions });
    logActivity("Admin Login", `Admin logged in successfully from: ${email}`);
    return res.json({ token, email: normalizedEmail });
  }

  return res.status(401).json({ error: "Invalid administrative credentials." });
});

// Middleware to verify JWT token
const authenticateJWT = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const verifyKey = JWT_PUBLIC_KEY || JWT_SECRET;
    const decoded = jwt.verify(token, verifyKey, JWT_PUBLIC_KEY ? { algorithms: ["RS256"] } : undefined);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token or session expired." });
  }
};

// Mock Emails API
app.get("/api/mock-emails", authenticateJWT, (req, res) => {
  res.json(getDB<any[]>("mock_emails.json", []));
});

app.post("/api/mock-emails/clear", authenticateJWT, (req, res) => {
  saveDB("mock_emails.json", []);
  res.json({ success: true });
});

// ============================================
// Client Authentication & Portal Routes
// ============================================

// Email verification endpoint
app.get("/api/auth/verify-email", (req, res) => {
  const { token, email } = req.query as { token?: string; email?: string };
  if (!token || !email) {
    return res.status(400).json({ error: "Invalid verification link." });
  }
  const normalizedEmail = email.toLowerCase().trim();
  const users = dbUsers();
  const user = users.find(u => u.email === normalizedEmail && u.verificationToken === token);
  if (!user) {
    return res.status(400).json({ error: "Invalid token or email." });
  }
  if (Date.now() > (user.verificationExpires || 0)) {
    return res.status(400).json({ error: "Verification token expired." });
  }
  user.emailVerified = true;
  delete user.verificationToken;
  delete user.verificationExpires;
  saveDB("users.json", users);
  logActivity("Email Verified", `User ${normalizedEmail} verified email.`);
  return res.json({ success: true, message: "Email successfully verified." });
});

// Input validation schema for client registration
const clientRegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6)
});

app.post("/api/auth/client-register", authLimiter, (req, res) => {
  const parseResult = clientRegisterSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid registration data." });
  }
  const { email, name, password } = parseResult.data;

  const normalizedEmail = email.toLowerCase().trim();
  const users = dbUsers();

  if (users.find(u => u.email === normalizedEmail)) {
    return res.status(400).json({ error: "An account with this email already exists." });
  }

  const hashedPassword = bcryptjs.hashSync(password, 12);
  const verificationToken = Math.random().toString(36).substr(2, 12);
  const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h

  const newUser = {
    id: "u_" + Math.random().toString(36).substr(2, 9),
    email: normalizedEmail,
    name,
    passwordHash: hashedPassword,
    avatar: `https://images.unsplash.com/photo-${["1534528741775-53994a69daeb", "1507003211169-0a1dd7228f2d", "1494790108377-be9c29b29330", "1500648767791-00dcc994a43e"][Math.floor(Math.random() * 4)]}?auto=format&fit=crop&w=150&q=80`,
    emailVerified: false,
    verificationToken,
    verificationExpires,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveDB("users.json", users);

  // Send mock verification email
  const verifyLink = `${process.env.BASE_URL || "http://localhost:3000"}/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;
  const emailBody = `Please verify your email by clicking the following link: ${verifyLink}`;
  sendMockEmail(normalizedEmail, "Email Verification", emailBody, "verification");

  const signOptions = JWT_PRIVATE_KEY ? { algorithm: "RS256" as const } : {};
  const token = jwt.sign({ email: normalizedEmail, name, role: "client" }, JWT_PRIVATE_KEY || JWT_SECRET, { expiresIn: "24h", ...signOptions });
  logActivity("Client Registered", `New client account registered: ${name} (${normalizedEmail})`);

  return res.json({
    token,
    user: { email: normalizedEmail, name, avatar: newUser.avatar, emailVerified: false }
  });
});

// Input validation schema for client login
const clientLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

app.post("/api/auth/client-login", authLimiter, (req, res) => {
  const parseResult = clientLoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid login data." });
  }
  const { email, password } = parseResult.data;

  const normalizedEmail = email.toLowerCase().trim();
  const users = dbUsers();

  const user = users.find(u => u.email === normalizedEmail);
  if (!user || !user.passwordHash || !bcryptjs.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  if (!user.emailVerified) {
    return res.status(403).json({ error: "Email not verified. Please check your inbox." });
  }

  const signOptions = JWT_PRIVATE_KEY ? { algorithm: "RS256" as const } : {};
  const token = jwt.sign({ email: normalizedEmail, name: user.name, role: "client" }, JWT_PRIVATE_KEY || JWT_SECRET, { expiresIn: "24h", ...signOptions });
  logActivity("Client Login", `Client logged in successfully: ${user.name} (${normalizedEmail})`);

  return res.json({
    token,
    user: { email: normalizedEmail, name: user.name, avatar: user.avatar, emailVerified: user.emailVerified }
  });
});

// Client Forgot Password - Request Reset Code
app.post("/api/auth/client-forgot", authLimiter, (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }
  
  const normalizedEmail = email.toLowerCase().trim();

  // Generate a mock code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  if (!(global as any).resetCodes) {
    (global as any).resetCodes = {};
  }
  (global as any).resetCodes[normalizedEmail] = {
    code,
    expiresAt: Date.now() + 15 * 60 * 1000
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

  logActivity("Client Forgot Password", `Forgot password code requested for: ${normalizedEmail}. Code: ${code}`);

  return res.json({
    message: "A password reset verification code has been dispatched.",
    code
  });
});

// Client Reset Password - Verify & Update
app.post("/api/auth/client-reset", (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "Email, code, and new password are required." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const users = dbUsers();
  const userIdx = users.findIndex(u => u.email === normalizedEmail);

  if (userIdx === -1) {
    return res.status(404).json({ error: "No account found with this email address." });
  }

  const resetData = (global as any).resetCodes?.[normalizedEmail];
  if (!resetData || resetData.code !== code.trim() || resetData.expiresAt < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired password reset verification code." });
  }

  const hashedPassword = bcryptjs.hashSync(newPassword, 10);
  users[userIdx].passwordHash = hashedPassword;
  saveDB("users.json", users);

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

    const normalizedEmail = email.toLowerCase().trim();
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

// Sandbox Fast-Access Session Generator
app.post("/api/auth/social-sandbox", (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: "Email and name are required for sandbox." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const users = dbUsers();
  let user = users.find(u => u.email === normalizedEmail);

  if (!user) {
    user = {
      id: "u_" + Math.random().toString(36).substr(2, 9),
      email: normalizedEmail,
      name,
      avatar: normalizedEmail.includes("vikram") 
        ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
        : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveDB("users.json", users);
    logActivity("Sandbox Register", `Registered Sandbox Emulator Client: ${name}`);
  }

  const token = jwt.sign({ email: normalizedEmail, name: user.name, role: "client" }, JWT_SECRET, { expiresIn: "24h" });
  logActivity("Sandbox Login", `Logged in Sandbox Emulator Client: ${name}`);

  return res.json({
    token,
    user: { email: normalizedEmail, name: user.name, avatar: user.avatar }
  });
});

// Admin Users List Endpoint
app.get("/api/users", authenticateJWT, (req: any, res) => {
  const users = dbUsers();
  const sanitized = users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    avatar: u.avatar,
    createdAt: u.createdAt
  }));
  res.json(sanitized);
});

// Approve & Request Payment Action
app.put("/api/orders/:id/approve-request", authenticateJWT, (req: any, res) => {
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

    sendMockEmail(order.email.toLowerCase().trim(), `ARCADIA Payment Request: ${firstMilestone.label}`, paymentReqHTML, "payment_request");
  }

  // Create active notification for client portal
  const notifications = dbNotifications();
  const m1Amt = order.milestones && order.milestones.length > 0 ? order.milestones[0].amount : 0;
  const newNotification = {
    id: "notif_" + Math.random().toString(36).substr(2, 9),
    userEmail: order.email.toLowerCase().trim(),
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

// Ownership check helper for client resources
function ensureOwner(resourceEmail: string, userEmail: string, res: any): boolean {
  if (resourceEmail.toLowerCase().trim() !== userEmail.toLowerCase().trim()) {
    res.status(403).json({ error: "Access denied. Resource does not belong to the authenticated user." });
    return false;
  }
  return true;
}

// Secured Client Data Endpoints with ownership verification
app.get("/api/client/notifications", authenticateJWT, (req: any, res) => {
  const userEmail = req.user.email;
  const notifications = dbNotifications();
  const filtered = notifications.filter(n => n.userEmail.toLowerCase().trim() === userEmail.toLowerCase().trim());
  res.json(filtered);
});

app.put("/api/client/notifications/read", authenticateJWT, (req: any, res) => {
  const userEmail = req.user.email;
  const notifications = dbNotifications();
  notifications.forEach(n => {
    if (n.userEmail.toLowerCase().trim() === userEmail.toLowerCase().trim()) {
      n.read = true;
    }
  });
  saveDB("notifications.json", notifications);
  res.json({ success: true });
});

app.get("/api/client/orders", authenticateJWT, (req: any, res) => {
  const userEmail = req.user.email;
  const orders = dbOrders();
  const filtered = orders.filter(o => o.email.toLowerCase().trim() === userEmail.toLowerCase().trim());
  res.json(filtered);
});

app.get("/api/client/bookings", authenticateJWT, (req: any, res) => {
  const userEmail = req.user.email;
  const bookings = dbBookings();
  const filtered = bookings.filter(b => b.email.toLowerCase().trim() === userEmail.toLowerCase().trim());
  res.json(filtered);
});

app.get("/api/client/inquiries", authenticateJWT, (req: any, res) => {
  const userEmail = req.user.email;
  const inquiries = dbInquiries();
  const filtered = inquiries.filter(i => i.email.toLowerCase().trim() === userEmail.toLowerCase().trim());
  res.json(filtered);
});

// Services API
app.get("/api/services", (req, res) => {
  res.json(dbServices());
});

app.post("/api/services", authenticateJWT, (req, res) => {
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

app.put("/api/services/:id", authenticateJWT, (req, res) => {
  const services = dbServices();
  const idx = services.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Service not found." });
  
  services[idx] = { ...services[idx], ...req.body };
  saveDB("services.json", services);
  logActivity("Update Service", `Updated service: ${services[idx].title}`);
  res.json(services[idx]);
});

app.delete("/api/services/:id", authenticateJWT, (req, res) => {
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

app.post("/api/projects", authenticateJWT, (req, res) => {
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

app.put("/api/projects/:id", authenticateJWT, (req, res) => {
  const projects = dbProjects();
  const idx = projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Project not found." });
  
  projects[idx] = { ...projects[idx], ...req.body };
  saveDB("projects.json", projects);
  logActivity("Update Project", `Updated portfolio project: ${projects[idx].title}`);
  res.json(projects[idx]);
});

app.delete("/api/projects/:id", authenticateJWT, (req, res) => {
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
app.get("/api/bookings", authenticateJWT, (req, res) => {
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
  res.status(201).json(newBooking);
});

// Orders API
app.get("/api/orders", authenticateJWT, (req, res) => {
  res.json(dbOrders());
});

app.post("/api/orders", (req, res) => {
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

app.put("/api/orders/:id/status", authenticateJWT, (req, res) => {
  const orders = dbOrders();
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Order not found." });
  
  orders[idx].status = req.body.status;
  saveDB("orders.json", orders);
  logActivity("Order Status Change", `Order status updated to '${req.body.status}' for client ${orders[idx].name}`);
  res.json(orders[idx]);
});

// Admin requests / sends payment link for a specific milestone
app.put("/api/orders/:id/milestones/:mid/request", authenticateJWT, (req, res) => {
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

  sendMockEmail(order.email.toLowerCase().trim(), `ARCADIA Payment Request: ${milestone.label}`, paymentReqHTML, "payment_request");
  
  // Create active notification for client portal
  const notifications = dbNotifications();
  const newNotification = {
    id: "notif_" + Math.random().toString(36).substr(2, 9),
    userEmail: order.email.toLowerCase().trim(),
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

// Client pays a milestone
app.put("/api/orders/:id/milestones/:mid/pay", (req, res) => {
  const orders = dbOrders();
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Order not found." });

  const order = orders[idx];
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
    userEmail: order.email.toLowerCase().trim(),
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

app.put("/api/orders/:id/pay", (req, res) => {
  const orders = dbOrders();
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Order not found." });
  
  orders[idx].isPaid = true;
  orders[idx].paymentAmount = req.body.amount || 5000;
  // Set all milestones to paid if paying full
  if (orders[idx].milestones) {
    orders[idx].milestones = orders[idx].milestones.map((m: any) => ({
      ...m,
      status: "Paid",
      paidAt: new Date().toISOString(),
      invoiceGenerated: true
    }));
  }
  saveDB("orders.json", orders);
  logActivity("Order Paid (Manual/Admin)", `Order ${orders[idx].id} paid successfully (₹${orders[idx].paymentAmount})`);
  res.json(orders[idx]);
});

// Blogs API
app.get("/api/blogs", (req, res) => {
  res.json(dbBlogs());
});

app.post("/api/blogs", authenticateJWT, (req, res) => {
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

app.put("/api/blogs/:id", authenticateJWT, (req, res) => {
  const blogs = dbBlogs();
  const idx = blogs.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Blog post not found." });
  
  blogs[idx] = { ...blogs[idx], ...req.body };
  saveDB("blogs.json", blogs);
  logActivity("Update Blog", `Updated blog: ${blogs[idx].title}`);
  res.json(blogs[idx]);
});

app.delete("/api/blogs/:id", authenticateJWT, (req, res) => {
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

app.post("/api/faqs", authenticateJWT, (req, res) => {
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

app.put("/api/faqs/:id", authenticateJWT, (req, res) => {
  const faqs = dbFAQs();
  const idx = faqs.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "FAQ not found." });
  
  faqs[idx] = { ...faqs[idx], ...req.body };
  saveDB("faqs.json", faqs);
  logActivity("Update FAQ", `Updated FAQ: ${faqs[idx].question}`);
  res.json(faqs[idx]);
});

app.delete("/api/faqs/:id", authenticateJWT, (req, res) => {
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

app.post("/api/testimonials", authenticateJWT, (req, res) => {
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
app.get("/api/inquiries", authenticateJWT, (req, res) => {
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
app.get("/api/logs", authenticateJWT, (req, res) => {
  res.json(dbLogs());
});

// Vacancies API
app.get("/api/vacancies", (req, res) => {
  res.json(dbVacancies());
});

app.post("/api/vacancies", authenticateJWT, (req, res) => {
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

app.delete("/api/vacancies/:id", authenticateJWT, (req, res) => {
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
app.get("/api/applications", authenticateJWT, (req, res) => {
  res.json(dbApplications());
});

app.post("/api/applications", (req, res) => {
  const applications = dbApplications();
  const { role, name, email, resume, note } = req.body;
  if (!role || !name || !email || !resume) {
    return res.status(400).json({ error: "Missing required application fields." });
  }

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

app.post("/api/chatbot", async (req, res) => {
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
    }
  } catch (err: any) {
    console.error("Gemini API server-side error (falling back to simulator):", err.message);
    // Fall through to simulator mode below
  }

  // Fallback Simulator mode if Gemini API key is missing or call failed
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
  } else if (lower.includes("order") || lower.includes("buy") || lower.includes("purchase") || lower.includes("start")) {
    responseText = "Absolutely! You can start your project right away through our 'Start Your Project' section. Simply select a service, fill in your details, and we'll get back to you within 24 hours with a personalized proposal. Click the **Order** button on any service card to begin!";
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
});

// Real-Time Dev System Health & Latency Endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    database: "Active JSON DB persistence",
    hmrStatus: "disabled",
    containerPort: 5713,
    nodeVersion: process.version,
    platform: "Cloud Run Container"
  });
});

// Configure Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA Fallback for production
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`ARCADIA Futuristic server running at http://0.0.0.0:${PORT}`);
    });
  }
}

// Start server only when running directly (not imported by Vercel serverless)
if (!process.env.VERCEL) {
  startServer();
}

export default app;
