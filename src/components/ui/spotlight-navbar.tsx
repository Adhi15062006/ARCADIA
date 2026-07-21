import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

interface NavItem {
  label: string;
  href: string;
  onClick?: () => void;
  isActive?: boolean;
}

interface SpotlightNavbarProps {
  items: NavItem[];
}

export function SpotlightNavbar({ items }: SpotlightNavbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 200 };
  const spotlightX = useSpring(mouseX, springConfig);
  const spotlightY = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, top } = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex items-center rounded-full bg-white/[0.02] border border-white/10 p-1 backdrop-blur-xl overflow-hidden group/nav"
    >
      {/* Background Spotlight Radial Glow */}
      <motion.div
        className="absolute w-24 h-24 rounded-full bg-arcadia-cyan/15 blur-xl pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{
          left: spotlightX,
          top: spotlightY,
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
      />

      <nav className="relative flex items-center gap-1 z-10">
        {items.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (item.onClick) {
                item.onClick();
              } else if (item.href && item.href.startsWith("#")) {
                const element = document.getElementById(item.href.substring(1));
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }
            }}
            className={`relative px-4 py-2 rounded-full font-display text-[11px] sm:text-xs font-semibold tracking-wide transition-all duration-300 ${
              item.isActive
                ? "text-white font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span className="relative z-10">{item.label}</span>
            {item.isActive && (
              <motion.span
                layoutId="activeSpotlightBackground"
                className="absolute inset-0 rounded-full border bg-white/5 border-white/10"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
