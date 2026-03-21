import { useState, useCallback } from 'react';

export type ColorCategory = 'Audience' | 'Nature' | 'Traffic' | 'Arcade' | 'Sports' | 'Custom';

export interface SoundPadProps {
  /** Display name shown on the pad */
  name: string;
  /** 1-based index within the panel, shown as zero-padded label */
  index: number;
  /** Color category controls the gradient background */
  colorCategory: ColorCategory;
  /** Whether this pad is currently playing */
  isPlaying: boolean;
  /** Called when the pad is pressed */
  onPress: () => void;
  /** Whether the pad is disabled (e.g. during library loading) */
  disabled?: boolean;
}

/** Map ColorCategory → Tailwind gradient class from the design system */
const CATEGORY_CLASS: Record<ColorCategory, string> = {
  Audience: 'pad-audience',
  Nature:   'pad-nature',
  Traffic:  'pad-traffic',
  Arcade:   'pad-arcade',
  Sports:   'pad-sports',
  Custom:   'pad-custom',
};

/**
 * Per-category playing-state CSS class.
 * Each class encodes the fixed-dim border color for that category so that
 * no inline styles are needed (CSP style-src requires no 'unsafe-inline').
 * Defined in global.css.
 */
const CATEGORY_PLAYING_CLASS: Record<ColorCategory, string> = {
  Audience: 'pad-audience-playing',
  Nature:   'pad-nature-playing',
  Traffic:  'pad-traffic-playing',
  Arcade:   'pad-arcade-playing',
  Sports:   'pad-sports-playing',
  Custom:   'pad-custom-playing',
};

/**
 * Per-category text color class (WCAG AA compliance).
 * Bright pad gradients require dark `on-*` tokens; dark pads use on-surface.
 * See tailwind.config.js for token values.
 */
const CATEGORY_TEXT_CLASS: Record<ColorCategory, string> = {
  Audience: 'text-primary-on',    // #5c1900 on #ff8f6f → #ff7851  ≈ 5.2:1 / 6.8:1 ✓ AA
  Nature:   'text-secondary-on',  // #003a02 on #91f78e → #74d972  ≈ 8.1:1 / 9.8:1 ✓ AA
  Traffic:  'text-tertiary-on',   // #003059 on #44a5ff → #2498f5  ≈ 5.8:1 / 7.1:1 ✓ AA
  Arcade:   'text-error-on',      // #280000 on #ff716c → #e05050  ≈ 7.2:1 / 5.0:1 ✓ AA
  Sports:   'text-on-surface',    // #e6e1e5 on #20201f           ≈ 12.0:1 ✓ AA
  Custom:   'text-on-surface',    // #e6e1e5 on #20201f           ≈ 12.0:1 ✓ AA
};

/**
 * SoundPad — the hero component of the Soundblart design system.
 *
 * Design spec (from DESIGN.md + research.md):
 * - Resting: inner shadow top-left (10% white) + ambient outer shadow (12% pad color)
 * - Pressed: removed outer shadow, stronger inner shadow (25%)
 * - Playing: 2px solid fixed-dim border per category + inset white glow + stop icon visible
 * - Press animation: scale to 0.96x on active (120ms ease-in-out)
 * - Pad sublabel at 80%+ opacity (WCAG AA — see `pad-sublabel` CSS class)
 * - Accessible: button role, focus-visible outline, keyboard-activatable
 * - Play icon visible at 10–15% opacity at rest on desktop (see `pad-icon` CSS class)
 * - All state transitions are CSS-class-driven (no inline styles) to comply with CSP.
 */
export function SoundPad({
  name,
  index,
  colorCategory,
  isPlaying,
  onPress,
  disabled = false,
}: SoundPadProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePointerDown = useCallback(() => {
    if (!disabled) setIsPressed(true);
  }, [disabled]);

  const handlePointerUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsPressed(false);
  }, []);

  const paddedIndex = String(index).padStart(2, '0');

  return (
    <button
      type="button"
      onClick={onPress}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      disabled={disabled}
      aria-label={`${name} — sound pad ${paddedIndex}${isPlaying ? ', playing' : ''}`}
      aria-pressed={isPlaying}
      data-playing={isPlaying}
      data-pressed={isPressed}
      className={[
        // Base layout + neumorphic shadow/transition via .sound-pad CSS class
        'sound-pad',
        'relative flex flex-col justify-between',
        'rounded-pad p-[1.4rem]',
        'min-h-[100px] w-full',
        // Background gradient per category
        CATEGORY_CLASS[colorCategory],
        // Playing state border (per-category fixed-dim color, defined in CSS)
        isPlaying ? CATEGORY_PLAYING_CLASS[colorCategory] : '',
        // Interaction states
        'cursor-pointer select-none',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:brightness-110',
        // Focus ring handled by global :focus-visible in global.css
      ].join(' ')}
    >
      {/* Index number — top left: 82% opacity via .pad-sublabel (≥80% WCAG) */}
      <span
        className={`pad-sublabel font-body text-label-sm ${CATEGORY_TEXT_CLASS[colorCategory]}`}
        aria-hidden="true"
      >
        {paddedIndex}
      </span>

      {/* Sound name — bottom left: font-body per spec (Space Grotesk reserved for headlines) */}
      <span className={`font-body text-label-lg leading-tight text-left mt-auto ${CATEGORY_TEXT_CLASS[colorCategory]}`}>
        {name}
      </span>

      {/* Play/Stop icon — top right */}
      {/* Opacity controlled by .pad-icon + [data-playing] CSS (10–15% rest, 100% playing) */}
      <span
        className="pad-icon absolute top-3 right-3 transition-opacity duration-150"
        aria-hidden="true"
      >
        {isPlaying ? <StopIcon /> : <PlayIcon />}
      </span>
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 2.5l10 5.5-10 5.5V2.5z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="3" width="10" height="10" rx="1" />
    </svg>
  );
}
