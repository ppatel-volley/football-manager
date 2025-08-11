import type { Config } from "jest"

const config: Config = {
    clearMocks: true,
    moduleFileExtensions: ["ts", "js", "json", "node"],
    preset: "ts-jest",
    resetMocks: true,
    roots: ["<rootDir>/src"],
    testEnvironment: "node",
    testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
    transform: {
        "^.+\\.(t|j)s?$": ["@swc/jest", {}],
    },
    testTimeout: 5000,
    collectCoverage: true,
    coverageDirectory: "./coverage/server",
    coverageReporters: ["text", "json", "html", "lcov"],
    coveragePathIgnorePatterns: [
        "/node_modules/",
        "/dist/",
        "/__mocks__/",
        "\\.d\\.ts$",
        "\\.config\\.(js|ts)$",
        "/index\\.ts$",
    ],
    slowTestThreshold: 10,
}

export default config
