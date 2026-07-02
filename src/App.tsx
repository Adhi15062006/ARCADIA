import React, { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import { StackedLogos } from "./components/ui/stacked-logos";
import { FlipText } from "./components/ui/flip-text";

const Services = React.lazy(() => import("./components/Services"));
const Portfolio = React.lazy(() => import("./components/Portfolio"));
import Pricing from "./components/Pricing";
import ContactForms from "./components/ContactForms";
import AdminDashboard from "./components/AdminDashboard";
import ClientDashboard from "./components/ClientDashboard";
import LoginPortal from "./components/LoginPortal";
import Chatbot from "./components/Chatbot";
import MiscSection from "./components/MiscSection";
import { Service, Project, BlogPost, FAQ, Testimonial } from "./types";
import {
  Sparkles,
  MapPin,
  Mail,
  Globe,
  CheckCircle,
  Clock,
  WifiOff,
  Compass,
  Instagram,
  MessageCircle,
  Linkedin,
  MessageSquare,
  ArrowRight
} from "lucide-react";

const decodeToken = (token: string) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
};

const isTokenValid = (token: string | null) => {
  if (!token) return false;
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return false;
  return decoded.exp * 1000 > Date.now();
};

export default function App() {
  // Navigation & State Engine
  const [currentView, setCurrentView] = useState("home");
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [prefilledService, setPrefilledService] = useState("");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isClientLoggedIn, setIsClientLoggedIn] = useState(false);

  // Developer diagnostic overlay state
  const [showDevOverlay, setShowDevOverlay] = useState(false);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [networkType, setNetworkType] = useState<string>("Unknown");

  // Core Data Lists
  const [services, setServices] = useState<Service[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Live Clock & Offline System
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState("");

  // Notification Toast state
  const [toast, setToast] = useState<{ type: "success" | "info" | "error"; msg: string } | null>(null);

  useEffect(() => {
    // 1. Initial Data Load
    fetchCatalogData();

    // 2. Network Checkers
    const handleOnline = () => {
      setIsOnline(true);
      showToast("success", "Connection restored! Caching synchronized.");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast("error", "Offline mode. Utilizing local caching layers.");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 3. Indian corporate time clock updater
    const interval = setInterval(() => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      };
      setCurrentTime(new Date().toLocaleTimeString("en-IN", options));
    }, 1000);

    // 4. Token checker
    const token = localStorage.getItem("arcadia_admin_token");
    if (token && isTokenValid(token)) {
      setIsAdminLoggedIn(true);
    } else {
      localStorage.removeItem("arcadia_admin_token");
      setIsAdminLoggedIn(false);
    }

    const clientToken = localStorage.getItem("arcadia_client_token");
    if (clientToken && isTokenValid(clientToken)) {
      setIsClientLoggedIn(true);
    } else {
      localStorage.removeItem("arcadia_client_token");
      setIsClientLoggedIn(false);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Dev overlay checking loop & hotkeys
  useEffect(() => {
    const checkLatency = async () => {
      const start = performance.now();
      try {
        const res = await fetch("/api/health?_t=" + start);
        if (res.ok) {
          const duration = Math.round(performance.now() - start);
          setApiLatency(duration);
          setLatencyHistory(prev => [...prev.slice(-9), duration]); // last 10 entries
        }
      } catch (err) {
        setApiLatency(null);
      }
    };

    checkLatency();
    const latencyInterval = setInterval(checkLatency, 10000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setShowDevOverlay(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    const conn = (navigator as any).connection;
    if (conn) {
      setNetworkType(`${conn.effectiveType || "4g"} (${conn.downlink || 10} Mbps)`);
    }

    return () => {
      clearInterval(latencyInterval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const fetchCatalogData = async () => {
    setIsLoading(true);
    try {
      const [sRes, pRes, bRes, fRes, tRes] = await Promise.all([
        fetch("/api/services"),
        fetch("/api/projects"),
        fetch("/api/blogs"),
        fetch("/api/faqs"),
        fetch("/api/testimonials")
      ]);

      if (sRes.ok && pRes.ok && bRes.ok && fRes.ok && tRes.ok) {
        setServices(await sRes.json());
        setProjects(await pRes.json());
        setBlogs(await bRes.json());
        setFaqs(await fRes.json());
        setTestimonials(await tRes.json());
      }
    } catch (err) {
      console.error("Could not fetch database items", err);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (type: "success" | "info" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSelectService = (title: string) => {
    setPrefilledService(title);
    showToast("info", `Prefilled form with service: ${title}`);

    // Smooth scroll directly to the booking/order form section
    const orderSection = document.getElementById("order-portal");
    if (orderSection) {
      orderSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSuccessCallback = (type: "booking" | "order", details: any) => {
    if (type === "booking") {
      showToast("success", `Demo consultation booked for ${details.date} @ ${details.time}!`);
    } else {
      showToast("success", `Secure transaction processed! ID: #${details.id}`);
    }
    // Refresh admin log records silently
    fetchCatalogData();
  };

  return (
    <div className="min-h-screen relative font-sans overflow-hidden select-none bg-arcadia-black text-white">

      {/* Primary Video Background for entire application wrapper */}
      <div className="fixed inset-0 w-full h-full z-0 overflow-hidden select-none pointer-events-none">
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260422_112520_ee819691-f2e8-4c54-bb77-3fb72c84eaa5.mp4"
          autoPlay
          loop
          muted
          playsInline
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center transition-opacity duration-500 opacity-100"
        />
        {/* Dark overlay disabled per user request */}
      </div>

      {/* Background cyber grid overlay */}
      <div className="absolute inset-0 grid-overlay z-0 opacity-30 pointer-events-none" />

      {/* Global Toast Alert Overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full border shadow-2xl flex items-center gap-2.5 backdrop-blur-xl ${toast.type === "success"
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : toast.type === "error"
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-arcadia-blue/10 border-arcadia-blue/20 text-arcadia-cyan"
              }`}
          >
            <Sparkles className="w-4 h-4 animate-pulse shrink-0" />
            <span className="font-display text-xs font-bold tracking-wide">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Status indicator popup bar */}
      {!isOnline && (
        <div id="offline-toast-bar" className="fixed top-0 left-0 right-0 h-[28px] bg-red-600/90 backdrop-blur-lg flex items-center justify-center gap-2 z-50 text-[10px] font-mono tracking-widest text-white font-bold">
          <WifiOff className="w-3.5 h-3.5 animate-bounce" />
          <span>OFFLINE OPERATION MODE ENABLED • LOCAL CACHE ACTIVE</span>
        </div>
      )}



      {/* Global Sticky Navigation Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          // Auto-scroll to elements when navigating
          if (view !== "admin" && view !== "client") {
            const el = document.getElementById(view);
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }
        }}
        lang={lang}
        onToggleLang={() => setLang(lang === "en" ? "hi" : "en")}
        onOpenOrder={() => {
          const el = document.getElementById("order-portal");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogout={() => {
          localStorage.removeItem("arcadia_admin_token");
          setIsAdminLoggedIn(false);
          showToast("info", "Admin logout successful");
        }}
        isClientLoggedIn={isClientLoggedIn}
        onClientLogout={() => {
          localStorage.removeItem("arcadia_client_token");
          localStorage.removeItem("arcadia_client_email");
          localStorage.removeItem("arcadia_client_name");
          localStorage.removeItem("arcadia_client_avatar");
          setIsClientLoggedIn(false);
          showToast("info", "Logged out of Client Portal");
        }}
      />

      {/* Loading overlay for initial load */}
      {isLoading ? (
        <div className="fixed inset-0 bg-arcadia-black z-50 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-arcadia-blue border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center font-display font-black text-[10px] text-arcadia-cyan">A</div>
          </div>
          <span className="font-mono text-[9px] text-gray-500 tracking-widest uppercase">TUNING SYNAPSE LOOPS...</span>
        </div>
      ) : (
        /* CORE CONTENT WRAPPER */
        <main className="relative z-10">

          {currentView === "admin" ? (
            /* Elite Admin workspace view */
            <div className="pt-24 min-h-screen">
              {!isAdminLoggedIn ? (
                <LoginPortal
                  lang={lang}
                  initialTab="admin"
                  onShowToast={showToast}
                  onClientLoginSuccess={(name, email, token, avatar) => {
                    localStorage.setItem("arcadia_client_token", token);
                    localStorage.setItem("arcadia_client_email", email);
                    localStorage.setItem("arcadia_client_name", name);
                    localStorage.setItem("arcadia_client_avatar", avatar);
                    setIsClientLoggedIn(true);
                    setCurrentView("client");
                  }}
                  onAdminLoginSuccess={(token, email) => {
                    localStorage.setItem("arcadia_admin_token", token);
                    setIsAdminLoggedIn(true);
                  }}
                />
              ) : (
                <AdminDashboard
                  services={services}
                  projects={projects}
                  blogs={blogs}
                  faqs={faqs}
                  testimonials={testimonials}
                  onRefreshAllData={fetchCatalogData}
                  lang={lang}
                  setIsAdminLoggedIn={setIsAdminLoggedIn}
                  onShowToast={showToast}
                />
              )}
            </div>
          ) : currentView === "client" ? (
            /* Secure Client portal view */
            <div className="pt-24 min-h-screen">
              {!isClientLoggedIn ? (
                <LoginPortal
                  lang={lang}
                  initialTab="client"
                  onShowToast={showToast}
                  onClientLoginSuccess={(name, email, token, avatar) => {
                    localStorage.setItem("arcadia_client_token", token);
                    localStorage.setItem("arcadia_client_email", email);
                    localStorage.setItem("arcadia_client_name", name);
                    localStorage.setItem("arcadia_client_avatar", avatar);
                    setIsClientLoggedIn(true);
                  }}
                  onAdminLoginSuccess={(token, email) => {
                    localStorage.setItem("arcadia_admin_token", token);
                    setIsAdminLoggedIn(true);
                    setCurrentView("admin");
                  }}
                />
              ) : (
                <ClientDashboard
                  lang={lang}
                  onShowToast={showToast}
                  onNavigateHome={() => setCurrentView("home")}
                  onLoginSuccess={() => setIsClientLoggedIn(true)}
                  onLogoutSuccess={() => setIsClientLoggedIn(false)}
                />
              )}
            </div>
          ) : currentView === "portal" ? (
            /* Secure Consolidated Portal Login */
            <div className="pt-24 min-h-screen">
              {isAdminLoggedIn ? (
                <AdminDashboard
                  services={services}
                  projects={projects}
                  blogs={blogs}
                  faqs={faqs}
                  testimonials={testimonials}
                  onRefreshAllData={fetchCatalogData}
                  lang={lang}
                  setIsAdminLoggedIn={setIsAdminLoggedIn}
                  onShowToast={showToast}
                />
              ) : isClientLoggedIn ? (
                <ClientDashboard
                  lang={lang}
                  onShowToast={showToast}
                  onNavigateHome={() => setCurrentView("home")}
                  onLoginSuccess={() => setIsClientLoggedIn(true)}
                  onLogoutSuccess={() => setIsClientLoggedIn(false)}
                />
              ) : (
                <LoginPortal
                  lang={lang}
                  initialTab="client"
                  onShowToast={showToast}
                  onClientLoginSuccess={(name, email, token, avatar) => {
                    localStorage.setItem("arcadia_client_token", token);
                    localStorage.setItem("arcadia_client_email", email);
                    localStorage.setItem("arcadia_client_name", name);
                    localStorage.setItem("arcadia_client_avatar", avatar);
                    setIsClientLoggedIn(true);
                    setCurrentView("client");
                  }}
                  onAdminLoginSuccess={(token, email) => {
                    localStorage.setItem("arcadia_admin_token", token);
                    setIsAdminLoggedIn(true);
                    setCurrentView("admin");
                  }}
                />
              )}
            </div>
          ) : (
            /* Primary landing page flow */
            <>
              {/* Cinematic Fullscreen Hero */}
              <Hero
                onStartProject={() => handleSelectService("Business Website")}
                onBookDemo={() => {
                  const el = document.getElementById("demo-booking");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                onNavigateToServices={() => {
                  const el = document.getElementById("services");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                lang={lang}
              />              {/* Trust Badge / Companies Logo Section */}
              <section className="py-12 bg-[#050505]/40 backdrop-blur-md border-b border-white/5 relative z-10">
                <div className="container mx-auto px-6 max-w-7xl text-center">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-gray-500 mb-2">
                    Empowering Next-Gen Ventures & Enterprise Systems
                  </p>
                  <StackedLogos
                    logos={[
                      { src: "/logo1.svg", alt: "ZENIX CORP" },
                      { src: "/logo2.svg", alt: "AURA DESIGN" },
                      { src: "/logo3.svg", alt: "NEXUS SAAS" },
                      { src: "/logo4.svg", alt: "SOLARIS" },
                      { src: "/logo5.svg", alt: "OCTA SEC" },
                    ]}
                  />
                </div>
              </section>

              {/* Dynamic Service Catalog */}
              <Suspense fallback={
                <section className="py-24 bg-[#050505]/40 backdrop-blur-md border-b border-white/5 flex flex-col items-center justify-center gap-4 min-h-[400px]">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-arcadia-blue border-t-transparent rounded-full animate-spin" />
                  </div>
                  <span className="font-mono text-[9px] text-gray-500 tracking-widest uppercase">LOADING SOLUTIONS CATALOG...</span>
                </section>
              }>
                <Services
                  services={services}
                  onSelectService={handleSelectService}
                  lang={lang}
                />
              </Suspense>

              {/* Case-study Portfolio */}
              <Suspense fallback={
                <section className="py-24 bg-[#050505]/40 backdrop-blur-md border-b border-white/5 flex flex-col items-center justify-center gap-4 min-h-[400px]">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-arcadia-cyan border-t-transparent rounded-full animate-spin" />
                  </div>
                  <span className="font-mono text-[9px] text-gray-500 tracking-widest uppercase">LOADING CASE-STUDIES PORTFOLIO...</span>
                </section>
              }>
                <Portfolio
                  projects={projects}
                  lang={lang}
                />
              </Suspense>

              {/* Pricing Cards */}
              <Pricing
                onSelectPlan={handleSelectService}
                lang={lang}
              />

              {/* Core Forms Area (consultation booking & multi-step order wizard) */}
              <section className="py-24 border-b border-white/5 bg-[#050505]/40 backdrop-blur-md relative z-10">
                <div className="container mx-auto">
                  <div className="text-center max-w-2xl mx-auto mb-16 px-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arcadia-blue/10 border border-arcadia-blue/20 mb-4">
                      <Compass className="w-3.5 h-3.5 text-arcadia-cyan" />
                      <span className="font-display text-[10px] uppercase tracking-widest text-arcadia-cyan font-semibold">
                        TRANSMISSION HUB
                      </span>
                    </div>
                    <h2 className="font-display font-black text-3xl md:text-4xl text-white">
                      <FlipText>{lang === "en" ? "Initiate Co-Development" : "सह-विकास शुरू करें"}</FlipText>
                    </h2>
                  </div>
                  <ContactForms
                    prefilledService={prefilledService}
                    lang={lang}
                    onSuccess={handleSuccessCallback}
                    isClientLoggedIn={isClientLoggedIn}
                    clientEmail={localStorage.getItem("arcadia_client_email") || ""}
                    clientName={localStorage.getItem("arcadia_client_name") || ""}
                    onNavigateToLogin={() => setCurrentView("client")}
                    onClientLogin={() => setIsClientLoggedIn(true)}
                  />
                </div>
              </section>

              {/* Knowledge Base FAQs, Blogs, Careers application, and customized Dark Map */}
              <MiscSection
                blogs={blogs}
                faqs={faqs}
                lang={lang}
              />
            </>
          )}

        </main>
      )}

      {/* Floating Interactive Gemini Chatbot widget */}
      <Chatbot />

      {/* Invisible/Hidden Developer click toggle in absolute bottom-right corner */}
      <div
        onClick={() => setShowDevOverlay(prev => !prev)}
        className="fixed bottom-0 right-0 w-2 h-2 bg-purple-500/5 cursor-pointer z-50 hover:bg-purple-500/40 transition"
        title="Diagnostic Toggle (Ctrl+D)"
      />

      {/* Developer Diagnostic Overlay */}
      <AnimatePresence>
        {showDevOverlay && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-80 bg-black/95 border border-purple-500/30 rounded-2xl shadow-[0_10px_40px_rgba(168,85,247,0.25)] p-5 font-mono text-[10px] text-gray-300 backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-2 mb-3">
              <div className="flex items-center gap-1.5 text-purple-400 font-extrabold tracking-wider">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                <span>ARCADIA_CORE_DIAGNOSTICS</span>
              </div>
              <button
                onClick={() => setShowDevOverlay(false)}
                className="text-gray-500 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Network Connectivity */}
              <div>
                <div className="text-gray-500 uppercase text-[8px] font-bold mb-1">Network Transmission</div>
                <div className="flex items-center justify-between bg-white/[0.02] p-2 rounded-lg border border-white/5">
                  <span className="text-gray-400">Connection Status:</span>
                  <span className={`font-bold uppercase ${isOnline ? "text-green-400" : "text-red-400"}`}>
                    {isOnline ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/[0.02] p-2 rounded-lg border border-white/5 mt-1">
                  <span className="text-gray-400">Effective Bitrate:</span>
                  <span className="text-purple-300 font-bold">{networkType}</span>
                </div>
              </div>

              {/* API Latency */}
              <div>
                <div className="text-gray-500 uppercase text-[8px] font-bold mb-1">API Round-Trip Latency</div>
                <div className="flex items-center justify-between bg-white/[0.02] p-2 rounded-lg border border-white/5">
                  <span className="text-gray-400">Response Speed:</span>
                  <span className={`font-extrabold ${apiLatency !== null && apiLatency < 100 ? "text-green-400" : apiLatency !== null && apiLatency < 250 ? "text-yellow-400" : "text-red-400"}`}>
                    {apiLatency !== null ? `${apiLatency}ms` : "PENDING OR OFFLINE"}
                  </span>
                </div>

                {/* Graph visualization */}
                {latencyHistory.length > 0 && (
                  <div className="mt-1.5 p-2 bg-white/[0.01] rounded-lg border border-white/5 flex items-end gap-1 h-10 justify-center">
                    {latencyHistory.map((lat, idx) => {
                      const maxLat = Math.max(...latencyHistory, 100);
                      const heightPercent = Math.min(100, Math.max(15, (lat / maxLat) * 100));
                      return (
                        <div
                          key={idx}
                          style={{ height: `${heightPercent}%` }}
                          className={`w-4 rounded-t transition-all ${lat < 100 ? "bg-green-500" : lat < 250 ? "bg-yellow-500" : "bg-red-500"}`}
                          title={`${lat}ms`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Environment Status */}
              <div>
                <div className="text-gray-500 uppercase text-[8px] font-bold mb-1">Host Registry Specs</div>
                <div className="space-y-1 bg-white/[0.02] p-2 rounded-lg border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Container Target:</span>
                    <span className="text-white font-bold">Cloud Run Sandbox</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Ingress Port:</span>
                    <span className="text-purple-300 font-mono font-bold">3000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Secure SSL Pipeline:</span>
                    <span className="text-white">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">JSON Database Status:</span>
                    <span className="text-green-400 font-bold">Online</span>
                  </div>
                </div>
              </div>

              <div className="text-[8px] text-purple-400/50 text-center border-t border-white/5 pt-2">
                KEYBOARD SHORTCUT: <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold font-mono">Ctrl + D</kbd>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Premium Footing Layout */}
      <footer className="bg-[#050505]/40 backdrop-blur-md border-t border-white/5 pt-20 pb-10 relative z-30 font-sans">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

            <div className="space-y-4">
              <span className="font-display font-extrabold text-lg text-white">ARCADIA<span className="text-arcadia-blue">.</span></span>
              <p className="text-xs text-gray-500 leading-relaxed">
                Award-winning Indian digital engineering legacy group building futuristic websites, custom CRM SaaS portals, and state-of-the-art server-side Gemini conversational voice-bots.
              </p>
            </div>

            <div>
              <h5 className="font-display text-xs font-bold text-white uppercase tracking-widest mb-4">Core Ecosystem</h5>
              <ul className="space-y-2 text-xs text-gray-500 font-medium">
                <li><a href="#services" className="hover:text-white transition">Full-Stack Platforms</a></li>
                <li><a href="#services" className="hover:text-white transition">Generative AI Bots</a></li>
                <li><a href="#services" className="hover:text-white transition">Corporate Branding</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-display text-xs font-bold text-white uppercase tracking-widest mb-4">Node Directory</h5>
              <ul className="space-y-2 text-xs text-gray-500 font-medium">
                <li><a href="#portfolio" className="hover:text-white transition">Client Showcase</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Investment Plans</a></li>
                <li><a href="#careers" className="hover:text-white transition">Join the Odyssey</a></li>
                <li><a href="#faq" className="hover:text-white transition">System FAQ Desk</a></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h5 className="font-display text-xs font-bold text-white uppercase tracking-widest">Connect Transmission</h5>
              <div className="flex gap-4">
                <a href="https://www.instagram.com/arcadiadevelopers?igsh=d2s0Y2l5ZzkzN3M=" target="_blank" rel="noreferrer" className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition" title="Instagram"><Instagram className="w-4 h-4" /></a>
                <a href="https://wa.me/918328218878" target="_blank" rel="noreferrer" className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition" title="WhatsApp"><MessageCircle className="w-4 h-4" /></a>
                <a href="https://linkedin.com/company/arcadia-agency" target="_blank" rel="noreferrer" className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition" title="LinkedIn"><Linkedin className="w-4 h-4" /></a>
              </div>
              <p className="text-[10px] text-gray-600 font-mono">ENCRYPTED PROTOCOL SHA-256</p>
            </div>

          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono text-gray-600">
            <span>© 2026 ARCADIA STUDIO AGENCY PRIVATE LIMITED. ALL RIGHTS SECURED.</span>
            <div className="flex gap-6">
              <span className="hover:text-white transition cursor-pointer">Sitemap</span>
              <span className="hover:text-white transition cursor-pointer">Privacy System</span>
              <span className="hover:text-white transition cursor-pointer">Terms of Development</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
