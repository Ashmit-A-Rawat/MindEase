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
})
