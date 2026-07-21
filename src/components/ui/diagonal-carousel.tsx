import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowLeft, ArrowRight, CornerDownRight, Sparkles, ExternalLink } from "lucide-react";

interface CarouselItem {
  src: string;
  title: string;
  subtitle?: string;
  description?: string;
}

interface DiagonalCarouselProps {
  items: CarouselItem[];
  defaultActiveIndex?: number;
  slideSize?: number;
  className?: string;
  onSelect?: (index: number) => void;
  onItemClick?: (index: number) => void;
}

// Map common keywords to gorgeous high-resolution Unsplash URLs for failsafe premium aesthetics
const FALLBACK_IMAGES: { [key: string]: string } = {
  "urban": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1000&q=80",
  "city": "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1000&q=80",
  "night": "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1000&q=80",
  "flowers": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80",
  "wildflowers": "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1000&q=80",
  "fuji": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=80",
  "mount": "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1000&q=80",
};

function getFailsafeImageUrl(src?: string, title?: string) {
  const normTitle = (title || "").toLowerCase();
  const normSrc = (src || "").toLowerCase();

  for (const key of Object.keys(FALLBACK_IMAGES)) {
    if (normTitle.includes(key) || normSrc.includes(key)) {
      return FALLBACK_IMAGES[key];
    }
  }
  // Generic fallback to elegant abstract design artwork
  return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80";
}

export function DiagonalCarousel({
  items,
  defaultActiveIndex = 0,
  slideSize = 210,
  className = "",
  onSelect,
  onItemClick,
}: DiagonalCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1000);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const currentSlideSize = isMobile ? 180 : slideSize;

  // Framer Motion spring values for ultra-smooth buttery movements
  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 120, damping: 20 });

  // Update center position based on current active item index and slide container width (accounting for gap-8 which is 32px)
  useEffect(() => {
    const centerOffset = -activeIndex * (currentSlideSize + 32);
    x.set(centerOffset);
  }, [activeIndex, currentSlideSize, x]);

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const nextIdx = Math.max(0, activeIndex - 1);
    setActiveIndex(nextIdx);
    if (onSelect) onSelect(nextIdx);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const nextIdx = Math.min(items.length - 1, activeIndex + 1);
    setActiveIndex(nextIdx);
    if (onSelect) onSelect(nextIdx);
  };

  const handleCardClick = (idx: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (idx === activeIndex) {
      if (onItemClick) {
        onItemClick(idx);
      }
    } else {
      setActiveIndex(idx);
      if (onSelect) onSelect(idx);
    }
  };

  // Drag handlers for mobile swiping or desktop gesture drag
  const onDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    const offset = info.offset.x;
    
    if (offset > swipeThreshold && activeIndex > 0) {
      handlePrev();
    } else if (offset < -swipeThreshold && activeIndex < items.length - 1) {
      handleNext();
    } else {
      // snap back (accounting for gap-8 which is 32px)
      const centerOffset = -activeIndex * (currentSlideSize + 32);
      x.set(centerOffset);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full overflow-hidden flex flex-col justify-between py-6 sm:py-12 px-4 sm:px-12 select-none ${className}`}
    >
      {/* Background ambient lighting overlay */}
      <div className="absolute inset-0 bg-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Info */}
      <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-mono tracking-widest text-purple-400 mb-3">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Diagonal Interaction Layer
          </div>
          <h3 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight uppercase">
            {items[activeIndex]?.title || "Exploration Deck"}
          </h3>
          <p className="text-gray-400 text-xs font-mono tracking-wide mt-1 flex items-center gap-1">
            <CornerDownRight className="w-3.5 h-3.5 text-purple-500" />
            Showing Node {activeIndex + 1} of {items.length} • Powered by Arcadia Design Labs
          </p>
        </div>

        {/* Custom Navigation Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => handlePrev(e)}
            disabled={activeIndex === 0}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:border-purple-500/30 transition disabled:opacity-30 disabled:pointer-events-none"
            title="Previous Node"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex gap-1">
            {items.map((_, idx) => (
              <div
                key={idx}
                onClick={(e) => handleCardClick(idx, e)}
                className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                  activeIndex === idx ? "w-6 bg-purple-500" : "w-1.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          <button
            onClick={(e) => handleNext(e)}
            disabled={activeIndex === items.length - 1}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:border-purple-500/30 transition disabled:opacity-30 disabled:pointer-events-none"
            title="Next Node"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Interactive Stage for Diagonal Moving Cards */}
      <div className="relative w-full overflow-hidden py-10 flex items-center justify-center min-h-[380px] z-10 cursor-grab active:cursor-grabbing [mask-image:linear-gradient(to_right,transparent_0%,white_5%,white_95%,transparent_100%)]">

        <motion.div
          style={{ x: springX }}
          drag="x"
          dragConstraints={{ left: -((items.length - 1) * (currentSlideSize + 32)), right: 0 }}
          onDragEnd={onDragEnd}
          className="flex items-center gap-8 pl-[calc(50%-90px)] sm:pl-[calc(50%-105px)]"
        >
          {items.map((item, idx) => {
            const isActive = activeIndex === idx;
            const fallbackSrc = getFailsafeImageUrl(item.src, item.title);

            return (
              <motion.div
                key={idx}
                onClick={(e) => handleCardClick(idx, e)}
                className="relative shrink-0 rounded-3xl overflow-hidden border cursor-pointer group transition-all duration-500 select-none"
                style={{
                  width: currentSlideSize,
                  height: currentSlideSize * 1.35,
                }}
                animate={{
                  // The diagonal movement effect: active card stands straight, other cards are tilted & shifted on Y axis
                  rotate: isActive ? -2 : (idx < activeIndex ? -6 : 4),
                  y: isActive ? -8 : (idx < activeIndex ? 10 : -4),
                  scale: isActive ? 1.04 : 0.9,
                  opacity: isActive ? 1 : 0.82,
                  borderColor: isActive ? "rgba(168, 85, 247, 0.4)" : "rgba(255, 255, 255, 0.05)",
                  boxShadow: isActive 
                    ? "0 20px 40px -15px rgba(168, 85, 247, 0.35), 0 0 15px -3px rgba(168, 85, 247, 0.1)" 
                    : "0 4px 20px -10px rgba(0, 0, 0, 0.5)",
                }}
                whileHover={{
                  scale: isActive ? 1.08 : 0.92,
                  borderColor: "rgba(168, 85, 247, 0.6)",
                }}
                transition={{
                  type: "spring",
                  stiffness: 150,
                  damping: 18,
                }}
              >
                {/* Background Artwork */}
                <div className="absolute inset-0 bg-neutral-900 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10 opacity-80" />
                  <img
                    src={item.src}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover filter transition-transform duration-700 ease-out group-hover:scale-105"
                    onError={(e) => {
                      // Apply our beautiful high-res Unsplash fallback on error
                      const target = e.target as HTMLImageElement;
                      if (target.src !== fallbackSrc) {
                        target.src = fallbackSrc;
                      }
                    }}
                  />
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 sm:p-6">
                  <span className="font-mono text-[9px] font-bold text-purple-400 uppercase tracking-widest mb-1 opacity-80">
                    Segment Node {idx + 1}
                  </span>
                  <h4 className="font-display font-extrabold text-lg text-white leading-tight uppercase group-hover:text-purple-300 transition-colors">
                    {item.title}
                  </h4>
                  {item.subtitle && (
                    <p className="font-sans text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.subtitle}
                    </p>
                  )}
                  
                  {/* Subtle Interactive Element */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-gray-400">
                      Explore Spec
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                </div>

                {/* Active Neon Border Stripe */}
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 z-30" />
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Footer statistics counter alignment placeholder */}
      <div className="relative z-10 max-w-7xl mx-auto w-full mt-6 pt-6 border-t border-white/5 flex flex-wrap justify-between items-center gap-4 text-gray-500 font-mono text-[9px] uppercase tracking-widest">
        <span>● Active Deployment Matrix</span>
        <span>Secure Protocol // Encrypted</span>
      </div>
    </div>
  );
}

const defaultDemoItems = [
  { src: "/images/city.jpg", title: "urban exploration" },
  { src: "/images/night.jpg", title: "night scene" },
  { src: "/images/flowers.jpg", title: "yellow wildflowers" },
  { src: "/images/fuji.jpg", title: "street with mount fuji" },
];

export function DiagonalCarouselDemo() {
  return (
    <DiagonalCarousel
      items={defaultDemoItems}
      defaultActiveIndex={2}
      slideSize={250}
      className="h-[560px] bg-[#ececec] text-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
    />
  );
}
