import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lib/brand.ts lee assets/*.png con readFileSync a traves de un parametro de
  // funcion, no con una ruta literal. El trazador de ficheros de Vercel resuelve
  // bien los literales pero no siempre las rutas construidas, asi que sin esto
  // los PNG podrian no viajar al bundle serverless y /api/pass fallaria en
  // produccion sin dar ningun aviso en local ni en los tests.
  outputFileTracingIncludes: {
    "/api/pass": ["./assets/logo.png", "./assets/icon.png"],
  },
};

export default nextConfig;
