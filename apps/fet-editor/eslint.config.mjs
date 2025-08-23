import { baseConfig } from "eslint-config/base";
import reactHooks from "eslint-plugin-react-hooks";

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
    {
        ignores: [
            "**/*.d.ts",
            "vite.config.ts",
            "vitest.config.ts",
        ],
    },
    {
        plugins: { "react-hooks": reactHooks },
        rules: {
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            "@typescript-eslint/explicit-function-return-type": [
                "error",
                { allowExpressions: true, allowTypedFunctionExpressions: true, allowHigherOrderFunctions: true }
            ],
        },
    },
];


