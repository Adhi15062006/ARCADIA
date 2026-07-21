import React, { useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AnimatedButton from "./animated-button";

interface ImageItem {
  src: string;
  alt: string;
  title?: string;
  description?: string;
}

interface CylinderCarouselProps {
  images: ImageItem[];
  onCardClick?: (index: number) => void;
}

export function CylinderCarousel({ images, onCardClick }: CylinderCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative w-full py-8 flex flex-col items-center justify-center overflow-hidden">
      {/* 3D Scene Wrapper */}
      <div className="relative w-[320px] h-[400px] [perspective:1200px] flex items-center justify-center">
        {/* Carousel Cylinder */}
        <div className="relative w-full h-full [transform-style:preserve-3d] flex items-center justify-center">
          {images.map((img, i) => {
            const count = images.length;
            const angleStep = 360 / count;
            const relativeIndex = (i - activeIndex + count) % count;
            let targetAngle = relativeIndex * angleStep;
            if (targetAngle > 180) {
              targetAngle -= 360;
            }

            const isCenter = relativeIndex === 0;
            const isVisible = Math.abs(targetAngle) <= 120; // Show forward-facing elements

            return (
              <motion.div
                key={i}
                className="absolute w-[240px] h-[320px] rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.65)] cursor-pointer bg-arcadia-dark"
                style={{
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                }}
                animate={{
                  transform: `rotateY(${targetAngle}deg) translateZ(240px)`,
                  opacity: isVisible ? (isCenter ? 1 : 0.4) : 0,
                  scale: isCenter ? 1.05 : 0.85,
                  zIndex: isCenter ? 20 : 10 - Math.abs(relativeIndex),
                }}
                transition={{
                  type: "spring",
                  stiffness: 140,
                  damping: 18,
                }}
                onClick={() => {
                  if (isCenter && onCardClick) {
                    onCardClick(i);
                  } else {
                    setActiveIndex(i);
                  }
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 z-10" />
                <img
                  src={img.src}
                  alt={img.alt}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
                
                {/* Details card content */}
                <div className="absolute bottom-4 left-4 right-4 z-20 text-left">
                  <span className="px-2 py-0.5 rounded bg-arcadia-cyan/20 border border-arcadia-cyan/30 text-arcadia-cyan text-[8px] font-bold uppercase tracking-widest font-display">
                    {img.alt || "Portfolio Item"}
                  </span>
                  <h4 className="font-display font-black text-sm text-white drop-shadow mt-1">
                    {img.title || `Masterpiece ${i + 1}`}
                  </h4>
                  {img.description && (
                    <p className="font-sans text-[10px] text-gray-400 line-clamp-2 mt-1">
                      {img.description}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Carousel Dots & Arrows Navigation Controls */}
      <div className="flex items-center gap-4 mt-6 z-30">
        <AnimatedButton
          onClick={handlePrev}
          className="p-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </AnimatedButton>
        <span className="font-mono text-xs text-gray-500">
          {activeIndex + 1} <span className="text-gray-700">/</span> {images.length}
        </span>
        <AnimatedButton
          onClick={handleNext}
          className="p-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </AnimatedButton>
      </div>
    </div>
  );
}
