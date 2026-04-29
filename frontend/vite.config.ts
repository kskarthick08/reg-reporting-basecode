import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Optimize bundle size
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'vendor-ui': ['@mui/material', '@mui/icons-material', '@radix-ui/react-dialog', '@radix-ui/react-label'],
          // Charts and visualization
          'vendor-charts': ['reactflow', 'recharts', 'cytoscape', 'cytoscape-dagre'],
          // State and utilities
          'vendor-utils': ['zustand', 'axios', 'jwt-decode'],
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit (charts are large)
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'], // Remove specific console methods
      },
    },
    // Source maps for debugging (optional in production)
    sourcemap: false,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'axios',
      'hoist-non-react-statics',
      '@emotion/react',
      '@emotion/styled',
      'prop-types',
      'jwt-decode',
      'recharts',
    ],
    // Force CommonJS modules to be pre-bundled
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  // Define global for compatibility
  define: {
    'process.env': {},
  },
});
