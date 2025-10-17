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
    },
  },
  plugins: [],
};
export default config;