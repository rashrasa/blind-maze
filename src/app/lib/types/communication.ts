import { GameState, PlayerSnapshot } from "./game_types"

interface ClientMessage {
    // TODO: Implement
    message: String
}

interface ServerMessage {
    // TODO: Implement
    message: String
}

function gameStateToBinary(state: GameState): any {
    return JSON.stringify(state);
}

function gameStateFromBinary(binary: any): GameState {
    return JSON.parse(binary);
}

function playerStateToBinary(state: PlayerSnapshot): any {
    return JSON.stringify(state);
}

function playerStateFromBinary(binary: any): PlayerSnapshot {
    return JSON.parse(binary);
}

export type {
    ClientMessage,
    ServerMessage
}
export {
    gameStateToBinary,
    gameStateFromBinary,
    playerStateToBinary,
    playerStateFromBinary,
}