import { beforeAll } from "vitest"

beforeAll(() => {
    const GLOBAL_TIMEOUT = 10_000 // 10 seconds

    setTimeout(() => {
        console.error("\n❌ Test suite exceeded global timeout of 10 seconds")
        process.exit(1)
    }, GLOBAL_TIMEOUT)
})
