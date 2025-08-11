import { baseConfig } from "eslint-config/base"

/** @type {import("eslint").Linter.Config} */
export default [
    ...baseConfig,
    {
        languageOptions: {
            globals: {
                process: true,
            },
            parserOptions: {
                tsconfigRootDir: process.cwd(),
                project: "./tsconfig.json",
            },
        },
    },
]
