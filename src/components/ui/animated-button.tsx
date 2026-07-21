import React, { forwardRef } from "react";
import { motion, HTMLMotionProps } from "motion/react";

export interface AnimatedButtonProps extends HTMLMotionProps<"button"> {
  children?: React.ReactNode;
}

const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ children, whileHover, whileTap, transition, className, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={whileHover || { scale: 1.02, y: -1 }}
        whileTap={whileTap || { scale: 0.98, y: 1 }}
        transition={
          transition || {
            type: "spring",
            stiffness: 450,
            damping: 15,
          }
        }
        // Retain cursor-pointer as a default helper if hover class transitions are active
        className={`${className || ""} cursor-pointer`}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

export default AnimatedButton;
