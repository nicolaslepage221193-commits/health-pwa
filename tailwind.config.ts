// tailwind.config.ts
import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate"; // Import it at the top

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [tailwindAnimate], // Use the imported variable here
};

export default config;