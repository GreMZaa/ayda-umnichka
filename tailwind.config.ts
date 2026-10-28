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
        cream: {
          50: "#FFFCF8",
          100: "#FFF7EE", // Base canvas background
          200: "#FDEEDC",
          300: "#F8DFBF",
          400: "#F2C79E",
        },
        ink: {
          900: "#161F38", // Deep primary navy text from reference
          800: "#1E2A4B",
          700: "#2B385D",
          500: "#54607B", // Secondary text
          400: "#7E8AA5",
          200: "#D3D9E6",
          100: "#EEF2F8",
        },
        limeAccent: {
          DEFAULT: "#C5E87D", // The pill button green from top right
          hover: "#B6DB6B",
          light: "#EBF8CE",
        },
        coralAccent: {
          DEFAULT: "#F97A52", // Warm peach/coral action button
          hover: "#E86940",
          light: "#FDEFEA",
        },
        brand: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
        },
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
        '4xl': '36px',
      },
      transitionTimingFunction: {
        'out-emil': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out-emil': 'cubic-bezier(0.77, 0, 0.175, 1)',
        'drawer-emil': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      transitionDuration: {
        '140': '140ms',
        '180': '180ms',
        '220': '220ms',
        '250': '250ms',
      },
      scale: {
        '97': '0.97',
        '98': '0.98',
      },
      fontFamily: {
        sans: ['var(--font-nunito)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
