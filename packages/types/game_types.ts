
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
interface GameSnapshot {
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

// function gameStateToBinary(state: GameSnapshot): any {
//     return JSON.stringify(state);
// }


// MapLayout ENCODING:
// [
// u32 width;
// u32 height;
// flattened bitArray of map
// ]

// Player ENCODING:
// [
// u32 avatarLength; 		string utf8 avatar;
// u32 colorLength; 		string utf8 color;
// u32 displayNameLength; 	string utf8 displayName;
// u32 idLength; 			string utf8 id;
// u32 usernameLength; 		string utf8 username;
// ]

// PlayerSnapshot ENCODING:
// [
// bool isLeader 1 byte;
// Player player;
// f64 position x; 	f64 position y;
// f64 velocity x; 	f64 velocity y;
// u64 serverTimestamp;
// ]

// GameSnapshot ENCODING:
// [
// u32 numPlayers;	PlayerSnapshot[];
// MapLayout(u32 width; u32 height; flattened bitArray of map);
// ]

function gameStateFromBinary(binary: Uint8Array): GameSnapshot {
    let bufferView = new DataView(binary.buffer)
    let decoder = new TextDecoder()

    let numPlayers = bufferView.getUint32(0, false)
    let players: PlayerSnapshot[] = new Array(numPlayers)

    let counter = 4

    for (let i = 0; i < numPlayers; i++) {
        let isLeader: boolean = !!bufferView.getUint8(counter)
        counter++

        let avatarLength = bufferView.getUint32(counter)
        counter += 4
        let avatar = decoder.decode(binary.subarray(counter, counter + avatarLength))
        counter += avatarLength

        let colorLength = bufferView.getUint32(counter)
        counter += 4
        let color = decoder.decode(binary.subarray(counter, counter + colorLength))
        counter += colorLength

        let displayNameLength = bufferView.getUint32(counter)
        counter += 4
        let displayName = decoder.decode(binary.subarray(counter, counter + displayNameLength))
        counter += displayNameLength

        let idLength = bufferView.getUint32(counter)
        counter += 4
        let id = decoder.decode(binary.subarray(counter, counter + idLength))
        counter += idLength

        let usernameLength = bufferView.getUint32(counter)
        counter += 4
        let username = decoder.decode(binary.subarray(counter, counter + usernameLength))
        counter += usernameLength

        let positionX = bufferView.getFloat64(counter)
        counter += 8
        let positionY = bufferView.getFloat64(counter)
        counter += 8

        let velocityX = bufferView.getFloat64(counter)
        counter += 8
        let velocityY = bufferView.getFloat64(counter)
        counter += 8

        let snapshotTimestampMs = bufferView.getBigUint64(counter)
        counter += 8

        players.push({
            isLeader: isLeader,
            player: {
                avatarUrl: avatar,
                color: color,
                displayName: displayName,
                id: id,
                username: username
            },
            position: {
                x: positionX,
                y: positionY
            },
            velocity: {
                x: velocityX,
                y: velocityY
            },
            snapshotTimestampMs: Number(snapshotTimestampMs)
        })
    }
    let mapWidth = bufferView.getUint32(counter)
    counter += 4
    let mapHeight = bufferView.getUint32(counter)
    counter += 4

    let tiles: TileType[][] = []
    let mapBytesLength: number = Math.ceil((1.0 * mapWidth * mapHeight) / 8.0)

    let i = 0;
    let row: TileType[] = []
    for (let k = 0; k < mapBytesLength; k++) {
        let byte = binary[1]!
        for (let bitIndex = 7; bitIndex >= 0; i--) {
            let tile = ((byte >> bitIndex) == 1) ? TileType.WALL : TileType.EMPTY
            row.push(tile)
            if (i == mapWidth - 1) {
                i = 0;
                tiles.push(row)
                row = []
            }
        }
    }

    return {
        playerStates: players,
        map: {
            width: mapWidth,
            height: mapHeight,
            tiles: tiles
        }
    };
}

// Player ENCODING:
// [
// u32 avatarLength; 		string utf8 avatar;
// u32 colorLength; 		string utf8 color;
// u32 displayNameLength; 	string utf8 displayName;
// u32 idLength; 			string utf8 id;
// u32 usernameLength; 		string utf8 username;
// ]

// ENCODING:
// [
// bool isLeader 1 byte;
// Player player;
// f64 position x; 	f64 position y;
// f64 velocity x; 	f64 velocity y;
// u64 serverTimestamp;
// ]
function playerStateToBinary(state: PlayerSnapshot): Uint8Array {
    // 1 + 5 * 4 + 8 * 5 = number of bytes for all data except strings
    let buffer = new ArrayBuffer(61);
    let data = new Uint8Array(buffer);
    let view = new DataView(data.buffer)
    let encoder = new TextEncoder()

    data[0] = Number(state.isLeader)
    let counter = 1

    let avatarBuf = encoder.encode(state.player.avatarUrl ?? "")
    view.setUint32(1, avatarBuf.length)
    counter += 4

    let colorBuf = encoder.encode(state.player.color ?? "")
    view.setUint32(5, colorBuf.length)
    counter += 4

    let displayNameBuf = encoder.encode(state.player.displayName ?? "")
    view.setUint32(9, displayNameBuf.length)
    counter += 4

    let idBuf = encoder.encode(state.player.id ?? "")
    view.setUint32(13, idBuf.length)
    counter += 4

    let usernameBuf = encoder.encode(state.player.username ?? "")
    view.setUint32(17, usernameBuf.length)

    let merged = new Uint8Array(
        61 + avatarBuf.length + colorBuf.length + displayNameBuf.length + idBuf.length + usernameBuf.length
    )


    merged.set(data)
    counter = 61

    merged.set(avatarBuf, counter)
    counter += avatarBuf.length

    merged.set(colorBuf, counter)
    counter += colorBuf.length

    merged.set(displayNameBuf, counter)
    counter += displayNameBuf.length

    merged.set(idBuf, counter)
    counter += idBuf.length

    merged.set(usernameBuf, counter)


    return merged
}



export type {
    GameConfig,
    Player,
    PlayerSnapshot,
    GameSnapshot,
    MapLayout,
    MapConfiguration,
}

export {
    TileType,
    gameStateFromBinary,
    playerStateToBinary,
}