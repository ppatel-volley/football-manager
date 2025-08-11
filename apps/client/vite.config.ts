import react from "@vitejs/plugin-react-swc"
import { defineConfig, loadEnv } from "vite"

const BASE_PATH = "/game/"

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, process.cwd(), "")

    const allowedHost = env.VITE_LOCAL_ALLOWED_HOST

    return {
        plugins: [react()],
        base: command === "build" ? BASE_PATH : "/",
        server: {
            allowedHosts: allowedHost ? [allowedHost] : undefined,
        },
    }
})
