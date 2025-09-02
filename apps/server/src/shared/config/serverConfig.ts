// Re-export server configurations from main config
import { getServerConfig, getSocketIOConfig, HEALTH_CHECK_CONFIG as HEALTH_CHECK } from "../../config/server"

export const serverConfig = getServerConfig()
export const socketIOConfig = getSocketIOConfig()
export const HEALTH_CHECK_CONFIG = HEALTH_CHECK