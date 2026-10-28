import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'service-page-clean-urls',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        if (/^\/services\/(vehicle-wraps|custom-banners|vehicle-magnets|stickers-decals|business-signs|window-graphics)\/?$/.test(url.pathname)) {
          req.url = url.pathname.replace(/\/$/, '') + '.html' + url.search;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        if (/^\/services\/(vehicle-wraps|custom-banners|vehicle-magnets|stickers-decals|business-signs|window-graphics)\/?$/.test(url.pathname)) {
          req.url = url.pathname.replace(/\/$/, '') + '.html' + url.search;
        }
        next();
      });
    }
  }],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    strictPort: Boolean(process.env.PORT)
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  build: {
    minify: false // Disable minification to see full React errors
  }
})
