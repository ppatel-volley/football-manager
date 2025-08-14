import type { ReactNode } from "react"
import { Component } from "react"

interface ErrorBoundaryProps
{
    children: ReactNode
    fallback?: ReactNode
}

interface ErrorBoundaryState
{
    hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState>
{
    public state: ErrorBoundaryState = { hasError: false }

    public componentDidCatch(error: unknown): void
    {

        console.error("UI ErrorBoundary caught error", error)
    }

    public render(): ReactNode
    {
        if (this.state.hasError)
        {
            return this.props.fallback ?? (
                <div style={{ padding: 16, color: "#f66" }}>Something went wrong in the editor UI.</div>
            )
        }
        return this.props.children
    }

    public static getDerivedStateFromError(): ErrorBoundaryState
    {
        return { hasError: true }
    }




}



