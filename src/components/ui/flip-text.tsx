import React from "react";
import { motion } from "motion/react";

interface FlipTextProps {
  children: string;
  className?: string;
  id?: string;
}

export function FlipText({ children, className = "", id }: FlipTextProps) {
  return (
    <span 
      id={id}
      className={`relative inline-block overflow-hidden whitespace-nowrap cursor-pointer ${className}`}
    >
      <motion.span
        initial="initial"
        whileHover="hover"
        className="relative inline-block whitespace-nowrap"
      >
        <span className="inline-block whitespace-nowrap">
          {children.split("").map((char, i) => (
            <motion.span
              key={i}
              variants={{
                initial: { y: 0 },
                hover: { y: "-100%" },
              }}
              transition={{
                duration: 0.3,
                ease: [0.215, 0.61, 0.355, 1],
                delay: i * 0.015,
              }}
              className="inline-block"
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </span>
        <span className="absolute inset-0 inline-block whitespace-nowrap">
          {children.split("").map((char, i) => (
            <motion.span
              key={i}
              variants={{
                initial: { y: "100%" },
                hover: { y: 0 },
              }}
              transition={{
                duration: 0.3,
                ease: [0.215, 0.61, 0.355, 1],
                delay: i * 0.015,
              }}
              className="inline-block text-arcadia-cyan"
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </span>
      </motion.span>
    </span>
  );
}
