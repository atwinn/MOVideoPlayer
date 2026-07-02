/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 0.55 was too see-through to read against bright video; 0.9
        // overshot into looking like solid UI chrome with no hint of
        // translucency (there's no real backdrop-blur-of-video in M1 —
        // see window/vibrancy.rs — so *all* of the "glass" look comes
        // from this alpha value alone). 0.68 is the middle ground.
        glass: {
          tint: "rgba(16, 16, 20, 0.68)",
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
