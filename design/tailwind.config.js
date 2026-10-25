/** @type {import('tailwindcss').Config} */
// GENERATED from tokens.json by _build/gen_tokens_v2.py. Values point at CSS custom properties in tokens.css,
// so import tokens.css once globally (before Tailwind's base layer) and theme switching via [data-theme] just works.
module.exports = {
  "content": [
    "./html/**/*.html"
  ],
  "darkMode": [
    "selector",
    "[data-theme=\"dark\"]"
  ],
  "theme": {
    "extend": {
      "colors": {
        "brand": {
          "50": "var(--brand-50)",
          "100": "var(--brand-100)",
          "200": "var(--brand-200)",
          "300": "var(--brand-300)",
          "400": "var(--brand-400)",
          "500": "var(--brand-500)",
          "600": "var(--brand-600)",
          "700": "var(--brand-700)",
          "800": "var(--brand-800)",
          "900": "var(--brand-900)",
          "950": "var(--brand-950)"
        },
        "neutral": {
          "0": "var(--neutral-0)",
          "50": "var(--neutral-50)",
          "100": "var(--neutral-100)",
          "150": "var(--neutral-150)",
          "200": "var(--neutral-200)",
          "300": "var(--neutral-300)",
          "400": "var(--neutral-400)",
          "500": "var(--neutral-500)",
          "600": "var(--neutral-600)",
          "700": "var(--neutral-700)",
          "800": "var(--neutral-800)",
          "850": "var(--neutral-850)",
          "900": "var(--neutral-900)",
          "950": "var(--neutral-950)"
        },
        "red": {
          "50": "var(--red-50)",
          "100": "var(--red-100)",
          "200": "var(--red-200)",
          "300": "var(--red-300)",
          "400": "var(--red-400)",
          "500": "var(--red-500)",
          "600": "var(--red-600)",
          "700": "var(--red-700)",
          "800": "var(--red-800)",
          "900": "var(--red-900)"
        },
        "amber": {
          "50": "var(--amber-50)",
          "100": "var(--amber-100)",
          "200": "var(--amber-200)",
          "300": "var(--amber-300)",
          "400": "var(--amber-400)",
          "500": "var(--amber-500)",
          "600": "var(--amber-600)",
          "700": "var(--amber-700)",
          "800": "var(--amber-800)",
          "900": "var(--amber-900)"
        },
        "green": {
          "50": "var(--green-50)",
          "100": "var(--green-100)",
          "200": "var(--green-200)",
          "300": "var(--green-300)",
          "400": "var(--green-400)",
          "500": "var(--green-500)",
          "600": "var(--green-600)",
          "700": "var(--green-700)",
          "800": "var(--green-800)",
          "900": "var(--green-900)"
        },
        "tool": {
          "nemotron": "var(--tool-nemotron)",
          "nemotron-ink": "var(--tool-nemotron-ink)",
          "tavily": "var(--tool-tavily)",
          "tavily-ink": "var(--tool-tavily-ink)"
        },
        "bg": "var(--color-bg)",
        "surface": "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        "surface-sunken": "var(--color-surface-sunken)",
        "surface-inverse": "var(--color-surface-inverse)",
        "border": "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        "text": "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        "text-subtle": "var(--color-text-subtle)",
        "text-inverse": "var(--color-text-inverse)",
        "text-on-inverse-muted": "var(--color-text-on-inverse-muted)",
        "primary": "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        "primary-pressed": "var(--color-primary-pressed)",
        "on-primary": "var(--color-on-primary)",
        "primary-soft": "var(--color-primary-soft)",
        "on-primary-soft": "var(--color-on-primary-soft)",
        "accent": "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",
        "on-accent": "var(--color-on-accent)",
        "accent-soft": "var(--color-accent-soft)",
        "on-accent-soft": "var(--color-on-accent-soft)",
        "link": "var(--color-link)",
        "focus": "var(--color-focus)",
        "scam-bg": "var(--color-scam-bg)",
        "scam-fg": "var(--color-scam-fg)",
        "scam-border": "var(--color-scam-border)",
        "scam-solid": "var(--color-scam-solid)",
        "on-scam-solid": "var(--color-on-scam-solid)",
        "suspicious-bg": "var(--color-suspicious-bg)",
        "suspicious-fg": "var(--color-suspicious-fg)",
        "suspicious-border": "var(--color-suspicious-border)",
        "suspicious-solid": "var(--color-suspicious-solid)",
        "on-suspicious-solid": "var(--color-on-suspicious-solid)",
        "ok-bg": "var(--color-ok-bg)",
        "ok-fg": "var(--color-ok-fg)",
        "ok-border": "var(--color-ok-border)",
        "ok-solid": "var(--color-ok-solid)",
        "on-ok-solid": "var(--color-on-ok-solid)",
        "info-bg": "var(--color-info-bg)",
        "info-fg": "var(--color-info-fg)",
        "info-border": "var(--color-info-border)",
        "tool-nemotron": "var(--color-tool-nemotron)",
        "tool-nemotron-ink": "var(--color-tool-nemotron-ink)",
        "tool-tavily": "var(--color-tool-tavily)",
        "tool-tavily-ink": "var(--color-tool-tavily-ink)"
      },
      "fontFamily": {
        "display": [
          "var(--font-display)"
        ],
        "body": [
          "var(--font-body)"
        ],
        "mono": [
          "var(--font-mono)"
        ]
      },
      "fontSize": {
        "verdict": [
          "var(--text-verdict-size)",
          {
            "lineHeight": "var(--text-verdict-line)",
            "fontWeight": "var(--text-verdict-weight)",
            "letterSpacing": "var(--text-verdict-tracking)"
          }
        ],
        "display": [
          "var(--text-display-size)",
          {
            "lineHeight": "var(--text-display-line)",
            "fontWeight": "var(--text-display-weight)",
            "letterSpacing": "var(--text-display-tracking)"
          }
        ],
        "h1": [
          "var(--text-h1-size)",
          {
            "lineHeight": "var(--text-h1-line)",
            "fontWeight": "var(--text-h1-weight)",
            "letterSpacing": "var(--text-h1-tracking)"
          }
        ],
        "h2": [
          "var(--text-h2-size)",
          {
            "lineHeight": "var(--text-h2-line)",
            "fontWeight": "var(--text-h2-weight)",
            "letterSpacing": "var(--text-h2-tracking)"
          }
        ],
        "h3": [
          "var(--text-h3-size)",
          {
            "lineHeight": "var(--text-h3-line)",
            "fontWeight": "var(--text-h3-weight)",
            "letterSpacing": "var(--text-h3-tracking)"
          }
        ],
        "body-lg": [
          "var(--text-body-lg-size)",
          {
            "lineHeight": "var(--text-body-lg-line)",
            "fontWeight": "var(--text-body-lg-weight)",
            "letterSpacing": "var(--text-body-lg-tracking)"
          }
        ],
        "body": [
          "var(--text-body-size)",
          {
            "lineHeight": "var(--text-body-line)",
            "fontWeight": "var(--text-body-weight)",
            "letterSpacing": "var(--text-body-tracking)"
          }
        ],
        "label": [
          "var(--text-label-size)",
          {
            "lineHeight": "var(--text-label-line)",
            "fontWeight": "var(--text-label-weight)",
            "letterSpacing": "var(--text-label-tracking)"
          }
        ],
        "small": [
          "var(--text-small-size)",
          {
            "lineHeight": "var(--text-small-line)",
            "fontWeight": "var(--text-small-weight)",
            "letterSpacing": "var(--text-small-tracking)"
          }
        ],
        "overline": [
          "var(--text-overline-size)",
          {
            "lineHeight": "var(--text-overline-line)",
            "fontWeight": "var(--text-overline-weight)",
            "letterSpacing": "var(--text-overline-tracking)"
          }
        ],
        "mono": [
          "var(--text-mono-size)",
          {
            "lineHeight": "var(--text-mono-line)",
            "fontWeight": "var(--text-mono-weight)",
            "letterSpacing": "var(--text-mono-tracking)"
          }
        ]
      },
      "spacing": {
        "0": "var(--space-0)",
        "0.5": "var(--space-0_5)",
        "1": "var(--space-1)",
        "1.5": "var(--space-1_5)",
        "2": "var(--space-2)",
        "3": "var(--space-3)",
        "4": "var(--space-4)",
        "5": "var(--space-5)",
        "6": "var(--space-6)",
        "7": "var(--space-7)",
        "8": "var(--space-8)",
        "10": "var(--space-10)",
        "12": "var(--space-12)",
        "14": "var(--space-14)",
        "16": "var(--space-16)",
        "20": "var(--space-20)",
        "24": "var(--space-24)",
        "tap": "var(--size-tap-min)",
        "tap-comfy": "var(--size-tap-comfy)",
        "tap-hero": "var(--size-tap-hero)"
      },
      "minHeight": {
        "tap": "var(--size-tap-min)",
        "tap-comfy": "var(--size-tap-comfy)",
        "tap-hero": "var(--size-tap-hero)"
      },
      "minWidth": {
        "tap": "var(--size-tap-min)"
      },
      "maxWidth": {
        "screen-app": "var(--size-screen-max)",
        "content": "var(--size-content-max)"
      },
      "borderRadius": {
        "xs": "var(--radius-xs)",
        "sm": "var(--radius-sm)",
        "md": "var(--radius-md)",
        "lg": "var(--radius-lg)",
        "xl": "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "pill": "var(--radius-pill)"
      },
      "boxShadow": {
        "xs": "var(--shadow-xs)",
        "sm": "var(--shadow-sm)",
        "md": "var(--shadow-md)",
        "lg": "var(--shadow-lg)",
        "inset": "var(--shadow-inset)",
        "focus": "var(--focus-ring)"
      },
      "transitionDuration": {
        "instant": "var(--duration-instant)",
        "fast": "var(--duration-fast)",
        "base": "var(--duration-base)",
        "slow": "var(--duration-slow)",
        "step": "var(--duration-step)",
        "pulse": "var(--duration-pulse)"
      },
      "transitionTimingFunction": {
        "standard": "var(--ease-standard)",
        "enter": "var(--ease-enter)",
        "exit": "var(--ease-exit)",
        "spring": "var(--ease-spring)"
      }
    }
  },
  "plugins": []
};
