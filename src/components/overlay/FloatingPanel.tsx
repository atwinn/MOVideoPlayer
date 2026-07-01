import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

export function FloatingPanel({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="absolute bottom-full left-1/2 mb-3 min-w-[220px] -translate-x-1/2 rounded-glass border border-glass-border bg-glass-tint p-3 text-white shadow-2xl backdrop-blur-glass"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
