/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_AUDIO_GENERATION_ENDPOINT: string
    readonly VITE_BACKEND_SERVER_ENDPOINT: string
    readonly VITE_SEGMENT_WRITE_KEY: string
    readonly VITE_SPEECH_RECOGNITION_ENDPOINT: string
    readonly VITE_STAGE: "dev" | "local" | "staging" | "production"
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
