import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tamaguiPlugin({ config: 'tamagui.config.ts', components: ['tamagui'], optimize: true,})
  ].filter(Boolean),
  test: {
    globals: true,
    environment: "jsdom",
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'react-native': 'react-native-web',
    },
  },
  base: '/Palladium/',
});
