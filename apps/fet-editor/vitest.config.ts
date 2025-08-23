import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        setupFiles: [],
        testTimeout: 5000,
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html", "lcov"],
            reportsDirectory: "./coverage/fet-editor",
            exclude: [
                "node_modules/**",
                "dist/**",
                "**/*.d.ts",
                "**/*.config.{js,ts}",
                "**/__mocks__/**",
                "**/index.ts",
            ],
        },
    },
});


