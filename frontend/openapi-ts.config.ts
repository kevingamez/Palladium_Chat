import { defineConfig, defaultPlugins } from '@hey-api/openapi-ts';


const apiUrl = import.meta.env.VITE_API_URL;


export default defineConfig({
  input: `${apiUrl}/openapi.json`,
  output: 'src/api',
  plugins: [
    ...defaultPlugins,            // types, sdk, etc.
    '@hey-api/client-fetch',      // cliente HTTP
    '@tanstack/react-query',      // <-- quítalo si no lo quieres
  ],
});
