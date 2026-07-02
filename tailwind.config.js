/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        glass: {
          tint: "rgba(14, 14, 17, 0.9)",
          border: "rgba(255, 255, 255, 0.16)",
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
