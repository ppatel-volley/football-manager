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
    ignores: ["**/*.d.ts"],
  },
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
