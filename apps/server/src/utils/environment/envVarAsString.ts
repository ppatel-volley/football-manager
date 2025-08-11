export const envVarAsString = (
    envVar: string,
    defaultValue: string
): string => {
    const value = process.env[envVar]

    if (!value) {
        return defaultValue
    }

    return value
}
