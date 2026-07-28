import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        paper: "#f8faf7",
        moss: "#58745b",
        tomato: "#d65f45",
        saffron: "#d69b2d",
        lake: "#377e8a"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(31, 41, 51, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
