export const base = {
    platform: "node",
    entryPoints: ["./src/index.ts"],
    outfile: "dist/index.js",
    bundle: true,
    minify: false,
    sourcemap: "inline",
    treeShaking: true,
    target: "node22",
    tsconfig: "./tsconfig.json",
    // TODO: Resolve Waterfall issues properly.
    external: ["phonemify"],
}
