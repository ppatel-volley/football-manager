import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { resolve } from "path"

// https://vitejs.dev/config/
export default defineConfig(
{
    plugins: [react()],
    resolve: {
        alias: {
            "@game/pitch-ui": resolve(__dirname, "../../packages/pitch-ui/src/index.ts")
        }
    }
})


