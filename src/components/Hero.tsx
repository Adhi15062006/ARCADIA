import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowRight, Star, Sparkles, MessageSquare, Globe, Bot, Smartphone, Cpu } from "lucide-react";
import AnimatedButton from "./ui/animated-button";

interface HeroProps {
  onStartProject: () => void;
  onBookDemo: () => void;
  onNavigateToServices: () => void;
  lang: "en" | "hi";
}

export default function Hero({ onStartProject, onBookDemo, onNavigateToServices, lang }: HeroProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate mouse position relative to window percentages for parallax
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 30,
        y: (e.clientY / window.innerHeight - 0.5) * 30
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const translations = {
    badge: { en: "ARCADIA STUDIO v2.6 • ESTABLISHED IN INDIA", hi: "आर्केडिया स्टूडियो v2.6 • भारत में स्थापित" },
    headline: { en: "Build Your Digital Legacy", hi: "अपनी डिजिटल विरासत का निर्माण करें" },
    subtitle: { en: "Modern Websites • AI Solutions • Business Automation", hi: "आधुनिक वेबसाइटें • एआई समाधान • बिजनेस ऑटोमेशन" },
    paragraph: { en: "We engineer award-winning SaaS interfaces, secure full-stack applications, and state-of-the-art server-side generative chatbots. Crafted for high conversions, extreme speed, and ultimate aesthetics.", hi: "हम पुरस्कार विजेता SaaS इंटरफेस, सुरक्षित फुल-स्टैक एप्लिकेशन और अत्याधुनिक सर्वर-साइड जनरेटिव चैटबॉट्स का निर्माण करते हैं।" },
    review: { en: "Rated 4.9/5 by 120+ Indian and global startups", hi: "120+ भारतीय और वैश्विक स्टार्टअप्स द्वारा 4.9/5 रेटेड" }
  };

  const features = [
    {
      icon: <Globe className="w-5 h-5 text-arcadia-blue" />,
      title: { en: "Elite Web Architectures", hi: "उत्कृष्ट वेब आर्किटेक्चर" },
      desc: { en: "High-conversion full-stack websites, e-commerce networks, and custom portals with flawless performance.", hi: "बेहतर प्रदर्शन के साथ उच्च रूपांतरण फुल-स्टैक वेबसाइटें और कस्टम पोर्टल्स।" }
    },
    {
      icon: <Bot className="w-5 h-5 text-arcadia-cyan" />,
      title: { en: "Generative AI Agents", hi: "जेनरेटिव एआई एजेंट्स" },
      desc: { en: "Server-side conversational Gemini voice-bots, smart vector indexes, and automation pipelines.", hi: "सर्वर-साइड संवादात्मक जेमिनी वॉयस-बॉट्स और स्वचालित चैट पाइपलाइन।" }
    },
    {
      icon: <Cpu className="w-5 h-5 text-green-400" />,
      title: { en: "Corporate Automation", hi: "कॉर्पोरेट ऑटोमेशन" },
      desc: { en: "Enterprise custom SaaS business engines, self-service admin logs, and secure integrations.", hi: "एंटरप्राइज़ कस्टम SaaS बिजनेस इंजन, स्व-सेवा व्यवस्थापक लॉग और सुरक्षित एकीकरण।" }
    }
  ];

  return (
    <section 
      id="home"
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden pt-28 pb-16 grid-overlay cursor-glow-container bg-transparent"
    >
      {/* Interactive Hover Light Follower */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none opacity-20 blur-[120px] bg-radial from-arcadia-blue to-transparent z-0 transition-all duration-300 hidden md:block"
        style={{
          left: `calc(50% + ${mousePosition.x * 2}px)`,
          top: `calc(50% + ${mousePosition.y * 2}px)`,
          transform: "translate(-50%, -50%)"
        }}
      />

      {/* Fullscreen Grid Container */}
      <div className="container mx-auto px-6 relative z-20 w-full max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ 
                type: "spring",
                stiffness: 60,
                damping: 20,
                delay: 0.15
              }}
              className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05] text-white mb-6"
            >
              Build Your <br />
              <motion.span 
                initial={{ backgroundPosition: "0% 50%" }}
                animate={{ backgroundPosition: "100% 50%" }}
                transition={{ duration: 5, repeat: Infinity, repeatType: "reverse" }}
                className="text-gradient-cyan bg-[length:200%_auto] inline-block"
              >
                Digital Legacy
              </motion.span>
            </motion.h1>

            {/* Subtitle list */}
            <motion.div
              initial={{ opacity: 0, y: 25, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ 
                type: "spring",
                stiffness: 50,
                damping: 18,
                delay: 0.3 
              }}
              className="text-gray-300 font-display text-xs sm:text-sm font-medium tracking-wide mb-6 flex flex-wrap gap-x-3 gap-y-1 items-center"
            >
              <span>Modern Websites</span>
              <span className="text-arcadia-blue font-bold">•</span>
              <span>AI Solutions</span>
              <span className="text-arcadia-blue font-bold">•</span>
              <span>Business Automation</span>
            </motion.div>

            {/* Mini Paragraph */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
              className="text-gray-400 font-sans text-sm leading-relaxed mb-8 max-w-xl"
            >
              {translations.paragraph[lang]}
            </motion.p>

            {/* WhatsApp CTA connection button separately */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 100,
                damping: 15,
                delay: 0.6 
              }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-8 z-10"
            >
              <AnimatedButton
                onClick={onBookDemo}
                className="group px-8 py-4 rounded-full bg-arcadia-blue hover:bg-arcadia-blue/90 text-white font-display text-sm font-bold tracking-wider hover:shadow-[0_0_25px_rgba(47,128,255,0.5)] transition duration-300 cursor-pointer text-center flex items-center justify-center gap-2.5 relative overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <Sparkles className="w-4 h-4 text-arcadia-cyan group-hover:rotate-12 transition-transform duration-300 shrink-0" />
                <span>{lang === "en" ? "Book Free Demo" : "फ्री डेमो बुक करें"}</span>
              </AnimatedButton>

              <AnimatedButton
                onClick={onNavigateToServices}
                className="group px-8 py-4 rounded-full border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 text-white font-display text-sm font-semibold tracking-wide transition duration-300 cursor-pointer text-center flex items-center justify-center gap-2"
              >
                <span>{lang === "en" ? "Explore Services" : "सेवाएं देखें"}</span>
                <ArrowRight className="w-4 h-4 text-arcadia-blue group-hover:translate-x-1 transition-transform duration-300" />
              </AnimatedButton>
            </motion.div>

            {/* Review Stars */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex items-center gap-3.5 border-t border-white/5 pt-6 w-full max-w-md"
            >
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="font-display text-xs text-gray-400">
                {translations.review[lang]}
              </span>
            </motion.div>

          </div>

          {/* Right Features On Top Column */}
          <div className="lg:col-span-6 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 + idx * 0.1 }}
                  whileHover={{ y: -4, borderColor: "rgba(47, 128, 255, 0.3)" }}
                  className="rounded-2xl p-5 border border-white/5 bg-arcadia-black/60 backdrop-blur-md transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-white">
                      {feature.icon}
                    </div>
                    <h3 className="font-display font-bold text-sm text-white">
                      {lang === "en" ? feature.title.en : feature.title.hi}
                    </h3>
                  </div>
                  <p className="font-sans text-[11px] text-gray-400 leading-relaxed">
                    {lang === "en" ? feature.desc.en : feature.desc.hi}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
