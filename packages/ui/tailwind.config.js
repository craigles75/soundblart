/** @type {import('tailwindcss').Config} */

// Soundblart — Neon Neumorphic Design System
// Single source of truth for all design tokens.
// Imported by apps/desktop and apps/website.

export default {
  content: [],  // Overridden by each consuming app's tailwind.config.js (apps/desktop, apps/website)
  darkMode: 'class',
  theme: {
    extend: {
      // ─── Color Palette ──────────────────────────────────────────────────────
      colors: {
        // Base surfaces (no pure black — kills depth)
        surface: {
          DEFAULT:   '#0e0e0e',   // Global background void
          lowest:    '#090909',   // Deepest recessed areas (scrollback, sidebars-on-sidebar)
          low:       '#131313',   // Secondary content areas
          container: '#1a1a1a',   // Primary containers / pad backgrounds
          high:      '#20201f',   // Elevated cards, surface-container-high
          highest:   '#2a2a29',   // Chips, highest-elevation surfaces
          variant:   '#262626',   // Glass / frosted components
          tint:      '#ff8f6f',   // Ambient shadow base (primary color)
        },

        // Outline / border (ghost only — never 1px solid)
        outline: {
          DEFAULT: '#484847',     // Ghost border at 15% opacity max
          variant: '#484847',
        },

        // On-surface text
        'on-surface': {
          DEFAULT: '#e6e1e5',     // Primary text
          variant: '#adaaaa',     // Secondary text, inactive nav (WCAG AA 5.1:1)
        },

        // Primary — Audience / Impact (orange)
        primary: {
          DEFAULT:   '#ff8f6f',
          dim:       '#ff7851',   // Gradient end / container
          fixed:     '#ffdbd1',   // Light fixed variant
          'fixed-dim': '#ffb5a0', // Fixed dim variant (pad sublabel)
          on:        '#5c1900',   // Text on primary
          container: '#ff7851',
          'on-container': '#3a0c00',
        },

        // Secondary — Nature / Ambient (green)
        secondary: {
          DEFAULT:   '#91f78e',
          dim:       '#74d972',
          fixed:     '#c0ffc0',
          'fixed-dim': '#91f78e',
          on:        '#003a02',
          container: '#006e1c',
          'on-container': '#002204',
        },

        // Tertiary — Traffic / Urban (blue)
        tertiary: {
          DEFAULT:   '#44a5ff',
          dim:       '#2498f5',
          fixed:     '#cfe5ff',
          'fixed-dim': '#96cbff',
          on:        '#003059',
          container: '#2498f5',
          'on-container': '#001e3c',
        },

        // Error — Arcade / Game (red)
        // Note: error.on is dark (#280000) because the Soundblart error color (#ff716c)
        // is a bright mid-luminance red — white text only achieves 2.68:1 (WCAG AA fail).
        // Contrast check: #280000 on #ff716c = 7.18:1, on #e05050 = 4.98:1 (both WCAG AA ✓).
        error: {
          DEFAULT:   '#ff716c',
          dim:       '#e05050',
          fixed:     '#ffdad6',   // Light fixed variant
          'fixed-dim': '#ffb4ae', // Fixed dim variant (playing state border)
          container: '#9f0519',
          on:        '#280000',   // Dark text on Arcade pad (WCAG AA ✓ on both gradient ends)
          'on-container': '#ffdad6',
        },

        // Sports / neutral (no distinct brand color — uses surface-container-high)
        sports: '#20201f',
      },

      // ─── Typography ──────────────────────────────────────────────────────────
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['2.25rem',  { lineHeight: '2.75rem', fontWeight: '700',  letterSpacing: '-0.02em' }],
        'display-md': ['1.75rem',  { lineHeight: '2.25rem', fontWeight: '700',  letterSpacing: '-0.015em' }],
        'headline-lg':['1.5rem',   { lineHeight: '2rem',    fontWeight: '600' }],
        'headline-md':['1.25rem',  { lineHeight: '1.75rem', fontWeight: '600' }],
        'title-lg':   ['1.125rem', { lineHeight: '1.5rem',  fontWeight: '500' }],
        'title-md':   ['1rem',     { lineHeight: '1.5rem',  fontWeight: '500' }],
        'body-lg':    ['1rem',     { lineHeight: '1.5rem',  fontWeight: '400' }],
        'body-md':    ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'label-lg':   ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        'label-md':   ['0.75rem',  { lineHeight: '1rem',    fontWeight: '500' }],
        'label-sm':   ['0.6875rem',{ lineHeight: '1rem',    fontWeight: '500' }],
      },

      // ─── Border Radius ────────────────────────────────────────────────────────
      borderRadius: {
        'pad':   '2rem',    // Sound pad outer container
        'card':  '1.25rem', // Library cards, settings containers
        'chip':  '999px',   // Action chips (fully pill)
        'modal': '1.5rem',  // Modals / overlays
      },

      // ─── Spacing ──────────────────────────────────────────────────────────────
      spacing: {
        'pad-inner': '1.4rem',  // Sound pad internal padding (spacing-4)
      },

      // ─── Box Shadows (Neumorphic) ─────────────────────────────────────────────
      boxShadow: {
        // Sound pad — resting state
        'pad-rest': [
          'inset 2px 2px 4px rgba(255,255,255,0.10)',   // Top-left inner light
          '4px 4px 12px rgba(255,143,111,0.12)',          // Ambient shadow (primary color 12%)
        ].join(', '),

        // Sound pad — pressed / active state
        'pad-pressed': [
          'inset 3px 3px 8px rgba(255,255,255,0.25)',   // Stronger inner shadow (pushed in)
          'inset -1px -1px 4px rgba(0,0,0,0.40)',
        ].join(', '),

        // Playing state shadows are per-category CSS classes (pad-*-playing)
        // in global.css — no Tailwind token needed here.

        // Glass component (volume bar, modals)
        'glass': '0 8px 32px rgba(255,143,111,0.06)',

        // Ambient modal shadow
        'modal': '0 16px 48px rgba(255,143,111,0.06)',
      },

      // ─── Backdrop Blur ────────────────────────────────────────────────────────
      backdropBlur: {
        'glass': '12px',
        'modal': '20px',
      },

      // ─── Animations ───────────────────────────────────────────────────────────
      keyframes: {
        // NOTE: pad press animation is handled via CSS data-attribute transitions
        // (.sound-pad[data-pressed]) in global.css, not via a keyframe animation.
        'live-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        'spin-slow': {
          'from': { transform: 'rotate(0deg)' },
          'to':   { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'live-pulse': 'live-pulse 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 2s linear infinite',
      },
      transitionDuration: {
        'image': '700ms',
      },

      // ─── Max Width ────────────────────────────────────────────────────────────
      maxWidth: {
        'screen-desktop': '1280px',   // max-w-7xl alias (all screens)
      },
    },
  },
  plugins: [],
};
