import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss(),
    // simple-peer (WebRTC signaling, used by VideoCall.jsx) and its
    // dependencies (readable-stream, etc.) assume Node's global/process/
    // Buffer, which Vite doesn't polyfill by default the way webpack used to.
    nodePolyfills({ globals: { global: true, process: true, Buffer: true } }),
  ],
  server: {
    // Without this, Vite's default "localhost" binding resolves to IPv6
    // loopback (::1) only on this machine — 127.0.0.1 (IPv4) then gets
    // ERR_CONNECTION_REFUSED. That breaks the Spotify OAuth redirect, which
    // is hardcoded to http://127.0.0.1:5173/ (also registered as-is in the
    // Spotify Developer Dashboard, so it can't just be swapped to localhost).
    host: "0.0.0.0",
  },
  optimizeDeps: {
    // @vladmandic/face-api bundles all of TensorFlow.js — Vite's default
    // lazy dependency scanner (which discovers deps by crawling imports at
    // request time) was hanging indefinitely trying to pre-bundle it and
    // everything else on first load. Listing it explicitly forces eager
    // pre-bundling at server startup instead, which is more reliable for
    // large/complex dependency graphs like this one.
    include: ["@vladmandic/face-api"],
  },
})
