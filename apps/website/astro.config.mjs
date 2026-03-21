import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [
    tailwind({
      // Use the shared design-system Tailwind config
      configFile: '../../packages/ui/tailwind.config.js',
    }),
    react(),
  ],
  output: 'static',
  build: {
    assets: '_assets',
  },
});
