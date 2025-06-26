import { GameState } from "./game_types"

interface ClientMessage {
    // TODO: Implement
    message: String
}

interface ServerMessage {
    // TODO: Implement
    message: String
}

function gameStateToBinary(state: GameState): string {
    return JSON.stringify(state);
}

function gameStateFromBinary(binary: any): GameState {
    return JSON.parse(binary);
}

export type {
    ClientMessage,
    ServerMessage
}
export {
    gameStateToBinary,
    gameStateFromBinary
}