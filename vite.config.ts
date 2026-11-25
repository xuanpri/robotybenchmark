import {defineConfig} from 'vite'
export default defineConfig({
  server:{fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/results/**']}},
  build:{rollupOptions:{input:{arena:'index.html',studio:'studio.html'}}}
})
