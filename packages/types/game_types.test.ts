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
    composeMessageToServer,
    playerToBinary
} from "./game_types"

describe('playerToBinary', () => {
    let decoder = new TextDecoder("UTF-8")
    test("playerToBinary outputs correct result with null string fields", () => {
        let player: Player = {
            avatarUrl: "\0",
            color: "\0",
            displayName: "\0",
            id: "\0",
            username: "\0"
        }
        let result: Uint8Array = playerToBinary(player)
        let resultView = new DataView(result.buffer)

        let counter = 0;

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

        expect(result.length).toBe(25)
    })

})

