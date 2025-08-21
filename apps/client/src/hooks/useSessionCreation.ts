import { useTransport } from "@volley/vgf/client"
import { useCallback, useEffect, useState } from "react"

import { useUserId } from "./useUserId"

interface UseSessionCreationProps {
    sessionId: string | null | undefined
    setSessionId: (sessionId: string) => void
}

export const useSessionCreation = ({
    setSessionId,
    sessionId,
}: UseSessionCreationProps) =>
{
    const userId = useUserId()
    const [createdSessionId, setCreatedSessionId] = useState<string | null>(null)

    // Use VGF's autoCreateSession which should work properly
    const createSession = useCallback(() => {
        console.log("Using VGF autoCreateSession instead of manual creation")
        // We'll let useTransport handle this with autoCreateSession
        return null
    }, [setSessionId])

    // Create session on mount
    useEffect(() => {
        if (!sessionId && !createdSessionId) {
            void createSession()
        }
    }, [sessionId, createdSessionId, createSession])

    // Always call useTransport to avoid hooks rule violations
    const finalSessionId = sessionId || createdSessionId
    const backendUrl = import.meta.env.VITE_BACKEND_SERVER_ENDPOINT || "http://localhost:8000"
    console.log("🔍 Environment Debug:", {
        VITE_BACKEND_SERVER_ENDPOINT: import.meta.env.VITE_BACKEND_SERVER_ENDPOINT,
        allEnvVars: import.meta.env,
        backendUrl: backendUrl
    })
    console.log("useTransport config:", { 
        url: backendUrl,
        userId: userId || "anonymous-user",
        sessionId: finalSessionId,
        hasSessionId: !!finalSessionId,
        envVar: import.meta.env.VITE_BACKEND_SERVER_ENDPOINT
    })
    
    const transport = useTransport({
        url: backendUrl,
        userId: userId || "anonymous-user",
        autoCreateSession: {
            enabled: true,
            onError: (error) => console.error("VGF autoCreateSession failed:", error)
        }
    })

    return transport
}
