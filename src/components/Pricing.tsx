import React, { useState } from "react";
import { motion } from "motion/react";
import { Check, HelpCircle, Star, Zap, Terminal, ChevronDown, ChevronUp } from "lucide-react";
import AnimatedButton from "./ui/animated-button";
import { FlipText } from "./ui/flip-text";

interface PricingProps {
  onSelectPlan: (planTitle: string) => void;
  lang: "en" | "hi";
}

export default function Pricing({ onSelectPlan, lang }: PricingProps) {
  const [showAllMobile, setShowAllMobile] = useState(false);

  const translations = {
    title: { en: "Investment Plans", hi: "निवेश योजनाएं" },
    subtitle: { en: "Transparent Development Pricing • No Hidden Clauses • Custom Engineering", hi: "पारदर्शी विकास लागत • कोई छिपा हुआ शुल्क नहीं • कस्टम इंजीनियरिंग" },
    popular: { en: "MOST POPULAR CHOICE", hi: "सबसे लोकप्रिय विकल्प" },
    btnSelect: { en: "Initialize Project", hi: "प्रोजेक्ट शुरू करें" },
    btnContact: { en: "Acquire Custom Quote", hi: "कस्टम कोट प्राप्त करें" }
  };

  const plans = [
    {
      name: "Starter",
      price: "₹4,999",
      period: "one-time",
      desc: { en: "Ideal for startups, consultants and creators seeking a beautiful digital presentation.", hi: "स्टार्टअप्स और सलाहकारों के लिए उपयुक्त डिजिटल प्रस्तुति।" },
      features: [
        { text: "1 Premium Landing Page", bold: true },
        { text: "Fully Responsive UI", bold: false },
        { text: "Framer Motion Micro-interactions", bold: false },
        { text: "Basic SEO Configurations", bold: false },
        { text: "Google Maps & Contact Form Integration", bold: false },
        { text: "3 Days Delivery", bold: false },
        { text: "1 Month Maintenance Support", bold: true }
      ],
      isHighlighted: false,
      badge: "ESSENTIALS"
    },
    {
      name: "Professional",
      price: "₹14,999",
      period: "one-time",
      desc: { en: "Our award-winning package, combining full-stack web architectures with custom CMS structures.", hi: "पूर्ण स्टैक वेब आर्किटेक्चर और कस्टम सीएमएस संरचनाओं का एक आदर्श पैकेज।" },
      features: [
        { text: "Up to 5 Custom Pages", bold: true },
        { text: "Vite + React High Speed Engine", bold: false },
        { text: "Client-side / Admin CMS Dashboard", bold: true },
        { text: "Gemini AI Chatbot Integration", bold: true },
        { text: "Razorpay / Stripe Payments Integration", bold: true },
        { text: "Advanced SEO & Sitemap setup", bold: false },
        { text: "10 Days Delivery", bold: false },
        { text: "3 Months Priority Support", bold: true }
      ],
      isHighlighted: true,
      badge: "BEST VALUE"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "quote",
      desc: { en: "Bespoke SaaS architectures, advanced AI voice-calling systems, and fully native mobile apps.", hi: "विशिष्ट सास आर्किटेक्चर, उन्नत एआई कॉलिंग सिस्टम और मोबाइल ऐप्स।" },
      features: [
        { text: "Infinite Custom Pages", bold: true },
        { text: "Full Stack (Express + Node + Databases)", bold: true },
        { text: "Advanced Gemini 3.5 AI automations", bold: true },
        { text: "iOS & Android Mobile Applications", bold: true },
        { text: "Enterprise CRM & Slack integrations", bold: false },
        { text: "Dedicated Team & Security Audits", bold: false },
        { text: "Flexible Delivery Timelines", bold: false },
        { text: "1 Year Full Support & Hosting", bold: true }
      ],
      isHighlighted: false,
      badge: "TAILORED"
    }
  ];

  return (
    <section 
      id="pricing" 
      className="py-24 relative w-full bg-[#050505]/40 backdrop-blur-md border-b border-white/5 overflow-hidden"
    >
      <div className="glow-bg glow-purple w-[500px] h-[500px] top-[-10%] right-[-10%] opacity-15" />
      <div className="glow-bg glow-blue w-[400px] h-[400px] bottom-[-5%] left-[-5%] opacity-25" />

      <div className="container mx-auto px-6 relative z-10 w-full max-w-7xl">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arcadia-blue/10 border border-arcadia-blue/20 mb-4"
          >
            <Terminal className="w-3.5 h-3.5 text-arcadia-blue" />
            <span className="font-display text-[10px] uppercase tracking-widest text-arcadia-blue font-semibold">
              PRICING PLANS
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

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, idx) => {
            const isHiddenMobile = !showAllMobile && idx > 0;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`rounded-[28px] p-8 flex-col relative h-full transition-all duration-300 ${
                  isHiddenMobile ? "hidden lg:flex" : "flex"
                } ${
                  plan.isHighlighted
                    ? "bg-[#0b0f19] border-2 border-arcadia-blue/50 shadow-[0_20px_50px_rgba(47,128,255,0.15)] scale-102 lg:scale-105 z-10"
                    : "bg-arcadia-dark border border-white/5 hover:border-white/10"
                }`}
              >
                {/* Highlight Neon Gradient line */}
                {plan.isHighlighted && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-arcadia-blue via-arcadia-cyan to-purple-600 rounded-t-[28px]" />
                )}

                {/* Top Row Label / Badge */}
                <div className="flex justify-between items-center mb-6">
                  <span className="font-mono text-[9px] tracking-widest text-gray-500 uppercase">
                    {plan.badge}
                  </span>
                  
                  {plan.isHighlighted && (
                    <span className="px-3 py-1 rounded-full bg-arcadia-blue/20 text-arcadia-blue font-display text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1">
                      <Star className="w-3 h-3 fill-arcadia-blue" />
                      <span>{translations.popular[lang]}</span>
                    </span>
                  )}
                </div>

                {/* Title & Desc */}
                <h3 className="font-display font-extrabold text-2xl text-white mb-2">
                  {plan.name}
                </h3>
                <p className="font-sans text-xs text-gray-400 leading-relaxed mb-6">
                  {lang === "en" ? plan.desc.en : plan.desc.hi}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="font-display font-black text-4xl sm:text-5xl text-white">
                    {plan.price}
                  </span>
                  <span className="font-sans text-xs text-gray-500 uppercase tracking-wide">
                    / {plan.period}
                  </span>
                </div>

                {/* Features Checklist */}
                <div className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-3 text-xs">
                      <div className={`p-0.5 rounded-full mt-0.5 ${
                        plan.isHighlighted ? "bg-arcadia-blue/20 text-arcadia-blue" : "bg-white/5 text-gray-400"
                      }`}>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className={feature.bold ? "text-white font-semibold" : "text-gray-400 font-sans"}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <AnimatedButton
                  onClick={() => onSelectPlan(`${plan.name} Plan`)}
                  className={`w-full py-4 rounded-full font-display text-xs font-bold tracking-wider transition-all cursor-pointer text-center flex items-center justify-center gap-2 ${
                    plan.isHighlighted
                      ? "bg-arcadia-blue text-white shadow-[0_4px_20px_rgba(47,128,255,0.4)] hover:shadow-[0_4px_30px_rgba(47,128,255,0.6)]"
                      : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  }`}
                >
                  {plan.name === "Enterprise" ? (
                    <span>{translations.btnContact[lang]}</span>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 animate-pulse" />
                      <span>{translations.btnSelect[lang]}</span>
                    </>
                  )}
                </AnimatedButton>

              </motion.div>
            );
          })}
        </div>

        {/* Mobile View Toggle Button */}
        <div className="mt-8 flex justify-center lg:hidden">
          <AnimatedButton
            onClick={() => setShowAllMobile(!showAllMobile)}
            className="px-6 py-3.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white font-display text-xs font-semibold tracking-wide transition duration-300 cursor-pointer flex items-center gap-2"
          >
            <span>
              {showAllMobile
                ? (lang === "en" ? "Show Less Plans" : "कम योजनाएं दिखाएं")
                : (lang === "en" ? "Show More Plans" : "और योजनाएं दिखाएं")}
            </span>
            {showAllMobile ? (
              <ChevronUp className="w-4 h-4 text-arcadia-blue" />
            ) : (
              <ChevronDown className="w-4 h-4 text-arcadia-blue animate-bounce" />
            )}
          </AnimatedButton>
        </div>

      </div>
    </section>
  );
}
