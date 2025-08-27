
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

function playerToBinary(player: Player): Uint8Array {
    // 5 * 4 = number of bytes for all data except strings
    let buffer = new ArrayBuffer(20);
    let data = new Uint8Array(buffer);
    let view = new DataView(data.buffer)
    let encoder = new TextEncoder()

    let counter = 0

    let avatarBuf = encoder.encode(player.avatarUrl ?? "")
    view.setUint32(counter, avatarBuf.length)
    counter += 4

    let colorBuf = encoder.encode(player.color ?? "")
    view.setUint32(counter, colorBuf.length)
    counter += 4

    let displayNameBuf = encoder.encode(player.displayName ?? "")
    view.setUint32(counter, displayNameBuf.length)
    counter += 4

    let idBuf = encoder.encode(player.id ?? "")
    view.setUint32(counter, idBuf.length)
    counter += 4

    let usernameBuf = encoder.encode(player.username ?? "")
    view.setUint32(counter, usernameBuf.length)
    counter += 4

    let merged = new Uint8Array(
        20 + avatarBuf.length + colorBuf.length + displayNameBuf.length + idBuf.length + usernameBuf.length
    )

    merged.set(data)
    counter = 60

    merged.set(avatarBuf, counter)
    counter += avatarBuf.length

    merged.set(colorBuf, counter)
    counter += colorBuf.length

    merged.set(displayNameBuf, counter)
    counter += displayNameBuf.length

    merged.set(idBuf, counter)
    counter += idBuf.length

    merged.set(usernameBuf, counter)
    counter += usernameBuf.length

    return data
}

// ENCODING:
// [
// bool isLeader 1 byte;
// Player player;
// f64 position x; 	f64 position y;
// f64 velocity x; 	f64 velocity y;
// u64 serverTimestamp;
// ]
function playerStateToBinary(state: PlayerSnapshot): Uint8Array {
    let encoder = new TextEncoder()
    let playerBinary = playerToBinary(state.player)

    let merged = new Uint8Array(
        1 + playerBinary.length + 40
    )
    merged[0] = Number(state.isLeader)
    merged.set(playerBinary, 1)
    let counter = 1 + playerBinary.length

    let view = new DataView(merged.buffer)

    view.setFloat64(counter, state.position.x)
    counter += 8

    view.setFloat64(counter, state.position.y)
    counter += 8

    view.setFloat64(counter, state.velocity.x)
    counter += 8

    view.setFloat64(counter, state.velocity.y)
    counter += 8

    view.setBigUint64(counter, BigInt(state.snapshotTimestampMs))
    counter += 8

    return merged
}

function composeMessageToServer(state: PlayerSnapshot): Uint8Array {
    let data = playerStateToBinary(state)
    let merged = new Uint8Array(data.length + 1);

    merged[0] = 1
    merged.set(data, 1)

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
    composeMessageToServer,
    playerToBinary
}