import baseConfig from '../../packages/ui/tailwind.config.js';

/** @type {import('tailwindcss').Config} */
export default {
  ...baseConfig,
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
};
