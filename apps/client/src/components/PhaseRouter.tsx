import { PhaseName } from "@game/server"
import type { ReactNode } from "react"

import { usePhase } from "../hooks/VGF"
import { Home } from "./Home/Home"
import { POCApp } from "./POC/POCApp"

export const PhaseRouter = (): ReactNode => {
    console.log("PhaseRouter rendering...")
    
    try {
        console.log("About to render POCApp")
        return <POCApp />
    } catch (error) {
        console.error("Error in PhaseRouter:", error)
        return <div style={{color: 'white', padding: '20px'}}>Error: {String(error)}</div>
    }
}
