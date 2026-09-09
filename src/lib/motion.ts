export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const POPOVER_MOTION = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
  transition: { duration: 0.2, ease: EASE_OUT },
} as const;
