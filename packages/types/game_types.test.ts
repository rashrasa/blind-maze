import { describe, expect, test } from "@jest/globals"

import type {
    GameConfig,
    Player,
    PlayerSnapshot,
    GameSnapshot,
    MapLayout,
    MapConfiguration,
} from "./game_types"

import {
    TileType,
    gameStateFromBinary,
    composeUpdateMessageToServer,
    playerToBinary,
    composeNewConnectionMessage
} from "./game_types"


// Counters are used for readability
describe('game_types methods', () => {
    let decoder = new TextDecoder("UTF-8")
    test("playerToBinary outputs correct result with all string fields", () => {
        let player: Player = {
            avatarUrl: "https://placehold.co/600x400/000000/FFFFFF.png",
            color: "RGBA(255,0,255,0.5)",
            displayName: "Display Name",
            id: "00000000-0000-0000-0000-000000000000",
            username: "long-descriptive-user-name"
        }
        let result: Uint8Array = playerToBinary(player)
        let resultView = new DataView(result.buffer)

        // Reference: https://planetcalc.com/9033/

        let counter = 0;

        let avatarLength = resultView.getUint32(counter);
        expect(avatarLength).toBe(46)
        counter += 4

        let avatar = decoder.decode(result.subarray(counter, counter + 46))
        expect(avatar).toBe("https://placehold.co/600x400/000000/FFFFFF.png")
        counter += 46

        let colorLength = resultView.getUint32(counter);
        expect(colorLength).toBe(19)
        counter += 4

        let color = decoder.decode(result.subarray(counter, counter + 19))
        expect(color).toBe("RGBA(255,0,255,0.5)")
        counter += 19

        let displayNameLength = resultView.getUint32(counter);
        expect(displayNameLength).toBe(12)
        counter += 4

        let displayName = decoder.decode(result.subarray(counter, counter + 12))
        expect(displayName).toBe("Display Name")
        counter += 12

        let idLength = resultView.getUint32(counter);
        expect(idLength).toBe(36)
        counter += 4

        let id = decoder.decode(result.subarray(counter, counter + 36))
        expect(id).toBe("00000000-0000-0000-0000-000000000000")
        counter += 36

        let usernameLength = resultView.getUint32(counter);
        expect(usernameLength).toBe(26)
        counter += 4

        let username = decoder.decode(result.subarray(counter, counter + 26))
        expect(username).toBe("long-descriptive-user-name")
        counter += 26

        expect(result.length).toBe(159)
    })

    test("composeNewConnectionMessage formulates binary message in correct format", () => {
        let player: Player = {
            avatarUrl: "\0",
            color: "\0",
            displayName: "\0",
            id: "\0",
            username: "\0"
        }
        let result: Uint8Array = composeNewConnectionMessage(player)
        let resultView = new DataView(result.buffer)

        expect(result[0]).toBe(0)

        let counter = 1;

        let avatarLength = resultView.getUint32(counter);
        expect(avatarLength).toBe(1)
        counter += 4

        let avatar = decoder.decode(result.subarray(counter, counter + 1))
        expect(avatar).toBe("\0")
        counter += 1

        let colorLength = resultView.getUint32(counter);
        expect(colorLength).toBe(1)
        counter += 4

        let color = decoder.decode(result.subarray(counter, counter + 1))
        expect(color).toBe("\0")
        counter += 1

        let displayNameLength = resultView.getUint32(counter);
        expect(displayNameLength).toBe(1)
        counter += 4

        let displayName = decoder.decode(result.subarray(counter, counter + 1))
        expect(displayName).toBe("\0")
        counter += 1

        let idLength = resultView.getUint32(counter);
        expect(idLength).toBe(1)
        counter += 4

        let id = decoder.decode(result.subarray(counter, counter + 1))
        expect(id).toBe("\0")
        counter += 1

        let usernameLength = resultView.getUint32(counter);
        expect(usernameLength).toBe(1)
        counter += 4

        let username = decoder.decode(result.subarray(counter, counter + 1))
        expect(username).toBe("\0")
        counter += 1

        expect(result.length).toBe(26)
    })

    test("composeUpdateMessageToServer formulates binary message in correct format", () => {
        let message: Uint8Array = composeUpdateMessageToServer({
            isLeader: false,
            player: {
                avatarUrl: "\0",
                color: "\0",
                displayName: "\0",
                id: "\0",
                username: "\0"
            },
            position: {
                x: 0,
                y: 0
            },
            velocity: {
                x: 0,
                y: 0
            },
            snapshotTimestampMs: 1_000_000
        })

        let messageView = new DataView(message.buffer);

        expect(message[0]).toBe(1)

        expect(message[1]).toBe(0)

        let counter = 2;

        let avatarLength = messageView.getUint32(counter);
        expect(avatarLength).toBe(1)
        counter += 4

        let avatar = decoder.decode(message.subarray(counter, counter + 1))
        expect(avatar).toBe("\0")
        counter += 1

        let colorLength = messageView.getUint32(counter);
        expect(colorLength).toBe(1)
        counter += 4

        let color = decoder.decode(message.subarray(counter, counter + 1))
        expect(color).toBe("\0")
        counter += 1

        let displayNameLength = messageView.getUint32(counter);
        expect(displayNameLength).toBe(1)
        counter += 4

        let displayName = decoder.decode(message.subarray(counter, counter + 1))
        expect(displayName).toBe("\0")
        counter += 1

        let idLength = messageView.getUint32(counter);
        expect(idLength).toBe(1)
        counter += 4

        let id = decoder.decode(message.subarray(counter, counter + 1))
        expect(id).toBe("\0")
        counter += 1

        let usernameLength = messageView.getUint32(counter);
        expect(usernameLength).toBe(1)
        counter += 4

        let username = decoder.decode(message.subarray(counter, counter + 1))
        expect(username).toBe("\0")
        counter += 1

        let posX = messageView.getFloat64(counter);
        expect(posX).toBeCloseTo(0, 1)
        counter += 8

        let posY = messageView.getFloat64(counter);
        expect(posY).toBeCloseTo(0, 1)
        counter += 8

        let velX = messageView.getFloat64(counter);
        expect(velX).toBeCloseTo(0, 1)
        counter += 8

        let velY = messageView.getFloat64(counter);
        expect(velY).toBeCloseTo(0, 1)
        counter += 8

        let timestamp = messageView.getBigUint64(counter);
        expect(Number(timestamp)).toBe(1_000_000)
        counter += 8

        expect(counter).toBe(67)
    })
    test("gameStateFromBinary parses correct barebones message correctly", () => {
        let buffer: ArrayBuffer = new ArrayBuffer(4 + 66 + 4 + 4 + 2);
        let bufferView = new DataView(buffer);

        let counter = 0;

        //numPlayers
        bufferView.setUint32(counter, 1)
        counter += 4

        //isLeader
        bufferView.setUint8(counter, 0)
        counter += 1

        //avatar
        bufferView.setUint32(counter, 1)
        counter += 4
        bufferView.setUint8(counter, 0);
        counter += 1

        //color
        bufferView.setUint32(counter, 1)
        counter += 4
        bufferView.setUint8(counter, 0);
        counter += 1

        // displayName
        bufferView.setUint32(counter, 1)
        counter += 4
        bufferView.setUint8(counter, 0);
        counter += 1

        //id
        bufferView.setUint32(counter, 1)
        counter += 4
        bufferView.setUint8(counter, 0);
        counter += 1

        //username
        bufferView.setUint32(counter, 1)
        counter += 4
        bufferView.setUint8(counter, 0);
        counter += 1

        //pos
        bufferView.setFloat64(counter, 0)
        counter += 8
        bufferView.setFloat64(counter, 0)
        counter += 8

        //vel
        bufferView.setFloat64(counter, 0)
        counter += 8
        bufferView.setFloat64(counter, 0)
        counter += 8

        //timestamp
        bufferView.setBigUint64(counter, BigInt(0))
        counter += 8

        //width
        bufferView.setUint32(counter, 3)
        counter += 4

        //height
        bufferView.setUint32(counter, 3)
        counter += 4

        bufferView.setUint8(counter, 0b11110111)
        counter += 1

        bufferView.setUint8(counter, 0b10000000)
        counter += 1

        expect(counter).toBe(buffer.byteLength)

        let gameState: GameSnapshot = gameStateFromBinary(buffer)
        expect(gameState.playerStates.length).toBe(1)

        let playerState: PlayerSnapshot = gameState.playerStates[0]!

        expect(playerState.isLeader).toBe(false)

        expect(playerState.player.avatarUrl).toBe("\0")
        expect(playerState.player.color).toBe("\0")
        expect(playerState.player.displayName).toBe("\0")
        expect(playerState.player.id).toBe("\0")
        expect(playerState.player.username).toBe("\0")

        expect(playerState.position.x).toBeCloseTo(0, 1)
        expect(playerState.position.y).toBeCloseTo(0, 1)
        expect(playerState.velocity.x).toBeCloseTo(0, 1)
        expect(playerState.velocity.y).toBeCloseTo(0, 1)

        expect(playerState.snapshotTimestampMs).toBe(0)

        let map = gameState.map
        expect(map.width).toBe(3)
        expect(map.height).toBe(3)

        let row = map.tiles[0]!
        expect(row!.length).toBe(3)
        expect(row[0]).toBe(TileType.WALL)
        expect(row[1]).toBe(TileType.WALL)
        expect(row[2]).toBe(TileType.WALL)

        row = map.tiles[1]!
        expect(row!.length).toBe(3)
        expect(row[0]).toBe(TileType.WALL)
        expect(row[1]).toBe(TileType.EMPTY)
        expect(row[2]).toBe(TileType.WALL)

        row = map.tiles[2]!
        expect(row!.length).toBe(3)
        expect(row[0]).toBe(TileType.WALL)
        expect(row[1]).toBe(TileType.WALL)
        expect(row[2]).toBe(TileType.WALL)
    })
})

