// Standalone server component capable of accepting connections from game clients

import { WebSocketServer, WebSocket } from 'ws';
import { GameState, MapLayout, PlayerSnapshot, TileType } from '../types/game_types';
import { gameStateFromBinary, gameStateToBinary, playerStateFromBinary } from '../types/communication';
import config from './server-config.json';
import { generateMap } from '../generation/map_generation';
import { emitKeypressEvents } from 'node:readline';

// Simple websocket server
const port: number = config.port

const map: MapLayout = generateMap({
    width: config.mapWidth,
    height: config.mapHeight,
    seed: config.mapSeed
})

const server = new WebSocketServer({
    port: port,
});

const playerConnections: Map<WebSocket, string> = new Map()
const playerStates: Map<string, PlayerSnapshot> = new Map()

var state: GameState = {
    playerStates: [],
    map: map
}

var open = true;

server.on("connection", (connection) => {
    console.log(`Established connection with ${connection.url}`)

    // Handle inputs
    connection.on('message', async (event) => {
        let playerState: PlayerSnapshot = playerStateFromBinary(event)
        console.log(`Received state: ${event}`)
        if (playerConnections.get(connection) == null) {
            playerConnections.set(connection, playerState.player.id)
        }
        playerStates.set(playerState.player.id, playerState)

        await updateStateAndClients()
    })

    connection.on("close", (event) => {
        if (playerConnections.get(connection) != undefined) playerStates.delete(playerConnections.get(connection)!)
        playerConnections.delete(connection)
        updateStateAndClients()
        console.log(`Connection closed with ${connection.url}`)
    })

    console.log(`Connection ready with ${connection.url}.`)
})

server.on("error", console.error)

server.on("close", () => {
    console.log("Server closed.");
    open = false;
})

server.on("wsClientError", (error) => {
    console.log(error);
})


// Emit constant rate of current states
const startTimeMs = Date.now();
const TICK_RATE = config.tickRate;
var updates = 0;

setInterval(() => {
    if (
        (Date.now() - startTimeMs) / 1000 * TICK_RATE > updates
    ) {
        setTimeout(() => {
            tick(1000.0 / TICK_RATE)
            updates++;
        }, 0)
    }
}, 0)

function tick(milliseconds: number) {
    for (const [playerId, playerState] of playerStates) {
        let updatedState: PlayerSnapshot = {
            isLeader: playerState.isLeader,
            player: playerState.player,
            position: {
                x: playerState.position.x + playerState.velocity.x * milliseconds / 1000.0,
                y: playerState.position.y + playerState.velocity.y * milliseconds / 1000.0
            },
            velocity: playerState.velocity,
            snapshotTimestampMs: Date.now()
        }
        playerStates.set(playerId, updatedState)
    }
    // Update states
    updateStateAndClients()
}

async function updateStateAndClients() {
    let playerStateList = playerStates.values()
    state.playerStates = playerStateList.toArray()
    server.clients.forEach(async (client) => {
        client.send(gameStateToBinary(state), (error) => {
            if (error) console.error(error)
        })
    })
}

// Accept input
emitKeypressEvents(process.stdin)
if (process.stdin.setRawMode != null) {
    process.stdin.setRawMode(true);
}
process.stdin.on('keypress', async (str, key) => {
    // console.log(key)
    switch (key.sequence) {
        case "\x13":
            console.log(state)
            console.log(Object.values(playerStates))
            console.log(Object.values(playerConnections))
            break;
        case "\x03":
            console.log("Closed server!")
            open = false
            server.close()
            process.exit(0);
        default:
            break;
    }
})


console.log(`Server initialized at ${JSON.stringify(server.address())}\nUse:\n\tCTRL+C to exit\n\tCTRL+S to print current game state`)