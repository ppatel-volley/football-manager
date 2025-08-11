import { SocketIOTransportClient } from "@volley/vgf/client"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useUserId } from "./useUserId"

interface UseSessionCreationProps {
    sessionId: string | null | undefined
    setSessionId: (sessionId: string) => void
}

export const useSessionCreation = ({
    setSessionId,
    sessionId,
}: UseSessionCreationProps): SocketIOTransportClient | undefined => {
    const [ready, setReady] = useState(false)

    const userId = useUserId()

    const createGameAndSetSessionId = useCallback(async (): Promise<void> => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_SERVER_ENDPOINT}/api/session`,
                {
                    method: "POST",
                }
            )

            const session = (await response.json()) as { sessionId: string }

            const url = new URL(window.location.href)
            url.searchParams.set("sessionId", session.sessionId)
            window.history.replaceState({}, "", url.toString())

            setSessionId(session.sessionId)
        } catch (error: unknown) {
            const errorToLog =
                error instanceof Error ? error : new Error(String(error))
            console.error("Unable to create game and set party ID", {
                error: errorToLog,
            })
        }
    }, [setSessionId])

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const sessionIdParam = urlParams.get("sessionId")
        if (sessionIdParam) {
            setSessionId(sessionIdParam)
        }
        if (import.meta.env.VITE_STAGE === "local" && !sessionId) {
            console.info("Creating game and setting sessionId")
            void createGameAndSetSessionId()
        }
    }, [createGameAndSetSessionId, sessionId, ready, setSessionId])

    const transport = useMemo(() => {
        if (!sessionId || !userId) return

        const transport = new SocketIOTransportClient({
            url: import.meta.env.VITE_BACKEND_SERVER_ENDPOINT,
            query: {
                sessionId,
                userId,
            },
            onConnect: (): void => setReady(true),
            onDisconnect: (): void => setReady(false),
        })

        transport.useIncoming("message", ([_message]) => {})

        transport.useOutgoing("message", ([_message, _originalAck]) => {})

        return transport
    }, [sessionId, userId])

    return transport
}
