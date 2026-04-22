/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    container: { center: true, padding: "2rem" },
    extend: {
      colors: {
        background: "#0F1117",
        surface: "#1A1D27",
        card: "#252836",
        border: "#2E3141",
        accent: "#4F8EF7",
        "accent-hover": "#3a7de8",
        "text-primary": "#E8EAED",
        "text-muted": "#9AA0AC",
        success: "#4CAF82",
        warning: "#F0A500",
        danger: "#E05C5C",
        // shadcn compat
        primary: { DEFAULT: "#4F8EF7", foreground: "#ffffff" },
        secondary: { DEFAULT: "#1A1D27", foreground: "#E8EAED" },
        muted: { DEFAULT: "#252836", foreground: "#9AA0AC" },
        destructive: { DEFAULT: "#E05C5C", foreground: "#ffffff" },
        popover: { DEFAULT: "#1A1D27", foreground: "#E8EAED" },
        input: "#2E3141",
        ring: "#4F8EF7",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": { from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        "slide-in": { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
