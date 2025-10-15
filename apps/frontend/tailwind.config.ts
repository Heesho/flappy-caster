import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        pixel: ["VT323", "monospace"]
      },
      colors: {
        brand: {
          500: "#d946ef",
          600: "#c026d3",
          700: "#a21caf"
        }
      },
      boxShadow: {
        glow: "0 0 20px rgba(217, 70, 239, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
