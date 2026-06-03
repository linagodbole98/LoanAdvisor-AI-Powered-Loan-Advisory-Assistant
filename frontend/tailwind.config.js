/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
      extend: {
        colors: {
          primary: {
            50: "#eff6ff",
            100: "#dbeafe",
            500: "#3b82f6",
            600: "#2563eb",
            700: "#1d4ed8",
            900: "#1e3a8a",
          },
          emerald: {
            50: "#ecfdf5",
            500: "#10b981",
            600: "#059669",
          },
        },
        fontFamily: {
          sans: ["Inter", "system-ui", "sans-serif"],
        },
      },
    },
    plugins: [],
  };