import { AnimatePresence, motion } from 'motion/react';
import type { Anchor } from '@reveal/shared';
import { TOKENS } from '../../lib/theme';

/**
 * Decorative "?" placed over the candidate's face (normalized focal point on the intro portrait).
 * `size` is the mark's width as a fraction of the portrait width (≈ head width + a halo).
 * aria-hidden: it is purely visual and never interferes with screen-reader navigation.
 */
export function MysteryQuestionMark({ visible, focal, size = 0.4, delay = 0.55 }: { visible: boolean; focal: Anchor; size?: number; delay?: number }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%`, width: `${size * 100}%` }}
          // The veil is present from the first frame (the face is never exposed); only the "?" glyph fades in after `delay`.
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.35, filter: 'blur(6px)', transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } }}
        >
          {/* Frosted veil that hides the face until the reveal */}
          <div className="absolute inset-[-14%] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.97),rgba(255,255,255,0.9)_62%,transparent)] backdrop-blur-[6px]" />
          <motion.svg
            viewBox="0 0 100 100"
            className="relative block w-full drop-shadow-[0_0_14px_rgba(46,137,187,0.35)]"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <defs>
              <linearGradient id="qm-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={TOKENS.brandBlue} />
                <stop offset="0.5" stopColor={TOKENS.secondary} />
                <stop offset="1" stopColor={TOKENS.brandGreen} />
              </linearGradient>
              <linearGradient id="qm-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={TOKENS.brandBlue} stopOpacity="0.9" />
                <stop offset="1" stopColor={TOKENS.brandGreen} stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill="none" stroke="url(#qm-ring)" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(22,43,37,0.12)" strokeWidth="0.75" strokeDasharray="2 4" />
            <text x="50" y="71" textAnchor="middle" fontFamily="Sora, Inter, sans-serif" fontWeight="800" fontSize="66" fill="url(#qm-grad)">
              ?
            </text>
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
