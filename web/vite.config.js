import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Konfigurasi untuk folder WEB
export default defineConfig({
  // Base harus menyertakan nama repo + sub-folder
  base: "/Galery_App_Photora/web/",
  plugins: [react()],
});