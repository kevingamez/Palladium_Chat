import { defineConfig, defaultPlugins } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'http://localhost:8000/openapi.json',
  output: 'src/api',
  plugins: [
    ...defaultPlugins,            // types, sdk, etc.
    '@hey-api/client-fetch',      // cliente HTTP
    '@tanstack/react-query',      // <-- quítalo si no lo quieres
  ],
});
