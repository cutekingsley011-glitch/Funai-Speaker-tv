import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    base: './',
    resolve: {
        alias: {
            '@appdeploy/client': path.resolve(__dirname, 'lib/appdeploy/client.ts'),
            '@appdeploy/sdk': path.resolve(__dirname, 'lib/appdeploy/sdk.ts'),
        },
    },
    build: {
        outDir: process.env.APPDEPLOY_VITE_OUT_DIR || 'dist',
        sourcemap: process.env.APPDEPLOY_VITE_SOURCEMAP === 'hidden' ? 'hidden' : false,
    },
});
