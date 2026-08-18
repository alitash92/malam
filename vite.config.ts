import { defineConfig } from 'vite'

export default defineConfig({
  // Relative asset paths, so the build works from any host and from a GitHub
  // Pages project subpath (/malam/) without a rebuild.
  base: './',
  build: { target: 'es2022', sourcemap: false },
})
