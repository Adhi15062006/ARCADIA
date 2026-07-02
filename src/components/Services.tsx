import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Service } from "../types";
import AnimatedButton from "./ui/animated-button";
import { FlipText } from "./ui/flip-text";
import { PerspectiveCarousel } from "./ui/perspective-carousel";
import { 
  ArrowUpRight, 
  Sparkles, 
  Layers, 
  Bot, 
  Smartphone, 
  Palette, 
  Activity, 
  Settings, 
  TrendingUp, 
  CheckCircle,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface ServicesProps {
  services: Service[];
  onSelectService: (serviceTitle: string) => void;
  lang: "en" | "hi";
}

export default function Services({ services, onSelectService, lang }: ServicesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showAllMobile, setShowAllMobile] = useState(false);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  React.useEffect(() => {
    setShowAllMobile(false);
  }, [selectedCategory, debouncedQuery]);

  const categories = ["All", "Web Development", "AI Solutions", "Design & Marketing"];

  const translations = {
    title: { en: "Elite Digital Catalog", hi: "उत्कृष्ट डिजिटल कैटलॉग" },
    subtitle: { en: "Transparent Pricing • High Conversions • Advanced AI Integrations", hi: "पारदर्शी मूल्य निर्धारण • उच्च रूपांतरण • उन्नत एआई एकीकरण" },
    searchPlace: { en: "Search solutions, platforms or services...", hi: "समाधान, प्लेटफॉर्म या सेवाएं खोजें..." },
    btnOrder: { en: "Order Now", hi: "अभी आर्डर करें" },
    btnDemo: { en: "Inquire Now", hi: "पूछताछ करें" },
    delivery: { en: "Ready in", hi: "तैयार अवधि" }
  };

  // Helper to assign icons to categories/titles
  const getServiceIcon = (title: string, category: string) => {
    const t = title.toLowerCase();
    if (t.includes("chatbot") || t.includes("voice")) return <Bot className="w-5 h-5 text-arcadia-cyan" />;
    if (t.includes("app") || t.includes("ios") || t.includes("android")) return <Smartphone className="w-5 h-5 text-arcadia-blue" />;
    if (t.includes("design") || t.includes("logo") || t.includes("branding")) return <Palette className="w-5 h-5 text-purple-400" />;
    if (t.includes("seo") || t.includes("maintenance")) return <TrendingUp className="w-5 h-5 text-green-400" />;
    return <Layers className="w-5 h-5 text-arcadia-blue" />;
  };

  // Filter and search logic
  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === "All" || service.category === selectedCategory;
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return matchesCategory;
    const matchesSearch = service.title.toLowerCase().includes(q) || 
                          service.description.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <section 
      id="services" 
      className="py-24 relative w-full bg-[#050505]/40 backdrop-blur-md border-y border-white/5 overflow-hidden animate-fade-in"
    >
      <div className="glow-bg glow-blue w-[400px] h-[400px] top-[10%] right-[5%] opacity-30" />
      <div className="glow-bg glow-cyan w-[400px] h-[400px] bottom-[10%] left-[5%] opacity-20" />

      <div className="container mx-auto px-6 relative z-10 w-full max-w-7xl">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arcadia-blue/10 border border-arcadia-blue/20 mb-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-arcadia-blue animate-pulse" />
            <span className="font-display text-[10px] uppercase tracking-widest text-arcadia-blue font-semibold">
              SERVICES
            </span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4"
          >
            <FlipText>{translations.title[lang]}</FlipText>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 font-sans text-sm sm:text-base"
          >
            {translations.subtitle[lang]}
          </motion.p>
        </div>

        {/* Search & Category Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-white/5 pb-8">
          {/* Categories Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <AnimatedButton
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full font-display text-xs font-semibold tracking-wide transition-all ${
                  selectedCategory === cat
                    ? "bg-arcadia-blue text-white shadow-[0_4px_15px_rgba(47,128,255,0.3)]"
                    : "bg-white/5 text-gray-400 hover:text-white border border-white/5 hover:border-white/10"
                }`}
              >
                {cat === "All" ? (lang === "en" ? "All Solutions" : "सभी समाधान") : cat}
              </AnimatedButton>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={translations.searchPlace[lang]}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-full bg-white/5 border border-white/10 font-sans text-xs text-white placeholder-gray-500 focus:outline-none focus:border-arcadia-blue/50 transition-all"
            />
          </div>
        </div>

        {/* Perspective Carousel */}
        <div className="w-full relative z-10 py-2">
          {filteredServices.length > 0 ? (
            <PerspectiveCarousel
              items={filteredServices.map((service, idx) => {
                const demoImages = [
                  "/images/city.jpg",
                  "/images/night.jpg",
                  "/images/flowers.jpg",
                  "/images/fuji.jpg"
                ];
                return {
                  ...service,
                  src: (service as any).imageUrl || demoImages[idx % demoImages.length],
                };
              })}
              defaultActiveIndex={Math.min(2, filteredServices.length - 1)}
              slideWidth={260}
              onItemClick={(item) => {
                onSelectService(item.title);
              }}
              lang={lang}
            />
          ) : (
            <div className="text-center py-16">
              <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">
                No solutions found in this sector.
              </p>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
