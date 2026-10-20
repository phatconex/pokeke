import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    // tách Phaser ra gói riêng (lần cập nhật sau người chơi chỉ tải lại phần game, thư viện được trình duyệt cache)
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'], supabase: ['@supabase/supabase-js'] } },
    },
    chunkSizeWarningLimit: 1500,
  },
});
