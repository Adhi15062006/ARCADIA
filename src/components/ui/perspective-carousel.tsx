import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, CheckCircle, ShoppingBag } from "lucide-react";
import AnimatedButton from "./animated-button";

interface PerspectiveItem {
  src: string;
  title: string;
  description?: string;
  price?: string;
  features?: string[];
  id?: string | number;
  [key: string]: any;
}

interface PerspectiveCarouselProps {
  items: PerspectiveItem[];
  defaultActiveIndex?: number;
  slideWidth?: number;
  className?: string;
  onItemClick?: (item: PerspectiveItem) => void;
  lang?: "en" | "hi";
}

// Fallback images map for default demo images to ensure beautiful display in preview
const FALLBACK_IMAGES: { [key: string]: string } = {
  "/images/city.jpg": "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&q=80",
  "/images/night.jpg": "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&q=80",
  "/images/flowers.jpg": "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=600&q=80",
  "/images/fuji.jpg": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&q=80",
};

export function PerspectiveCarousel({
  items,
  defaultActiveIndex = 0,
  slideWidth = 240,
  className = "",
  onItemClick,
  lang = "en",
}: PerspectiveCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1000);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (defaultActiveIndex < items.length) {
      setActiveIndex(defaultActiveIndex);
    }
  }, [defaultActiveIndex, items.length]);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  const currentSlideWidth = isMobile ? 185 : (isTablet ? 210 : slideWidth);
  const spreadFactor = isMobile ? 0.35 : (isTablet ? 0.62 : 0.85);

  const getImageUrl = (src: string) => {
    if (FALLBACK_IMAGES[src]) {
      return FALLBACK_IMAGES[src];
    }
    return src || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80";
  };

  if (!items || items.length === 0) return null;

  return (
    <div className={`relative w-full flex flex-col items-center justify-center overflow-hidden py-10 ${className}`}>
      {/* Dynamic Background Blur Glow matching active item */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.15, scale: 1.1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.8 }}
            className="absolute w-[600px] h-[600px] rounded-full blur-[120px] bg-gradient-to-r from-arcadia-blue to-arcadia-cyan"
            style={{
              backgroundImage: `radial-gradient(circle, var(--color-arcadia-cyan) 0%, transparent 70%)`,
            }}
          />
        </AnimatePresence>
      </div>

      {/* 3D Perspective Stage */}
      <div className="relative w-full max-w-[1000px] h-[340px] sm:h-[420px] [perspective:1400px] flex items-center justify-center z-10">
        <div className="relative w-full h-full [transform-style:preserve-3d] flex items-center justify-center [mask-image:linear-gradient(to_right,transparent_0%,white_15%,white_85%,transparent_100%)]">
          {items.map((item, i) => {
            const count = items.length;
            // Calculate distance index relative to active index
            let diff = i - activeIndex;
            
            // Adjust difference for circular carousel loop
            if (diff < -count / 2) diff += count;
            if (diff > count / 2) diff -= count;

            const isCenter = diff === 0;
            const isVisible = Math.abs(diff) <= 2; // Show active and 2 neighbors on each side

            // Calculate perspective placement values
            const rotateY = isMobile ? diff * -12 : diff * -24; // Rotate slides away from center less on mobile
            const translateX = diff * (currentSlideWidth * spreadFactor); // Spread slides out
            const translateZ = Math.abs(diff) * (isMobile ? -60 : -120); // Move non-active slides deeper
            const opacity = isVisible ? (isCenter ? 1 : (isMobile ? 0.35 : 0.45) - Math.abs(diff) * 0.1) : 0;
            const scale = isCenter ? 1.05 : 0.85;

            const currentHeight = isMobile ? 300 : 360;

            return (
              <motion.div
                key={item.id || i}
                onClick={() => {
                  if (isCenter) {
                    if (onItemClick) onItemClick(item);
                  } else {
                    setActiveIndex(i);
                  }
                }}
                className={`absolute rounded-3xl overflow-hidden border border-white/5 bg-arcadia-dark/95 shadow-2xl cursor-pointer select-none`}
                style={{
                  width: `${currentSlideWidth}px`,
                  height: `${currentHeight}px`,
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  zIndex: 100 - Math.abs(diff),
                }}
                animate={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
                  opacity: opacity,
                  scale: scale,
                }}
                whileHover={isCenter ? { 
                  scale: 1.08,
                  borderColor: "rgba(47,128,255,0.4)",
                  boxShadow: "0 25px 50px -12px rgba(47,128,255,0.25)"
                } : {
                  opacity: 0.7
                }}
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 22,
                }}
              >
                {/* Highlight/Glow boundary for active slide */}
                {isCenter && (
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-arcadia-blue to-transparent z-30" />
                )}

                {/* Dark Vignette Layer */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-85 z-10" />

                <img
                  src={getImageUrl(item.src || item.imageUrl)}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover select-none pointer-events-none"
                />

                {/* Content Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 z-20 flex flex-col justify-end text-left h-3/4">
                  {item.category && (
                    <span className="inline-block self-start px-2 py-0.5 rounded bg-arcadia-cyan/15 border border-arcadia-cyan/25 font-mono text-[8px] font-bold text-arcadia-cyan uppercase tracking-widest mb-1.5">
                      {item.category}
                    </span>
                  )}
                  
                  <h3 className="font-display font-black text-sm sm:text-base text-white leading-tight drop-shadow-md">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="font-sans text-[10px] text-gray-300 mt-1 line-clamp-2 leading-relaxed opacity-90">
                      {item.description}
                    </p>
                  )}

                  {/* Pricing and Action row */}
                  {item.price && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-[8px] text-gray-400 uppercase tracking-widest">
                          {lang === "en" ? "Invest" : "निवेश"}
                        </div>
                        <div className="font-display font-black text-xs text-white">
                          ₹{parseInt(item.price).toLocaleString("en-IN")}
                        </div>
                      </div>

                      {isCenter && (
                        <div className="px-2.5 py-1 rounded-full bg-arcadia-blue hover:bg-arcadia-blue/95 text-[9px] font-bold text-white flex items-center gap-1 transition shadow-lg shadow-arcadia-blue/30">
                          <ShoppingBag className="w-3 h-3" />
                          <span>{lang === "en" ? "Order" : "आर्डर"}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Manual Controls & Indicator Dots */}
      <div className="flex flex-col items-center gap-4 z-20">
        <div className="flex items-center gap-3">
          <AnimatedButton
            onClick={handlePrev}
            className="p-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </AnimatedButton>
          
          <div className="flex gap-1.5">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeIndex === idx ? "w-6 bg-arcadia-cyan" : "w-1.5 bg-white/10"
                }`}
              />
            ))}
          </div>

          <AnimatedButton
            onClick={handleNext}
            className="p-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </AnimatedButton>
        </div>

        {/* Display details of active slide directly under carousel for enhanced UI context */}
        {items[activeIndex] && (
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md px-6 mt-1"
          >
            <p className="font-mono text-[9px] text-arcadia-cyan uppercase tracking-widest font-semibold mb-1">
              {lang === "en" ? "Selected Platform Concept" : "चयनित प्लेटफार्म अवधारणा"}
            </p>
            <h4 className="font-display font-black text-md text-white">
              {items[activeIndex].title}
            </h4>
            {items[activeIndex].features && (
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2.5">
                {items[activeIndex].features.slice(0, 3).map((f: string, i: number) => (
                  <span key={i} className="flex items-center gap-1 font-sans text-[9px] text-gray-400 bg-white/[0.02] px-2 py-0.5 rounded border border-white/5">
                    <CheckCircle className="w-2.5 h-2.5 text-arcadia-cyan shrink-0" />
                    <span>{f}</span>
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
