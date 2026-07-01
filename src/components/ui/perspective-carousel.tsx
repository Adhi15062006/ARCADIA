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
  showControls?: boolean;
  autoplay?: boolean;
  autoplayInterval?: number;
}

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
  showControls = false,
  autoplay = true,
  autoplayInterval = 4000,
}: PerspectiveCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    if (defaultActiveIndex < items.length) {
      setActiveIndex(defaultActiveIndex);
    }
  }, [defaultActiveIndex, items.length]);

  const handleNext = React.useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const handlePrev = React.useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  // Autoplay Effect
  useEffect(() => {
    if (!autoplay || isHovered || isDragging || items.length <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, autoplayInterval);
    return () => clearInterval(timer);
  }, [autoplay, autoplayInterval, isHovered, isDragging, items.length, handleNext]);

  const getImageUrl = (src: string, itemTitle?: string, itemCategory?: string) => {
    // If we have an Unsplash URL directly, use it
    if (src && src.startsWith("http")) return src;

    const title = (itemTitle || "").toLowerCase();
    const cat = (itemCategory || "").toLowerCase();

    // Map categories to high-quality curated Unsplash images
    if (cat.includes("ai") || title.includes("ai") || title.includes("chatbot") || title.includes("gpt")) {
      return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"; // Futuristic abstract glow
    }
    if (cat.includes("web") || title.includes("website") || title.includes("saas") || title.includes("portal")) {
      return "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80"; // Web design workspace
    }
    if (cat.includes("mobile") || cat.includes("app") || title.includes("ios") || title.includes("android")) {
      return "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&auto=format&fit=crop&q=80"; // Mobile phone mockup
    }
    if (cat.includes("design") || cat.includes("marketing") || title.includes("branding") || title.includes("logo")) {
      return "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&auto=format&fit=crop&q=80"; // Creative neon lines
    }
    if (cat.includes("seo") || title.includes("seo") || title.includes("analytics") || title.includes("maintenance")) {
      return "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80"; // Data dashboard screen
    }

    if (FALLBACK_IMAGES[src]) {
      return FALLBACK_IMAGES[src];
    }
    return "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80"; // General space tech
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Calculate normalized offset from -0.5 to 0.5
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
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
            className="absolute w-[600px] h-[600px] rounded-full blur-[120px]"
            style={{
              backgroundImage: `radial-gradient(circle, var(--color-arcadia-cyan) 0%, transparent 70%)`,
            }}
          />
        </AnimatePresence>
      </div>

      {/* 3D Perspective Stage */}
      <div 
        className="relative w-full max-w-[1000px] h-[420px] [perspective:1400px] flex items-center justify-center z-10"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          className="relative w-full h-full [transform-style:preserve-3d] flex items-center justify-center cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={isTouchDevice ? 0.35 : 0.15}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={(event, info) => {
            setIsDragging(false);
            const offset = info.offset.x;
            const velocity = info.velocity.x;
            const dragThreshold = 50;
            if (offset < -dragThreshold || velocity < -500) {
              handleNext();
            } else if (offset > dragThreshold || velocity > 500) {
              handlePrev();
            }
          }}
        >
          {items.map((item, i) => {
            const count = items.length;
            let diff = i - activeIndex;
            
            // Adjust difference for circular carousel loop
            if (diff < -count / 2) diff += count;
            if (diff > count / 2) diff -= count;

            const isCenter = diff === 0;
            const isVisible = Math.abs(diff) <= 2; // Show active and 2 neighbors on each side

            // Apply interactive mouse tracking calculations on active center item
            const rotateY = diff * -24 + (isCenter ? mouseOffset.x * 22 : 0);
            const rotateX = isCenter ? mouseOffset.y * -22 : 0;
            const translateX = diff * (slideWidth * 0.85) + (isCenter ? mouseOffset.x * 30 : 0);
            const translateY = isCenter ? mouseOffset.y * 30 : 0;
            const translateZ = Math.abs(diff) * -120;
            const opacity = isVisible ? (isCenter ? 1 : 0.45 - Math.abs(diff) * 0.1) : 0;
            const scale = isCenter ? 1.05 : 0.85;

            return (
              <motion.div
                key={item.id || i}
                onTap={() => {
                  if (isCenter) {
                    if (onItemClick) onItemClick(item);
                  } else {
                    setActiveIndex(i);
                  }
                }}
                className={`absolute rounded-[28px] overflow-hidden border border-white/5 bg-arcadia-dark/95 shadow-2xl cursor-pointer select-none`}
                style={{
                  width: `${slideWidth}px`,
                  height: "360px",
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  zIndex: 100 - Math.abs(diff),
                }}
                animate={{
                  transform: `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
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
                  stiffness: isCenter ? 150 : 220, // Softer spring for mouse tracking tilt
                  damping: isCenter ? 25 : 22,
                }}
              >
                {/* Highlight/Glow boundary for active slide */}
                {isCenter && (
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-arcadia-blue to-transparent z-30" />
                )}

                {/* Dark Vignette Layer */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-85 z-10" />

                <img
                  src={getImageUrl(item.src || item.imageUrl, item.title, item.category)}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover select-none pointer-events-none"
                />

                {/* Content Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-6 z-20 flex flex-col justify-end text-left h-3/4">
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
                        <motion.button
                          type="button"
                          onTap={(e) => {
                            e.stopPropagation(); // Avoid triggering parent div onClick/onTap
                            if (onItemClick) onItemClick(item);
                          }}
                          className="px-2.5 py-1 rounded-full bg-arcadia-blue hover:bg-arcadia-blue/95 text-[9px] font-bold text-white flex items-center gap-1 transition shadow-lg shadow-arcadia-blue/30 cursor-pointer"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>{lang === "en" ? "Order" : "आर्डर"}</span>
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Manual Controls & Indicator Dots */}
      <div className="flex flex-col items-center gap-4 z-20">
        {showControls && (
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
        )}

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

export default PerspectiveCarousel;
