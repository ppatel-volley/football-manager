import { PhaseName } from "@game/server"
import type { ReactNode } from "react"

import { usePhase } from "../hooks/VGF"
import { Home } from "./Home/Home"

export const PhaseRouter = (): ReactNode => {
    const phase = usePhase()

    switch (phase) {
        case PhaseName.Home:
            return <Home />
    }
}
