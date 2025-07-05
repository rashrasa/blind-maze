// Standalone server component capable of accepting connections from game clients

import { WebSocketServer, WebSocket } from 'ws';
import { GameState, MapLayout, PlayerSnapshot, TileType } from '../types/game_types';
import { gameStateFromBinary, gameStateToBinary, playerStateFromBinary } from '../types/communication';
import config from './server-config.json';
import { generateMap } from '../generation/map_generation';

// Simple websocket server
const ip: string = config.host
const port: number = config.port

const map: MapLayout = generateMap({
    width: config.mapWidth,
    height: config.mapHeight,
    seed: config.mapSeed
})

const playerStates: Map<string, PlayerSnapshot> = new Map()

const server = new WebSocketServer({
    port: 3001
});

const connections: WebSocket[] = []

const state: GameState = {
    playerStates: playerStates,
    map: map
}

var open = true;

server.on("connection", (connection) => {
    console.log(`Established connection with ${connection.url}`)
    connections.push(connection)

    // Handle inputs
    connection.on('message', (event) => {
        let playerState = playerStateFromBinary(event)
        console.log(`Received state: ${event}`)
        playerStates.set(playerState.player.id, playerState)
        updateClients()
    })

    connection.on("close", (event) => {
        connections.splice(connections.indexOf(connection), 1)
        console.log(`Connection closed with ${connection.url}`)
    })

    updateClients()
    console.log(`Connection ready with ${connection.url}.`)
})

server.on("error", (error) => {
    console.log(error);
})

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
            updateClients()
            updates++;
            if (updates % 60 == 0) {
                console.log(`Emitted ${updates} updates`)
            }
        }, 0)
    }
}, 0)

function updateClients() {
    switch (state.map.tiles[0][0]) {
        case TileType.EMPTY:
            state.map.tiles[0][0] = TileType.WALL
            break;
        case TileType.WALL:
            state.map.tiles[0][0] = TileType.EMPTY
            break;
    }
    // Update states
    server.clients.forEach(async (client) => {

        client.send(gameStateToBinary(state))
    })
}

console.log(`Server initialized at ${JSON.stringify(server.address())}`)

process.on("SIGINT", function () {
    console.log("Closed server!")
    server.close()
    process.exit(1);
});
