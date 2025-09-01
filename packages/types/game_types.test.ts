import { describe, expect, test } from "@jest/globals"

import type {
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
    composeNewConnectionMessage,
    encodeString
} from "./game_types"


// Counters are used for readability
describe('game_types methods', () => {
    let decoder = new TextDecoder("UTF-8")
    test("playerToBinary outputs correct result with all string fields", () => {

        let result: Uint8Array = encodeString("00000000-0000-0000-0000-000000000000")
        let resultView = new DataView(result.buffer)

        // Reference: https://planetcalc.com/9033/

        let counter = 0;

        let idLength = resultView.getUint32(counter);
        expect(idLength).toBe(36)
        counter += 4

        let id = decoder.decode(result.subarray(counter, counter + 36))
        expect(id).toBe("00000000-0000-0000-0000-000000000000")
        counter += 36


        expect(result.length).toBe(40)
    })

    test("composeNewConnectionMessage formulates binary message in correct format", () => {
        let result: Uint8Array = composeNewConnectionMessage("\0")
        let resultView = new DataView(result.buffer)

        expect(result[0]).toBe(0)

        let counter = 1;

        let idLength = resultView.getUint32(counter);
        expect(idLength).toBe(1)
        counter += 4

        let id = decoder.decode(result.subarray(counter, counter + 1))
        expect(id).toBe("\0")
        counter += 1


        expect(result.length).toBe(6)
    })

    test("composeUpdateMessageToServer formulates binary message in correct format", () => {
        let message: Uint8Array = composeUpdateMessageToServer({
            isLeader: false,
            uuid: "\0",
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

        let idLength = messageView.getUint32(counter);
        expect(idLength).toBe(1)
        counter += 4

        let id = decoder.decode(message.subarray(counter, counter + 1))
        expect(id).toBe("\0")
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

        expect(counter).toBe(47)
    })
    test("gameStateFromBinary parses correct barebones message correctly", () => {
        let buffer: ArrayBuffer = new ArrayBuffer(60);
        let bufferView = new DataView(buffer);

        let counter = 0;

        //numPlayers
        bufferView.setUint32(counter, 1)
        counter += 4

        //isLeader
        bufferView.setUint8(counter, 0)
        counter += 1

        //id
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

        //tiles
        bufferView.setUint8(counter, 0b111_101_11)
        counter += 1
        bufferView.setUint8(counter, 0b1_0000000)
        counter += 1

        expect(counter).toBe(buffer.byteLength) // test check

        let gameState: GameSnapshot = gameStateFromBinary(buffer)
        expect(gameState.playerStates.length).toBe(1)

        let playerState: PlayerSnapshot = gameState.playerStates[0]!

        expect(playerState.isLeader).toBe(false)

        expect(playerState.uuid).toBe("\0")

        expect(playerState.position.x).toBeCloseTo(0, 1)
        expect(playerState.position.y).toBeCloseTo(0, 1)
        expect(playerState.velocity.x).toBeCloseTo(0, 1)
        expect(playerState.velocity.y).toBeCloseTo(0, 1)

        expect(playerState.snapshotTimestampMs).toBe(0)

        let map = gameState.map
        expect(map.width).toBe(3)
        expect(map.height).toBe(3)

        expect(map.tiles.length).toBe(3)

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

