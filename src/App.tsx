import React, { useState, useEffect, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { motion, AnimatePresence } from "motion/react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import { StackedLogos } from "./components/ui/stacked-logos";
import { LogoSlider } from "./components/ui/logo-slider";
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
import { Service, Project, BlogPost, FAQ, Testimonial, SEOSettings } from "./types";
import { db, auth } from "./firebase/config";
import { onSnapshot, doc, collection } from "firebase/firestore";
import { onIdTokenChanged, signOut } from "firebase/auth";
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
import { useAuth } from "./context/AuthContext";

function AppContent() {
  const {
    isAdminLoggedIn,
    isClientLoggedIn,
    logout,
    setClientSession,
    setAdminSession,
    setOnRedirectRequest
  } = useAuth();

  // Navigation & State Engine
  const [currentView, setCurrentView] = useState(() => {
    const adminToken = sessionStorage.getItem("arcadia_admin_token") || localStorage.getItem("arcadia_admin_token");
    const clientToken = sessionStorage.getItem("arcadia_client_token") || localStorage.getItem("arcadia_client_token");
    const savedView = sessionStorage.getItem("arcadia_current_view") || localStorage.getItem("arcadia_current_view");
    if (savedView) return savedView;
    if (adminToken) return "admin";
    if (clientToken) return "client";
    return "home";
  });
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [prefilledService, setPrefilledService] = useState("");

  const setIsAdminLoggedIn = (val: boolean) => {
    if (!val) {
      logout();
    }
  };

  const setIsClientLoggedIn = (val: boolean) => {
    if (!val) {
      logout();
    }
  };

  // Register redirect request callback with AuthContext
  useEffect(() => {
    setOnRedirectRequest((view) => {
      setCurrentView(view);
    });
  }, [setOnRedirectRequest]);

  // Keep track of and persist currentView across refreshes
  useEffect(() => {
    if (currentView) {
      sessionStorage.setItem("arcadia_current_view", currentView);
      localStorage.setItem("arcadia_current_view", currentView);
    }
  }, [currentView]);

  // Check if we are on a view that is currently showing the LoginPortal
  const isShowingLoginPortal = 
    (currentView === "admin" && !isAdminLoggedIn) ||
    (currentView === "client" && !isClientLoggedIn) ||
    (currentView === "portal" && !isAdminLoggedIn && !isClientLoggedIn);

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
  const [homepageSettings, setHomepageSettings] = useState<any>(null);
  const [seoConfigs, setSeoConfigs] = useState<SEOSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Live Clock & Offline System
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState("");

  // Notification Toast state
  const [toast, setToast] = useState<{ type: "success" | "info" | "error"; msg: string } | null>(null);

  // Dynamically fetch and override document head SEO elements on currentView or config change
  useEffect(() => {
    if (seoConfigs.length === 0) return;

    // Find custom SEO config that matches currentView, or fallback to default site-wide "*" / "default" / "home"
    const matchedConfig = 
      seoConfigs.find((c) => c.route === currentView && c.status === "Published") ||
      seoConfigs.find((c) => (c.route === "*" || c.route === "default") && c.status === "Published") ||
      seoConfigs.find((c) => c.route === "home" && c.status === "Published");

    if (matchedConfig) {
      // 1. Update Document Title
      if (matchedConfig.title) {
        document.title = matchedConfig.title;
      }

      // 2. Helper to set/create meta tags
      const setMetaTag = (attrName: string, attrValue: string, content: string) => {
        if (!content) return;
        let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
        if (!element) {
          element = document.createElement("meta");
          element.setAttribute(attrName, attrValue);
          document.head.appendChild(element);
        }
        element.setAttribute("content", content);
      };

      // Description
      if (matchedConfig.description) {
        setMetaTag("name", "description", matchedConfig.description);
        setMetaTag("property", "og:description", matchedConfig.description);
        setMetaTag("name", "twitter:description", matchedConfig.description);
      }

      // Keywords
      if (Array.isArray(matchedConfig.keywords) && matchedConfig.keywords.length > 0) {
        setMetaTag("name", "keywords", matchedConfig.keywords.join(", "));
      }

      // OpenGraph & Twitter Title overrides
      if (matchedConfig.title) {
        setMetaTag("property", "og:title", matchedConfig.title);
        setMetaTag("name", "twitter:title", matchedConfig.title);
      }

      // OpenGraph Image
      if (matchedConfig.ogImage) {
        setMetaTag("property", "og:image", matchedConfig.ogImage);
        setMetaTag("name", "twitter:image", matchedConfig.ogImage);
      }
    }
  }, [currentView, seoConfigs]);

  useEffect(() => {
    // 1. Initial Data Load
    fetchCatalogData();

    // 1.5 Real-Time Firestore Synchronization Listeners
    const unsubscribes: (() => void)[] = [
      onSnapshot(collection(db, "seoSettings"), (snapshot) => {
        const list: SEOSettings[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as SEOSettings);
        });
        setSeoConfigs(list);
      }, (error) => {
        console.warn("Real-time listener for seoSettings failed:", error);
      }),

      onSnapshot(doc(db, "arcadia_system_db", "services.json"), (snapshot) => {
        const data = snapshot.data();
        if (data && Array.isArray(data.data)) {
          setServices(data.data);
        }
      }, (error) => {
        console.warn("Real-time listener for services failed, relying on REST cache:", error);
      }),

      onSnapshot(doc(db, "arcadia_system_db", "projects.json"), (snapshot) => {
        const data = snapshot.data();
        if (data && Array.isArray(data.data)) {
          setProjects(data.data);
        }
      }, (error) => {
        console.warn("Real-time listener for projects failed, relying on REST cache:", error);
      }),

      onSnapshot(doc(db, "arcadia_system_db", "blogs.json"), (snapshot) => {
        const data = snapshot.data();
        if (data && Array.isArray(data.data)) {
          setBlogs(data.data);
        }
      }, (error) => {
        console.warn("Real-time listener for blogs failed, relying on REST cache:", error);
      }),

      onSnapshot(doc(db, "arcadia_system_db", "faqs.json"), (snapshot) => {
        const data = snapshot.data();
        if (data && Array.isArray(data.data)) {
          setFaqs(data.data);
        }
      }, (error) => {
        console.warn("Real-time listener for FAQs failed, relying on REST cache:", error);
      }),

      onSnapshot(doc(db, "arcadia_system_db", "testimonials.json"), (snapshot) => {
        const data = snapshot.data();
        if (data && Array.isArray(data.data)) {
          setTestimonials(data.data);
        }
      }, (error) => {
        console.warn("Real-time listener for testimonials failed, relying on REST cache:", error);
      }),

      onSnapshot(doc(db, "arcadia_system_db", "homepage_settings.json"), (snapshot) => {
        const data = snapshot.data();
        if (data && data.data) {
          setHomepageSettings(data.data);
        } else if (data) {
          setHomepageSettings(data);
        }
      }, (error) => {
        console.warn("Real-time listener for homepage settings failed, relying on REST cache:", error);
      })
    ];

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

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
      unsubscribes.forEach((unsub) => unsub());
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

  // Authentication and Session redirects are now centrally handled via AuthContext.
  // The redirect callback triggers the setCurrentView appropriately without requiring page reloads.

  const fetchCatalogData = async () => {
    setIsLoading(true);
    try {
      const [sRes, pRes, bRes, fRes, tRes, hRes] = await Promise.all([
        fetch("/api/services"),
        fetch("/api/projects"),
        fetch("/api/blogs"),
        fetch("/api/faqs"),
        fetch("/api/testimonials"),
        fetch("/api/homepage-settings")
      ]);

      if (sRes.ok && pRes.ok && bRes.ok && fRes.ok && tRes.ok) {
        setServices(await sRes.json());
        setProjects(await pRes.json());
        setBlogs(await bRes.json());
        setFaqs(await fRes.json());
        setTestimonials(await tRes.json());
      }
      if (hRes && hRes.ok) {
        setHomepageSettings(await hRes.json());
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
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full border shadow-2xl flex items-center gap-2.5 backdrop-blur-xl ${
              toast.type === "success" 
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
      {!isShowingLoginPortal && (
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
          onLogout={async () => {
            await logout();
            setCurrentView("home");
            showToast("info", "Admin logout successful");
          }}
          isClientLoggedIn={isClientLoggedIn}
          onClientLogout={async () => {
            await logout();
            setCurrentView("home");
            showToast("info", "Logged out of Client Portal");
          }}
        />
      )}

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
          <AnimatePresence mode="wait">
            {currentView === "admin" ? (
              /* Elite Admin workspace view */
              <motion.div
                key="admin-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="pt-24 min-h-screen"
              >
                {!isAdminLoggedIn ? (
                  <LoginPortal
                    lang={lang}
                    initialTab="admin"
                    onShowToast={showToast}
                    onClose={() => setCurrentView("home")}
                    onClientLoginSuccess={(name, email, token, avatar) => {
                      setClientSession(name, email, token, avatar);
                    }}
                    onAdminLoginSuccess={(token, email, role) => {
                      setAdminSession(token, email, role);
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
              </motion.div>
            ) : currentView === "client" ? (
              /* Secure Client portal view */
              <motion.div
                key="client-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="pt-24 min-h-screen"
              >
                {!isClientLoggedIn ? (
                  <LoginPortal
                    lang={lang}
                    initialTab="client"
                    onShowToast={showToast}
                    onClose={() => setCurrentView("home")}
                    onClientLoginSuccess={(name, email, token, avatar) => {
                      setClientSession(name, email, token, avatar);
                    }}
                    onAdminLoginSuccess={(token, email, role) => {
                      setAdminSession(token, email, role);
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
              </motion.div>
            ) : currentView === "portal" ? (
              /* Secure Consolidated Portal Login */
              <motion.div
                key="portal-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="pt-24 min-h-screen"
              >
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
                    onClose={() => setCurrentView("home")}
                    onClientLoginSuccess={(name, email, token, avatar) => {
                      setClientSession(name, email, token, avatar);
                    }}
                    onAdminLoginSuccess={(token, email, role) => {
                      setAdminSession(token, email, role);
                    }}
                  />
                )}
              </motion.div>
            ) : (
              /* Primary landing page flow */
              <motion.div
                key="main-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
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
                <LogoSlider
                  trustedByTitle="Accredited Tech Integration Partners"
                  trustedBySubtitle="Empowering elite enterprise squads, high-growth modern ventures, and decentralized networks worldwide"
                  showStats={true}
                  logos={[
                    { src: "/logo1.svg", alt: "ZENIX CORP" },
                    { src: "/logo2.svg", alt: "AURA DESIGN" },
                    { src: "/logo3.svg", alt: "NEXUS SAAS" },
                    { src: "/logo4.svg", alt: "SOLARIS" },
                    { src: "/logo5.svg", alt: "OCTA SEC" },
                    { src: "/logo1.svg", alt: "KRONOS AI" },
                    { src: "/logo2.svg", alt: "AEON CLOUD" },
                    { src: "/logo3.svg", alt: "LUMEN LABS" },
                  ]}
                />

                {/* Dynamic Service Catalog */}
                <Suspense fallback={
                  <section className="py-24 bg-[#050505]/40 backdrop-blur-md border-b border-white/5 relative overflow-hidden min-h-[500px]">
                    {/* Matching Section Header skeleton */}
                    <div className="container mx-auto px-6 relative z-10 w-full max-w-7xl text-center">
                      <div className="max-w-2xl mx-auto mb-16 flex flex-col items-center">
                        {/* Category mini-badge skeleton */}
                        <div className="w-24 h-5 rounded-full bg-white/5 animate-pulse mb-4 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                        </div>
                        {/* Title skeleton */}
                        <div className="w-64 h-10 rounded-xl bg-white/5 animate-pulse mb-4 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                        </div>
                        {/* Subtitle skeleton */}
                        <div className="w-80 h-4 rounded-lg bg-white/5 animate-pulse relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                        </div>
                      </div>

                      {/* Filter and Search Bar row skeleton */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-white/5 pb-8">
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="w-28 h-8 rounded-full bg-white/5 animate-pulse relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                            </div>
                          ))}
                        </div>
                        <div className="w-full md:max-w-xs h-10 rounded-full bg-white/5 animate-pulse relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                        </div>
                      </div>

                      {/* Horizontal Centered Grid of beautiful cards that match the perspective carousel height and card width! */}
                      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 max-w-[1000px] mx-auto py-2">
                        {[1, 2, 3].map((idx) => (
                          <div 
                            key={idx}
                            className={`relative rounded-3xl overflow-hidden border border-white/5 bg-arcadia-dark/95 shadow-2xl w-[260px] h-[300px] sm:h-[360px] flex flex-col justify-between p-6 text-left group animate-pulse ${
                              idx === 3 ? "hidden md:flex" : "flex"
                            }`}
                          >
                            {/* Inner shimmer background element */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
                            
                            {/* Top part / Image placeholder */}
                            <div className="space-y-3">
                              {/* Dummy icon placeholder */}
                              <div className="w-10 h-10 rounded-2xl bg-white/5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                              </div>
                              
                              {/* Badge placeholder */}
                              <div className="w-20 h-4 rounded bg-white/5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                              </div>

                              {/* Title placeholder */}
                              <div className="space-y-1.5 pt-2">
                                <div className="w-3/4 h-4 rounded bg-white/5 relative overflow-hidden">
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                </div>
                                <div className="w-1/2 h-4 rounded bg-white/5 relative overflow-hidden">
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                </div>
                              </div>
                            </div>

                            {/* Bottom part / Description & Price row */}
                            <div className="space-y-3 pt-4 border-t border-white/5">
                              {/* Description lines */}
                              <div className="space-y-1.5">
                                <div className="w-full h-2 rounded bg-white/5 relative overflow-hidden">
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                </div>
                                <div className="w-5/6 h-2 rounded bg-white/5 relative overflow-hidden">
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                </div>
                              </div>

                              {/* Footer Price & Button row */}
                              <div className="flex items-center justify-between pt-2">
                                <div className="space-y-1">
                                  <div className="w-10 h-2 rounded bg-white/5 relative overflow-hidden" />
                                  <div className="w-14 h-3 rounded bg-white/5 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                  </div>
                                </div>
                                <div className="w-16 h-7 rounded-full bg-white/5 relative overflow-hidden">
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
                      clientEmail={sessionStorage.getItem("arcadia_client_email") || localStorage.getItem("arcadia_client_email") || ""}
                      clientName={sessionStorage.getItem("arcadia_client_name") || localStorage.getItem("arcadia_client_name") || ""}
                      onNavigateToLogin={() => setCurrentView("client")}
                    />
                  </div>
                </section>

                {/* Knowledge Base FAQs, Blogs, Careers application, and customized Dark Map */}
                <MiscSection
                  blogs={blogs}
                  faqs={faqs}
                  lang={lang}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      )}

      {/* Floating Interactive Gemini Chatbot widget */}
      {!isShowingLoginPortal && <Chatbot />}

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
      {!isShowingLoginPortal && (
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
      )}

    </div>
  );
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-lg p-8 rounded-3xl bg-[#0b0d13] border border-red-500/20 shadow-2xl relative z-10 space-y-6">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[10px] font-bold uppercase tracking-wider">
            <span>● Error Boundary Active</span>
          </div>
          <h2 className="font-display font-black text-2xl tracking-tight text-white uppercase mt-2">
            System Collision Intercepted
          </h2>
          <p className="text-gray-400 text-xs leading-relaxed">
            An unexpected runtime collision occurred within this view module. The Arcadia engine has safely isolated the crash to preserve system integrity.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 font-mono text-xs">
            <span className="block text-red-400 font-bold uppercase text-[10px] tracking-wider">Exception Vector:</span>
            <div className="text-gray-300 overflow-x-auto max-h-40 whitespace-pre-wrap select-all">
              {error.message || String(error)}
            </div>
            {error.stack && (
              <details className="mt-2 text-[10px] text-gray-500 cursor-pointer">
                <summary className="hover:text-gray-400 transition select-none">Show full diagnostic traceback</summary>
                <pre className="mt-2 p-2 rounded bg-[#050505] text-gray-400 overflow-x-auto max-h-32 text-[10px]">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-300 font-display text-xs font-bold hover:bg-white/5 transition cursor-pointer text-center"
          >
            Reload Module
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem("arcadia_current_view");
              localStorage.removeItem("arcadia_current_view");
              resetErrorBoundary();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-arcadia-blue hover:bg-arcadia-cyan text-white font-display text-xs font-bold transition cursor-pointer text-center shadow-lg shadow-arcadia-blue/20"
          >
            Reset System State
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AppContent />
    </ErrorBoundary>
  );
}
