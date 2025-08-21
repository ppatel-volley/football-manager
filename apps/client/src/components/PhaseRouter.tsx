import { PhaseName } from "@game/server"
import type { ReactNode } from "react"

import { usePhase, useStateSync } from "../hooks/VGF"
import { FootballMatch } from "./Football/FootballMatch"
import { Home } from "./Home/Home"
import { POCApp } from "./POC/POCApp"

export const PhaseRouter = (): ReactNode => {
    console.log("PhaseRouter rendering...")
    
    // For POC development, bypass VGF and render POCApp directly
    if (import.meta.env.DEV) {
        console.log("DEV mode - rendering POCApp directly")
        return <POCApp />
    }
    
    try {
        const phase = usePhase()
        const gameState = useStateSync()
        
        console.log("Current phase:", phase)
        console.log("Game state:", gameState)
        
        // Route to appropriate component based on VGF phase
        switch (phase) {
            case PhaseName.PreMatch:
                return <FootballMatch phase="pre_match" />
                
            case PhaseName.Kickoff:
                return <FootballMatch phase="kickoff" />
                
            case PhaseName.FirstHalf:
                return <FootballMatch phase="first_half" />
                
            case PhaseName.HalfTime:
                return <FootballMatch phase="half_time" />
                
            case PhaseName.SecondHalf:
                return <FootballMatch phase="second_half" />
                
            case PhaseName.FullTime:
                return <FootballMatch phase="full_time" />
                
            default:
                console.warn("Unknown phase:", phase)
                return <Home />
        }
    } catch (error) {
        console.error("Error in PhaseRouter:", error)
        return <div style={{color: 'white', padding: '20px'}}>PhaseRouter Error: {String(error)}</div>
    }
}
