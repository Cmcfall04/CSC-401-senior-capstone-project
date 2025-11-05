// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#f8fafc",
          card: "#ffffff",
          text: "#0f172a",
          accent: "#0ea5e9",
        },
      },
      boxShadow: {
        soft: "0 10px 20px rgba(0,0,0,0.05)",
      },
      borderRadius: {
        xl2: "1rem",
      },
      // (Optional) center container + nice default padding
      container: {
        center: true,
        padding: {
          DEFAULT: "1rem",
          sm: "1rem",
          md: "1.25rem",
          lg: "2rem",
          xl: "2rem",
          "2xl": "2rem",
        },
      },
    },
  },
  plugins: [],
};

export default config;