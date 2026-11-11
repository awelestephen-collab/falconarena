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
        falcon: {
          navy: "#0A192F",
          deep: "#060F1E",
          blue: "#0055A5",
          sky: "#00A8E8",
          amber: "#F59E0B",
          flame: "#FF6B00",
          emerald: "#10B981",
        },
        kahoot: {
          red: "#E21B3C",
          blue: "#1368CE",
          yellow: "#D89E00",
          green: "#26890C",
        },
      },
      animation: {
        "pulse-fast": "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 3s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
