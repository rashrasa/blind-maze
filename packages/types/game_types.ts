/**
 * Unique and persistent player identifier
 */
interface Player {
    uuid: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    color: string;
}

/**
 * Represents a player in the game at a specific moment in time.
 */
interface PlayerSnapshot {
    isLeader: boolean;
    uuid: string;
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



// MapLayout ENCODING:
// [
// u32 width;
// u32 height;
// flattened bitArray of map
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

function gameStateFromBinary(buffer: ArrayBufferLike): GameSnapshot {
    let bufferView = new DataView(buffer)
    let decoder = new TextDecoder("UTF-8")

    let counter = 0

    let numPlayers = bufferView.getUint32(counter)
    counter += 4

    let players: PlayerSnapshot[] = []

    for (let i = 0; i < numPlayers; i++) {
        let isLeader: boolean = Boolean(bufferView.getUint8(counter))
        counter += 1

        let uuidLength = bufferView.getUint32(counter)
        counter += 4
        let uuid = decoder.decode(buffer.slice(counter, counter + uuidLength))
        counter += uuidLength

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
            uuid: uuid,
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

    let i = 0
    let row: TileType[] = []
    for (let k = 0; k < mapBytesLength; k++) {
        let byte = bufferView.getUint8(counter)
        counter += 1
        for (let bitIndex = 7; bitIndex >= 0; bitIndex--) {
            let digit = byte >> bitIndex & 0b0000_0001

            row.push(digit)
            i++
            if ((i % mapWidth) == 0 && i != 0) {
                tiles.push(row)
                row = []
            }
            if (i >= mapHeight * mapWidth) {
                break;
            }

        }
        if (i >= mapHeight * mapWidth) {
            break;
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


// u32 len; string
// likely inefficient to create an encoder each time
function encodeString(s: string): Uint8Array {
    let encoder = new TextEncoder()
    let encoded = encoder.encode(s)
    let result = new Uint8Array(encoded.length + 4)
    let view = new DataView(result.buffer)
    view.setUint32(0, encoded.length)
    result.set(encoded, 4)
    return result;
}

function decodeString(bytes: Uint8Array): { value: string, bytesTraversed: number } {
    let decoder = new TextDecoder("utf-8")
    let dataView = new DataView(bytes.buffer)

    let length = dataView.getUint32(0)
    let decoded = decoder.decode(bytes.subarray(4, length + 4))
    return {
        value: decoded,
        bytesTraversed: length
    }
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
    let uuidBinary = encodeString(state.uuid)

    let merged = new Uint8Array(
        1 + uuidBinary.length + 40
    )
    merged[0] = Number(state.isLeader)
    merged.set(uuidBinary, 1)
    let counter = 1 + uuidBinary.length

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

function composeUpdateMessageToServer(state: PlayerSnapshot): Uint8Array {
    let data = playerStateToBinary(state)
    let merged = new Uint8Array(data.length + 1);

    merged[0] = 1
    merged.set(data, 1)

    return merged
}

function composeNewConnectionMessage(uuid: string): Uint8Array {
    let playerEncoded: Uint8Array = encodeString(uuid)
    let merged = new Uint8Array(playerEncoded.length + 1)

    merged[0] = 0
    merged.set(playerEncoded, 1)
    return merged;
}


export type {
    Player,
    PlayerSnapshot,
    GameSnapshot,
    MapLayout,
    MapConfiguration,
}

export {
    TileType,
    gameStateFromBinary,
    composeUpdateMessageToServer,
    composeNewConnectionMessage,
    encodeString,
    decodeString
}

