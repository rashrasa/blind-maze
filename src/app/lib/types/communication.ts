import { GameState, PlayerSnapshot } from "./game_types"

function gameStateToBinary(state: GameState): any {
    return JSON.stringify(state);
}

function gameStateFromBinary(binary: any): GameState {
    const gameState: GameState = JSON.parse(binary)
    return gameState;
}

function playerStateToBinary(state: PlayerSnapshot): any {
    return JSON.stringify(state);
}

function playerStateFromBinary(binary: any): PlayerSnapshot {
    const playerState: PlayerSnapshot = JSON.parse(binary);
    return playerState;
}

export {
    gameStateToBinary,
    gameStateFromBinary,
    playerStateToBinary,
    playerStateFromBinary,
}