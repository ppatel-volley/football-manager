export const envVarAsNumber = (
    envVar: string,
    defaultValue: number
): number => {
    const value = process.env[envVar]

    if (!value) {
        return defaultValue
    }

    return parseInt(value)
}
