/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        glass: {
          tint: "rgba(20, 20, 24, 0.55)",
          border: "rgba(255, 255, 255, 0.12)",
        },
      },
      backdropBlur: {
        glass: "20px",
      },
      borderRadius: {
        glass: "16px",
      },
    },
  },
  plugins: [],
};
