// Standalone server component capable of accepting connections from game clients

import { WebSocketServer, WebSocket } from 'ws';
import { GameSnapshot, MapLayout, PlayerSnapshot, TileType, gameStateFromBinary, gameStateToBinary, playerStateFromBinary } from '@blind-maze/types';
import config from './server-config.json';
import { generateMap } from './src/map_generation';
import { emitKeypressEvents } from 'node:readline';

// Simple websocket server
const port: number = config.port

console.log("Generating map...")
const map: MapLayout = generateMap({
    width: config.mapWidth,
    height: config.mapHeight,
    seed: config.mapSeed
})

console.log(`Binding server to port ${port}`)
const server = new WebSocketServer({
    port: port,
});

const playerConnections: Map<WebSocket, string> = new Map()
const playerStates: Map<string, PlayerSnapshot> = new Map()

var state: GameSnapshot = {
    playerStates: [],
    map: map
}

var open = true;

server.on("connection", (connection) => {
    console.log(`Established connection with ${connection.url}`)

    // Handle inputs
    connection.on('message', async (event) => {
        console.log(`Received message ${event.toString()}`)

        try {
            let playerState: PlayerSnapshot;
            playerState = playerStateFromBinary(event)
            console.log(`Received state: ${event}`)
            if (playerConnections.get(connection) == null) {
                playerConnections.set(connection, playerState?.player.id)
            }
            playerStates.set(playerState?.player.id, playerState)
        }
        catch {
            console.error("Could not parse player state from message.")
        }

        await updateStateAndClients()
    })

    connection.on("close", (event) => {
        if (playerConnections.get(connection) != undefined) playerStates.delete(playerConnections.get(connection)!)
        playerConnections.delete(connection)
        updateStateAndClients()
        console.log(`Connection closed with ${connection.url}`)
    })

    connection.send("Pong")
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

async function updateStateAndClients() {
    let playerStateValues = playerStates.values()
    state.playerStates = []
    for (const playerState of playerStateValues) {
        state.playerStates.push(playerState)
    }
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
            console.log(playerStates.values())
            console.log(playerConnections.values())
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