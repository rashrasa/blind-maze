import { GameConfig, GameState, MapLayout, Player, PlayerSnapshot } from "../types/game_types";
import { generateMap } from "../generation/map_generation";


class Game {
    private leader: Player | null = null;
    private playerStates: PlayerSnapshot[];
    private mapLayout: MapLayout;
    
    constructor(config: GameConfig) {
        // TODO: Initialize game state
        this.playerStates = config.initialPlayerState;
        this.mapLayout = generateMap(config.mapConfiguration);
    }

    start() {
        // TODO: Start the game
    }

    tick(milliseconds: number) {
        // TODO: Update game state
    }

    getState(): GameState {
        return {
            playerStates: this.playerStates,
            map: this.mapLayout
        };
    }
}

export default Game;