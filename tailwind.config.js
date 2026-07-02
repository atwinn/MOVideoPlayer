/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        glass: {
          tint: "rgba(16, 16, 20, 0.75)",
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
