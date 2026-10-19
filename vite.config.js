import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// isSsrBuild : vrai pour le bundle serveur du pré-rendu (vite build --ssr),
// qui ne recopie pas public/ et intègre gsap (illisible tel quel par Node)
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  define: {
    __BUILD_YEAR__: JSON.stringify(new Date().getFullYear())
  },
  build: {
    copyPublicDir: !isSsrBuild
  },
  ssr: {
    noExternal: ['gsap']
  },
  server: {
    port: 5173,
    open: true
  }
}))
