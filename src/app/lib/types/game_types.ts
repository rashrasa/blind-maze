
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
}

/**
 * Represents a player in the game at a specific moment in time.
 */
interface PlayerSnapshot {
    isLeader: boolean;
    player: Player;
    position: { x: number; y: number };
    snapshotTimestamp: Date;
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
 * Represents a single tile in a game map.
 */
interface Tile {
    id: string;
    type: TileType;
    x: number;
    y: number;
}

/**
 * Represents an entire game map layout.
 */
interface MapLayout {
    width: number;
    height: number;
    tiles: Tile[][];
}

/**
 * Map initialization data.
 */
interface MapConfiguration {
    width: number;
    height: number;
    seed: number;
}

export type {
    GameConfig,
    Player,
    PlayerSnapshot,
    GameState,
    Tile,
    MapLayout,
    MapConfiguration
}

export {
    TileType
}