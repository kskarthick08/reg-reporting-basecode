/**
 * Animation Utilities
 *
 * Shared animation configurations and utilities for smooth transitions.
 */

export const TRANSITIONS = {
  fast: 'all 0.15s ease-in-out',
  normal: 'all 0.3s ease-in-out',
  slow: 'all 0.5s ease-in-out',
  spring: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
} as const;

export const DURATIONS = {
  fast: 150,
  normal: 300,
  slow: 500
} as const;

export const EASINGS = {
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
} as const;

// Framer Motion variants
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const slideDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 }
};

export const slideLeft = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

export const slideRight = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

export const scale = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
};

export const scaleSpring = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 25 }
  },
  exit: { opacity: 0, scale: 0.8 }
};

export const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const listItem = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 }
};

// CSS classes for transitions
export const transitionClasses = {
  fade: 'transition-opacity duration-300 ease-in-out',
  all: 'transition-all duration-300 ease-in-out',
  transform: 'transition-transform duration-300 ease-in-out',
  colors: 'transition-colors duration-200 ease-in-out'
};

// Helper function for staggered animations
export function getStaggerDelay(index: number, baseDelay: number = 50): number {
  return index * baseDelay;
}

// Helper for spring animations
export const springConfig = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 25
};

export const softSpring = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 20
};

export const stiffSpring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30
};
