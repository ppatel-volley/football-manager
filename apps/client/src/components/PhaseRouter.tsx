import { PhaseName } from "@game/server"
import type { ReactNode } from "react"

import { usePhase, useStateSync } from "../hooks/VGF"
import { FootballMatch } from "./Football/FootballMatch"
import { Home } from "./Home/Home"

export const PhaseRouter = (): ReactNode => {
    console.log("PhaseRouter rendering...")
    
    // Now using full VGF - POC mode removed
    
    try {
        const phase = usePhase()
        const gameState = useStateSync()
        
        console.log("Current phase:", phase)
        console.log("Game state:", gameState)
        
        // Route to appropriate component based on VGF phase
        switch (phase) {
            case "PRE_MATCH":
                return <FootballMatch phase="pre_match" />
                
            case "KICKOFF":
                return <FootballMatch phase="kickoff" />
                
            case "FIRST_HALF":
                return <FootballMatch phase="first_half" />
                
            case "HALF_TIME":
                return <FootballMatch phase="half_time" />
                
            case "SECOND_HALF":
                return <FootballMatch phase="second_half" />
                
            case "FULL_TIME":
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
