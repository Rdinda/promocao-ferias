import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    watch: {
      ignored: ['**/qrcodes/**', '**/*.zip', '**/node_modules/**']
    }
  }
});
