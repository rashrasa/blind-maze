
/**
 * Contains game initialization data
 */
interface GameConfig {
    gameId: string;
    maxPlayers: number;
    tickRate: number; // in milliseconds
    gameDuration: number; // in seconds
    mapConfiguration: MapConfiguration;
    initialPlayerState: PlayerSnapshot[];
}

/**
 * Unique and persistent player identifier
 */
interface Player {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    color: string | null;
}

/**
 * Represents a player in the game at a specific moment in time.
 */
interface PlayerSnapshot {
    isLeader: boolean;
    player: Player;
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    snapshotTimestampMs: number;
}

/**
 * Represents the state of the game at a specific moment in time.
 */
interface GameState {
    playerStates: PlayerSnapshot[];
    map: MapLayout;
}

enum TileType {
    EMPTY,
    WALL,
}

/**
 * Represents an entire game map layout.
 */
interface MapLayout {
    width: number;
    height: number;
    tiles: TileType[][];
}

/**
 * Map initialization data.
 */
interface MapConfiguration {
    width: number;
    height: number;
    seed: string;
}

export type {
    GameConfig,
    Player,
    PlayerSnapshot,
    GameState,
    MapLayout,
    MapConfiguration
}

export {
    TileType
}