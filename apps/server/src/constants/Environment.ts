import dotenv from "dotenv"

import { envVarAsNumber } from "../utils/environment/envVarAsNumber"
import { envVarAsString } from "../utils/environment/envVarAsString"

dotenv.config({ path: ".env.development" })

export const STAGE = envVarAsString("STAGE", "local")

export const PORT = envVarAsNumber("PORT", 8000)

export const REDIS_HOST = envVarAsString("REDIS_HOST", "")

export const REDIS_PORT = envVarAsNumber("REDIS_PORT", 6379)

export const AWS_REGION = envVarAsString("AWS_REGION", "us-east-1")
