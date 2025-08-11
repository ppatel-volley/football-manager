import { type GameState, PhaseName } from "../shared"

export const setupGameState = (
    setupData: Partial<GameState> = {}
): GameState => {
    const defaultState: GameState = {
        test: true,
        phase: PhaseName.Home,
    }

    return {
        ...defaultState,
        ...setupData,
    }
}
