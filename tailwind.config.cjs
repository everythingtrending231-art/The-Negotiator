/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
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
        // Literal brand tokens — for identity-carrying surfaces (marks, hero
        // panels, status accents) where a semantic alias would obscure
        // which exact brand color is on screen. Semantic tokens above stay
        // the default for structural UI chrome (borders, inputs, cards).
        cobalt: {
          50: "#EEF2FB",
          100: "#D7E1F5",
          300: "#7594D2",
          500: "#2955C4",
          600: "#123FA9",
          700: "#0D2E7D",
          900: "#081D52",
        },
        amber: {
          50: "#FEF6E9",
          100: "#FCE7BE",
          300: "#F9C568",
          500: "#F5A623",
          600: "#D98A0F",
          700: "#A8690A",
        },
        cream: {
          DEFAULT: "#F7F5F0",
          200: "#FBFAF7",
          400: "#EFEBE1",
        },
        ink: {
          DEFAULT: "#0B1220",
          soft: "#333A4A",
          muted: "#5B6473",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Arial", "Helvetica", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      fontSize: {
        // A deliberate scale, not default Tailwind steps — wide gaps at the
        // top so a headline reads as a headline, tight control near body
        // text where density matters (case dashboard, negotiator UI).
        "display-lg": ["clamp(2.75rem, 3rem + 2vw, 4.5rem)", { lineHeight: "0.98", letterSpacing: "-0.02em" }],
        "display-md": ["clamp(2.25rem, 2rem + 2vw, 3.25rem)", { lineHeight: "1.02", letterSpacing: "-0.015em" }],
        "display-sm": ["clamp(1.75rem, 1.5rem + 1.2vw, 2.25rem)", { lineHeight: "1.08", letterSpacing: "-0.01em" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Distinct radii per surface weight — a panel, a pill, and a status
        // chip should not all share one rounding value.
        panel: "1.75rem",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,18,32,0.04), 0 8px 24px -12px rgba(11,18,32,0.12)",
        "card-lift": "0 4px 8px rgba(11,18,32,0.06), 0 16px 40px -12px rgba(18,63,169,0.22)",
        panel: "0 24px 60px -20px rgba(11,18,32,0.35)",
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
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(245,166,35,0.45)" },
          "70%": { boxShadow: "0 0 0 8px rgba(245,166,35,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(245,166,35,0)" },
        },
        "draw-line": {
          from: { strokeDashoffset: "1" },
          to: { strokeDashoffset: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.5s ease-out both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-ring": "pulse-ring 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      transitionTimingFunction: {
        confident: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
