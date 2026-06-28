import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "#FFF0F5",
          "pink-accent": "#FFD1DC",
          charcoal: "#1A1A1A",
          muted: "#6B7280",
        },
      },
      fontFamily: {
        script: ["var(--font-great-vibes)", "cursive"],
        display: ["var(--font-playfair)", "serif"],
        sans: ["var(--font-montserrat)", "sans-serif"],
      },
      letterSpacing: {
        luxe: "0.35em",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0,0,0,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
