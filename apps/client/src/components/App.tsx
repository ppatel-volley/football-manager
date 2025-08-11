import { GameId } from "@game/server"
import { PlatformProvider } from "@volley/platform-sdk/react"
import { VGFProvider } from "@volley/vgf/client"
import { useState } from "react"

import packageJson from "../../package.json"
import { useSessionCreation } from "../hooks/useSessionCreation"
import { PhaseRouter } from "./PhaseRouter"

export const App: React.FC = () => {
    const [sessionId, setSessionId] = useState<string | undefined | null>(
        undefined
    )

    const transport = useSessionCreation({ sessionId, setSessionId })

    if (!transport) return null

    return (
        <PlatformProvider
            options={{
                stage: import.meta.env.VITE_STAGE,
                gameId: GameId,
                appVersion: packageJson.version,
                platformApiUrl: "https://platform-api-dev.volley-services.net/",
                tracking: {
                    segmentWriteKey: import.meta.env.VITE_SEGMENT_WRITE_KEY,
                },
            }}
        >
            <VGFProvider transport={transport}>
                <PhaseRouter />
            </VGFProvider>
        </PlatformProvider>
    )
}
