import { GameId } from "@game/server"
import { PlatformProvider } from "@volley/platform-sdk/react"
import { VGFProvider } from "@volley/vgf/client"
import { useState } from "react"

import packageJson from "../../package.json"
import { useSessionCreation } from "../hooks/useSessionCreation"
import { PhaseRouter } from "./PhaseRouter"

export const App: React.FC = () => {
    console.log("App rendering...")
    
    // For POC development, bypass VGF completely
    if (import.meta.env.DEV) {
        console.log("DEV mode - rendering POC directly")
        return <PhaseRouter />
    }
    
    try {
        const [sessionId, setSessionId] = useState<string | undefined | null>(
            undefined
        )

        console.log("About to call useSessionCreation...")
        const transport = useSessionCreation({ sessionId, setSessionId })

        console.log("Transport:", transport)
        if (!transport) {
            console.log("No transport, returning null")
            return <div style={{color: 'white', padding: '20px'}}>Loading transport...</div>
        }

        console.log("Rendering with transport")
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
    } catch (error) {
        console.error("Error in App:", error)
        return <div style={{color: 'white', padding: '20px'}}>App Error: {String(error)}</div>
    }
}
