import { baseConfig } from "eslint-config/base"

/** @type {import("eslint").Linter.Config} */
export default [
    ...baseConfig,
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: process.cwd(),
                project: "./tsconfig.json",
            },
        },
    },
    {
        ignores: [
            "**/*.d.ts",
            "dist/**",
        ],
    },
]