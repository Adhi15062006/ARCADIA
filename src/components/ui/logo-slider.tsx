import React, { useState, useEffect, useRef } from "react";
import { motion, useInView } from "motion/react";
import { Star, ShieldCheck, Users, Briefcase } from "lucide-react";

interface LogoItem {
  src: string;
  alt: string;
}

interface LogoSliderProps {
  logos?: LogoItem[];
  trustedByTitle?: string;
  trustedBySubtitle?: string;
  showStats?: boolean;
}

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  decimals?: number;
}

function getCompanyLogoSvg(alt: string) {
  const normalized = alt.toUpperCase();
  if (normalized.includes("ZENIX")) {
    return (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-zenix" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DFB547" />
            <stop offset="100%" stopColor="#F9D976" />
          </linearGradient>
        </defs>
        <path d="M25 25H75L35 75H75" stroke="url(#logo-zenix)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (normalized.includes("AURA")) {
    return (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-aura" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F9D976" />
            <stop offset="100%" stopColor="#DFB547" />
          </linearGradient>
        </defs>
        <circle cx="42" cy="50" r="20" stroke="url(#logo-aura)" strokeWidth="8" strokeDasharray="3 3" />
        <circle cx="58" cy="50" r="20" stroke="url(#logo-aura)" strokeWidth="8" />
      </svg>
    );
  }
  if (normalized.includes("NEXUS")) {
    return (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-nexus" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DFB547" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>
        <path d="M50 15L80 32V68L50 85L20 68V32L50 15Z" stroke="url(#logo-nexus)" strokeWidth="8" strokeLinejoin="round" />
        <path d="M50 35L62 42V58L50 65L38 58V42L50 35Z" fill="url(#logo-nexus)" opacity="0.6" />
      </svg>
    );
  }
  if (normalized.includes("SOLARIS")) {
    return (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-solaris" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF2B2" />
            <stop offset="100%" stopColor="#DFB547" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="16" fill="url(#logo-solaris)" />
        <path d="M50 12V22M50 78V88M12 50H22M78 50H88M24 24L31 31M69 69L76 76M24 78L31 71M69 31L76 24" stroke="url(#logo-solaris)" strokeWidth="8" strokeLinecap="round" />
      </svg>
    );
  }
  if (normalized.includes("OCTA")) {
    return (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-octa" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DFB547" />
            <stop offset="100%" stopColor="#78530C" />
          </linearGradient>
        </defs>
        <path d="M50 15L78 28V58C78 73 66 83 50 88C34 83 22 73 22 58V28L50 15Z" stroke="url(#logo-octa)" strokeWidth="8" strokeLinejoin="round" />
        <path d="M50 30V70" stroke="url(#logo-octa)" strokeWidth="8" strokeLinecap="round" />
        <path d="M36 42H64" stroke="url(#logo-octa)" strokeWidth="8" strokeLinecap="round" />
      </svg>
    );
  }
  if (normalized.includes("KRONOS")) {
    return (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-kronos" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#DFB547" />
          </linearGradient>
        </defs>
        <path d="M25 25H75L50 50L25 75H75L50 50L25 25" stroke="url(#logo-kronos)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (normalized.includes("AEON")) {
    return (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-aeon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F9D976" />
            <stop offset="100%" stopColor="#64748B" />
          </linearGradient>
        </defs>
        <path d="M30 65C25 65 20 60 20 54C20 48 25 43 31 43C34 33 43 27 54 27C65 27 74 34 76 45C82 46 86 51 86 57C86 63 81 68 75 68H30" stroke="url(#logo-aeon)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (normalized.includes("LUMEN")) {
    return (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-lumen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#DFB547" />
          </linearGradient>
        </defs>
        <path d="M50 15L62 40L88 43L67 60L74 85L50 70L26 85L33 60L12 43L38 40L50 15Z" fill="url(#logo-lumen)" opacity="0.85" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-arcadia-blue transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      <polygon points="12 22 12 12" />
      <polygon points="12 12 22 8.5" />
      <polygon points="12 12 2 8.5" />
    </svg>
  );
}

export function AnimatedCounter({ value, duration = 2000, suffix = "", decimals = 0 }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;

    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      const currentVal = progress * value;
      setCount(currentVal);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration, inView]);

  return (
    <span ref={ref} className="font-mono">
      {decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString()}
      {suffix}
    </span>
  );
}

export function LogoSlider({ 
  logos, 
  trustedByTitle = "Trusted By Elite Ventures & Technology Partners Worldwide",
  trustedBySubtitle,
  showStats = true 
}: LogoSliderProps) {
  const defaultLogos = [
    { src: "/logo1.svg", alt: "ZENIX CORP" },
    { src: "/logo2.svg", alt: "AURA DESIGN" },
    { src: "/logo3.svg", alt: "NEXUS SAAS" },
    { src: "/logo4.svg", alt: "SOLARIS" },
    { src: "/logo5.svg", alt: "OCTA SEC" },
    { src: "/logo1.svg", alt: "KRONOS AI" },
    { src: "/logo2.svg", alt: "AEON CLOUD" },
    { src: "/logo3.svg", alt: "LUMEN LABS" },
  ];

  const activeLogos = logos && logos.length > 0 ? logos : defaultLogos;
  // Duplicate logos list for infinite marquee scrolling effect
  const marqueeLogos = [...activeLogos, ...activeLogos, ...activeLogos];

  return (
    <div className="w-full bg-[#050505]/40 backdrop-blur-md py-6 sm:py-12 border-b border-white/5 relative overflow-hidden z-10">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        
        {/* Statistics & Trusted Metrics Panel */}
        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-12">
            
            {/* Trust Score & Rating */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4 hover:border-arcadia-blue/30 hover:bg-white/[0.04] transition duration-300"
            >
              <div className="p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                <Star className="w-6 h-6 fill-yellow-400/25" />
              </div>
              <div>
                <div className="text-2xl font-display font-black text-white leading-none">
                  <AnimatedCounter value={4.9} decimals={1} suffix="/5.0" />
                </div>
                <p className="text-gray-400 text-xs mt-1 uppercase font-mono tracking-wider font-medium">
                  Client Satisfaction Rating
                </p>
              </div>
            </motion.div>

            {/* Verified Reviews */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4 hover:border-arcadia-blue/30 hover:bg-white/[0.04] transition duration-300"
            >
              <div className="p-3.5 rounded-xl bg-arcadia-blue/10 border border-arcadia-blue/20 text-arcadia-blue">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-display font-black text-white leading-none">
                  <AnimatedCounter value={450} suffix="+" />
                </div>
                <p className="text-gray-400 text-xs mt-1 uppercase font-mono tracking-wider font-medium">
                  Verified Enterprise Reviews
                </p>
              </div>
            </motion.div>

            {/* Active Projects Counter */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4 hover:border-arcadia-blue/30 hover:bg-white/[0.04] transition duration-300"
            >
              <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-display font-black text-white leading-none">
                  <AnimatedCounter value={1250} suffix="+" />
                </div>
                <p className="text-gray-400 text-xs mt-1 uppercase font-mono tracking-wider font-medium">
                  Completed High-Tier Projects
                </p>
              </div>
            </motion.div>

          </div>
        )}

        {/* Header Label / Trusted By Section */}
        {trustedByTitle && (
          <div className="text-center mb-8 max-w-2xl mx-auto">
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-mono text-[10px] uppercase tracking-widest text-gray-400 flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-arcadia-blue" />
              {trustedByTitle}
            </motion.p>
            {trustedBySubtitle && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-gray-500 text-[11px] font-sans tracking-wide mt-1.5"
              >
                {trustedBySubtitle}
              </motion.p>
            )}
          </div>
        )}

        {/* Infinite Marquee Logo Track */}
        <div className="relative w-full overflow-hidden py-4 select-none">
          {/* Subtle gradient overlays to fade out the edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none" />

          {/* Scrolling Marquee Container */}
          <div className="flex w-max animate-[marquee_30s_linear_infinite] hover:[animation-play-state:paused]">
            {marqueeLogos.map((logo, idx) => (
              <div
                key={idx}
                className="h-12 sm:h-16 mx-2 sm:mx-4 px-4 sm:px-6 rounded-2xl bg-arcadia-dark/80 border border-white/5 flex items-center justify-center cursor-pointer shadow-md backdrop-blur-md hover:border-arcadia-blue/30 hover:bg-white/[0.04] transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  {getCompanyLogoSvg(logo.alt)}
                  <span className="font-mono text-xs sm:text-xs font-bold tracking-widest text-gray-400 group-hover:text-white transition-colors duration-300">
                    {logo.alt}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
