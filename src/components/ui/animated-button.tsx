import React, { forwardRef } from "react";
import { motion, HTMLMotionProps } from "motion/react";

export interface AnimatedButtonProps extends HTMLMotionProps<"button"> {
  children?: React.ReactNode;
}

const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ children, whileHover, whileTap, transition, className, ...props }, ref) => {
    const isDisabled = props.disabled;
    return (
      <motion.button
        ref={ref}
        whileHover={isDisabled ? undefined : (whileHover || { scale: 1.02, y: -1 })}
        whileTap={isDisabled ? undefined : (whileTap || { scale: 0.98, y: 1 })}
        transition={
          transition || {
            type: "spring",
            stiffness: 450,
            damping: 15,
          }
        }
        className={`${className || ""} ${isDisabled ? "" : "cursor-pointer"}`}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

export default AnimatedButton;
