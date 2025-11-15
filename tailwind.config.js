/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "cabin-bg": "rgb(230,231,232)",
        "cabin-interior": "rgb(255,255,255)",
        "uld-border": "#367878",
        "uld-assigned": "#367878",
        "text-main": "rgb(129,130,133)",
        "cathay-jade": "#005D63",
        "cathay-saffron": "#C2262E",
      },
    },
  },
  plugins: [],
};

