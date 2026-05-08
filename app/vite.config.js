import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Konfigurasi untuk folder APP
export default defineConfig({
  // Base harus menyertakan nama repo + sub-folder
  base: "/Galery_App_Photora/app/",
  plugins: [react()],
});