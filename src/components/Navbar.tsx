import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Globe, MessageSquare, LogOut, Lock, Compass, User } from "lucide-react";
import AnimatedButton from "./ui/animated-button";
import { SpotlightNavbar } from "./ui/spotlight-navbar";

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  lang: "en" | "hi";
  onToggleLang: () => void;
  onOpenOrder: () => void;
  isAdminLoggedIn: boolean;
  onLogout: () => void;
  isClientLoggedIn: boolean;
  onClientLogout: () => void;
}

export default function Navbar({
  currentView,
  onNavigate,
  lang,
  onToggleLang,
  onOpenOrder,
  isAdminLoggedIn,
  onLogout,
  isClientLoggedIn,
  onClientLogout
}: NavbarProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      // Calculate scroll progress percentage
      if (totalScrollHeight > 0) {
        setScrollProgress((currentScrollY / totalScrollHeight) * 100);
      }

      // Hide/Show navbar based on scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsNavVisible(false); // Scrolling down, hide
      } else {
        setIsNavVisible(true); // Scrolling up, show
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const navItems = [
    { id: "home", labelEn: "Home", labelHi: "मुख्य" },
    { id: "services", labelEn: "Services", labelHi: "सेवाएं" },
    { id: "portfolio", labelEn: "Portfolio", labelHi: "पोर्टफोलियो" },
    { id: "pricing", labelEn: "Pricing", labelHi: "मूल्य" },
    { id: "blog", labelEn: "Insights", labelHi: "ब्लॉग" },
    { id: "faq", labelEn: "FAQs", labelHi: "अक्सर पूछे जाने वाले सवाल" },
    { id: "careers", labelEn: "Careers", labelHi: "करियर" }
  ];

  const translations = {
    startProject: { en: "Start Your Project", hi: "परियोजना शुरू करें" },
    admin: { en: "Console", hi: "कंसोल" },
    logout: { en: "Logout", hi: "लॉगआउट" }
  };

  const handleItemClick = (id: string) => {
    onNavigate(id);
    setIsMobileMenuOpen(false);
    
    // Smooth scroll to element if it's home/anchors and we are on home view
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* Scroll Progress Bar */}
      <div 
        id="scroll-progress-bar"
        className="fixed top-0 left-0 h-[2px] bg-gradient-to-r from-arcadia-blue via-arcadia-cyan to-purple-500 z-50 transition-all duration-75"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Floating Header */}
      <motion.header
        id="site-header"
        initial={{ y: 0 }}
        animate={{ y: isNavVisible ? 0 : -100 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-7xl z-40 rounded-full transition-all duration-300 ${
          lastScrollY > 20 
            ? "bg-arcadia-black/75 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]" 
            : "bg-transparent border border-transparent"
        }`}
      >
        <div className="px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div 
            id="nav-logo"
            onClick={() => handleItemClick("home")} 
            className="flex items-center gap-2 cursor-pointer group"
          >
            <span className="font-display font-bold text-lg tracking-wider text-white">
              ARCADIA<span className="text-arcadia-blue">.</span>
            </span>
          </div>

          {/* Desktop Nav Items */}
          <div id="desktop-navigation" className="hidden lg:block">
            <SpotlightNavbar
              items={navItems.map((item) => ({
                label: lang === "en" ? item.labelEn : item.labelHi,
                href: `#${item.id}`,
                onClick: () => handleItemClick(item.id),
                isActive: currentView === item.id
              }))}
            />
          </div>

          {/* Controls & Actions */}
          <div id="nav-controls" className="hidden lg:flex items-center gap-4">
            {/* Multi-language Selector */}
            <AnimatedButton
              id="lang-selector-btn"
              onClick={onToggleLang}
              className="p-2 rounded-full border border-white/5 bg-white/5 text-gray-300 hover:text-white hover:border-white/20 transition duration-300 flex items-center gap-1.5 text-xs font-mono cursor-pointer"
            >
              <Globe className="w-4 h-4 text-arcadia-blue" />
              <span>{lang === "en" ? "EN" : "HI"}</span>
            </AnimatedButton>

            {/* Separate WhatsApp Connection */}
            <a
              id="nav-whatsapp-link"
              href="https://wa.me/918328218878?text=Hi%20ARCADIA%2C%20I'd%20like%20to%20inquire%20about%20building%20a%20modern%20website%2Fsolutions%20for%20my%20brand."
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full border border-[#25D366]/20 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition duration-300 flex items-center justify-center relative group"
              title="Connect on WhatsApp"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#25D366] rounded-full animate-ping" />
            </a>

            {/* Unified Portal Action Button */}
            {isClientLoggedIn || isAdminLoggedIn ? (
              <div className="flex items-center gap-1.5" id="desktop-portal-logged">
                <AnimatedButton
                  id="desktop-portal-btn"
                  type="button"
                  onClick={() => onNavigate(isAdminLoggedIn ? "admin" : "client")}
                  className="px-4 py-2 rounded-full bg-[#050505]/40 backdrop-blur-md border border-white/10 hover:border-white/20 text-xs font-mono text-arcadia-cyan hover:text-white transition duration-300 flex items-center gap-2 cursor-pointer relative"
                  title={isAdminLoggedIn ? "Admin Console" : "Secure Client Hub"}
                >
                  {isAdminLoggedIn ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-green-400 animate-pulse" />
                      <span>ADMIN CONSOLE</span>
                    </>
                  ) : (
                    <>
                      <Compass className="w-3.5 h-3.5 text-arcadia-cyan animate-pulse" />
                      <span>CLIENT DASHBOARD</span>
                    </>
                  )}
                  <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-green-500 rounded-full" />
                </AnimatedButton>
                <AnimatedButton
                  id="portal-logout-btn"
                  onClick={isAdminLoggedIn ? onLogout : onClientLogout}
                  className="p-1.5 rounded-full border border-red-500/10 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition cursor-pointer"
                  title="Sign Out Portal Session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </AnimatedButton>
              </div>
            ) : (
              <AnimatedButton
                id="desktop-portal-login-btn"
                onClick={() => onNavigate("portal")}
                className="p-2 rounded-full border border-white/5 bg-white/5 text-gray-400 hover:text-white hover:border-white/20 transition duration-300 cursor-pointer"
                title="Secure Portal Login"
              >
                <User className="w-4 h-4 text-arcadia-cyan" />
              </AnimatedButton>
            )}

            {/* Action CTA */}
            <AnimatedButton
              id="nav-cta-btn"
              onClick={onOpenOrder}
              className="relative group overflow-hidden px-5 py-2.5 rounded-full bg-arcadia-blue text-white font-display text-xs font-semibold tracking-wider hover:shadow-[0_0_20px_rgba(47,128,255,0.4)] transition duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-arcadia-blue via-arcadia-cyan to-blue-600 opacity-0 group-hover:opacity-100 transition duration-500" />
              <span className="relative z-10">{translations.startProject[lang]}</span>
            </AnimatedButton>
          </div>

          {/* Mobile Hamburguer Menu */}
          <div className="flex lg:hidden items-center gap-3">
            <AnimatedButton
              id="mobile-lang-btn"
              onClick={onToggleLang}
              className="p-2 rounded-full text-xs font-mono border bg-white/5 border-white/10 text-gray-300 transition"
            >
              {lang === "en" ? "EN" : "HI"}
            </AnimatedButton>

            {/* Mobile WhatsApp connection */}
            <a
              id="mobile-whatsapp-btn"
              href="https://wa.me/918328218878?text=Hi%20ARCADIA%2C%20I'd%20like%20to%20inquire%20about%20building%20a%20modern%20website%2Fsolutions%20for%20my%20brand."
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full border border-[#25D366]/20 bg-[#25D366]/10 text-[#25D366] flex items-center justify-center relative animate-none"
              title="Connect on WhatsApp"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#25D366] rounded-full animate-ping" />
            </a>
            
            <AnimatedButton
              id="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 transition"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </AnimatedButton>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-navigation-menu"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-24 backdrop-blur-2xl p-6 rounded-3xl z-40 flex flex-col gap-4 shadow-2xl lg:hidden border bg-arcadia-black/95 border-white/10"
          >
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isItemActive = currentView === item.id;
                return (
                  <AnimatedButton
                    key={item.id}
                    id={`mobile-nav-link-${item.id}`}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl font-display text-sm font-medium transition ${
                      isItemActive 
                        ? "bg-arcadia-blue/10 text-white border-l-2 border-arcadia-blue font-bold" 
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {lang === "en" ? item.labelEn : item.labelHi}
                  </AnimatedButton>
                );
              })}
            </div>

            <div className="h-[1px] my-1 bg-white/10" />

            <div className="flex flex-col gap-3">
              <div className="w-full">
                {isClientLoggedIn || isAdminLoggedIn ? (
                  <div className="flex gap-2 w-full">
                    <AnimatedButton
                      id="mobile-portal-btn"
                      onClick={() => {
                        onNavigate(isAdminLoggedIn ? "admin" : "client");
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex-grow flex items-center justify-center gap-1.5 text-xs font-mono text-gray-300 hover:text-white px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10"
                    >
                      {isAdminLoggedIn ? (
                        <Lock className="w-4 h-4 text-green-400 shrink-0 animate-pulse" />
                      ) : (
                        <Compass className="w-4 h-4 text-arcadia-cyan shrink-0 animate-pulse" />
                      )}
                      <span>{isAdminLoggedIn ? "Admin Panel" : "Client Hub"}</span>
                    </AnimatedButton>
                    <AnimatedButton
                      id="mobile-portal-logout-btn"
                      onClick={() => {
                        if (isAdminLoggedIn) onLogout();
                        else onClientLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="p-2.5 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 flex items-center justify-center cursor-pointer"
                      title="Sign Out Session"
                    >
                      <LogOut className="w-4 h-4" />
                    </AnimatedButton>
                  </div>
                ) : (
                  <AnimatedButton
                    id="mobile-portal-login-btn"
                    onClick={() => {
                      onNavigate("portal");
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-mono text-gray-300 hover:text-white px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-arcadia-cyan shrink-0" />
                    <span>Secure Portal Login</span>
                  </AnimatedButton>
                )}
              </div>

              <AnimatedButton
                id="mobile-nav-cta"
                onClick={() => {
                  onOpenOrder();
                  setIsMobileMenuOpen(false);
                }}
                className="px-5 py-3 rounded-full bg-arcadia-blue text-white text-xs font-semibold tracking-wide w-full text-center"
              >
                {translations.startProject[lang]}
              </AnimatedButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
