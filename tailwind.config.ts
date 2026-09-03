import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "hsl(var(--primary-light))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          // Education's global-chrome sidebar pill: the sidebar entry renders
          // OUTSIDE `.education-shell`, so it can't read the scoped --edu-*
          // tokens — these are separate, unscoped tokens with the exact same
          // HSL values as education-theme.css's container/on-container pair.
          "accent-education": "hsl(var(--sidebar-accent-education))",
          "accent-education-foreground": "hsl(var(--sidebar-accent-education-foreground))",
        },
        // Material Design 3 tonal surfaces (theme-aware via CSS vars).
        surface: {
          DEFAULT: "hsl(var(--surface))",
          white: "hsl(var(--surface-white))",
          container: "hsl(var(--surface-container))",
          "container-high": "hsl(var(--surface-container-high))",
          variant: "hsl(var(--surface-variant))",
        },
        // Flat (no DEFAULT) para no generar una clase `outline` que colisione
        // con la utility de outline-style de Tailwind core.
        outline: "hsl(var(--outline))",
        "outline-variant": "hsl(var(--outline-variant))",
        "divider-soft": "hsl(var(--divider-soft))",
        "map-bg": "hsl(var(--map-bg))",
        "primary-container": "hsl(var(--primary-container))",
        "on-primary-container": "hsl(var(--on-primary-container))",
        "secondary-container": "hsl(var(--secondary-container))",
        "on-secondary-container": "hsl(var(--on-secondary-container))",
        "nav-bg": "hsl(var(--nav-bg))",
        "md-success": "hsl(var(--success))",
        // Educación — green MD3 sub-brand (scoped under `.education-shell` in
        // education-theme.css). See sdd/education-module/design part 1.
        "edu-primary": "hsl(var(--edu-primary))",
        "edu-primary-dark": "hsl(var(--edu-primary-dark))",
        "edu-primary-light": "hsl(var(--edu-primary-light))",
        "edu-container": "hsl(var(--edu-container))",
        "on-edu-container": "hsl(var(--on-edu-container))",
        "edu-surface": "hsl(var(--edu-surface))",
        "edu-surface-alt": "hsl(var(--edu-surface-alt))",
        "edu-outline": "hsl(var(--edu-outline))",
        "edu-text": "hsl(var(--edu-text))",
        "edu-text-soft": "hsl(var(--edu-text-soft))",
        "edu-track": "hsl(var(--edu-track))",
        "edu-progress-mid": "hsl(var(--edu-progress-mid))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // MD3 shape scale.
        md3: "16px",
        "md3-lg": "22px",
        "md3-xl": "26px",
        // Educación shape additions (design part 1, Section 4).
        "md3-sm": "14px",
        "md3-option": "18px",
        "md3-block": "20px",
      },
      fontFamily: {
        sans: ["Roboto", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        // MD3: pulso del punto "EN VIVO" (badge del mapa) — handoff.
        "live-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(34,197,94,.5)" },
          "70%": { boxShadow: "0 0 0 7px rgba(34,197,94,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(34,197,94,0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
        "live-pulse": "live-pulse 2s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
