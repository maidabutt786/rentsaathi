/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#A20224",
          hover: "#7D0119",
          soft: "#FBE9ED",
        },
        secondary: {
          DEFAULT: "#764002",
          soft: "#F6EDE2",
        },
        background: "#FFFCFA",
        surface: "#FFFFFF",
        subtle: "#FAF6F3",
        ink: "#2B1B14",
        muted: "#6B5B53",
        line: "#EADFD8",
        status: {
          verified: "#2E7D32",
          suspicious: "#B7791F",
          highrisk: "#C62828",
          info: "#1F6F8B",
        },
        chart: {
          1: "#A20224",
          2: "#764002",
          3: "#D9A066",
          4: "#E8B4BD",
          5: "#8C6D5A",
          6: "#2E7D32",
        },
      },
      fontFamily: {
        heading: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(43,27,20,0.04), 0 8px 24px rgba(43,27,20,0.06)",
        lift: "0 10px 30px rgba(162,2,36,0.12)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "20px",
        "3xl": "28px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "fade-in": "fade-in 240ms ease-out both",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
