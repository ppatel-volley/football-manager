import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        setupFiles: ["./vitest.setup.ts"],
        testTimeout: 5000,
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html", "lcov"],
            reportsDirectory: "./coverage/client",
            exclude: [
                "node_modules/**",
                "dist/**",
                "**/*.d.ts",
                "**/*.config.{js,ts}",
                "**/__mocks__/**",
                "**/index.ts",
            ],
        },
        // Inlines @volley/vgf during tests to properly resolve internal module paths
        deps: {
            inline: [/@volley\/vgf/],
        },
    },
})
