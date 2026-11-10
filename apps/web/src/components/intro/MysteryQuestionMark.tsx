import { AnimatePresence, motion } from 'motion/react';
import type { Anchor } from '@reveal/shared';

/**
 * Decorative "?" placed over the candidate's face (normalized focal point).
 * aria-hidden: it is purely visual and never interferes with screen-reader navigation.
 */
export function MysteryQuestionMark({ visible, focal }: { visible: boolean; focal: Anchor }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%`, width: '58%' }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1, transition: { delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
          exit={{ opacity: 0, scale: 1.35, filter: 'blur(6px)', transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } }}
        >
          {/* Veil that obscures the face until the reveal */}
          <div className="absolute inset-[-12%] rounded-full bg-[radial-gradient(closest-side,rgba(7,17,31,0.92),rgba(7,17,31,0.75)_60%,transparent)]" />
          <svg viewBox="0 0 100 100" className="pulse-soft relative block w-full drop-shadow-[0_0_24px_rgba(78,200,255,0.55)]">
            <defs>
              <linearGradient id="qm-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#9BE3FF" />
                <stop offset="1" stopColor="#258BFF" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(78,200,255,0.35)" strokeWidth="1" />
            <text x="50" y="72" textAnchor="middle" fontFamily="Sora, Inter, sans-serif" fontWeight="800" fontSize="70" fill="url(#qm-grad)">
              ?
            </text>
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
