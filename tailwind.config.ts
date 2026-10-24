import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5", // Primary
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
        },
        solar: {
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
        },
      },
    },
  },
  plugins: [],
};

export default config;
