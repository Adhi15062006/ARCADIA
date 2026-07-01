import React from "react";
import { motion } from "motion/react";

interface LogoItem {
  src: string;
  alt: string;
}

interface StackedLogosProps {
  logos: LogoItem[];
}

export function StackedLogos({ logos }: StackedLogosProps) {
  // Use user-provided logos or fall back to preset premium partners
  const displayLogos = logos && logos.length > 0 ? logos : [
    { src: "", alt: "ZENIX CO." },
    { src: "", alt: "AURA LABS" },
    { src: "", alt: "NEXUS SAAS" },
    { src: "", alt: "SOLARIS" },
    { src: "", alt: "OCTA SEC" }
  ];

  return (
    <div className="w-full flex flex-col items-center justify-center py-6">
      <div className="flex items-center justify-center -space-x-4 sm:-space-x-6 hover:-space-x-1 sm:hover:space-x-2 transition-all duration-500 ease-out py-4">
        {displayLogos.map((logo, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.85, x: -10 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: true }}
            whileHover={{ 
              scale: 1.15, 
              zIndex: 50,
              borderColor: "rgba(6, 182, 212, 0.4)",
              backgroundColor: "rgba(255, 255, 255, 0.04)"
            }}
            transition={{ type: "spring", stiffness: 280, damping: 18 }}
            className="relative w-24 sm:w-28 h-14 sm:h-16 rounded-[16px] bg-arcadia-dark/95 border border-white/5 flex items-center justify-center p-3 cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl group"
            style={{ zIndex: 10 + idx }}
          >
            {logo.src ? (
              <img
                src={logo.src}
                alt={logo.alt}
                referrerPolicy="no-referrer"
                className="max-h-7 sm:max-h-8 max-w-full object-contain filter invert opacity-60 group-hover:opacity-100 transition-all duration-300"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                  const fallback = (e.target as HTMLElement).nextElementSibling;
                  if (fallback) {
                    fallback.classList.remove("hidden");
                  }
                }}
              />
            ) : null}
            <div className={`font-mono text-[9px] sm:text-[10px] font-black tracking-widest text-gray-500 group-hover:text-arcadia-cyan text-center ${logo.src ? 'hidden' : ''}`}>
              {logo.alt}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
