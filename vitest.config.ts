import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // 'server-only' lanza siempre que no se resuelva bajo la condición
      // "react-server" (la que usa Next.js en RSC). Vitest no la fija, así
      // que aquí se sustituye por el módulo vacío que el propio paquete
      // expone para esa condición: mismo efecto (no-op) sin tocar brand.ts.
      'server-only': path.resolve(__dirname, 'node_modules/server-only/empty.js'),
    },
  },
});
