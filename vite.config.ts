import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
export default defineConfig({
  plugins:[{name:'embedded-draco-defaults',enforce:'pre',transform(code,id){if(id.endsWith('/loaders/DRACOLoader.js'))return code.replace(/new URL\( [^\n]+?\)\.toString\(\)/g,"''")}},react(),viteSingleFile({useRecommendedBuildConfig:false})],
  base:'./', publicDir:false,
  build:{outDir:'dist',emptyOutDir:false,assetsInlineLimit:0,cssCodeSplit:false,minify:true,target:'es2022',sourcemap:false,rolldownOptions:{output:{codeSplitting:false}}},
  server:{port:5173,strictPort:true,fs:{allow:['.']}},
  preview:{port:4173,strictPort:true}
});
