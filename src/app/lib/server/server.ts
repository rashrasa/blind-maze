// Standalone server component capable of accepting connections from game clients

import { WebSocketServer } from 'ws';
import { GameState } from '../types/game_types';
import { gameStateToBinary } from '../types/communication';
import config from './server-config.json';

// Simple websocket server
const ip = config.host
const port = config.port

const server = new WebSocketServer({
    host: ip,
    port: port
});

const connections: string[] = []
var state: GameState = {
    playerStates: [],
    map: {
        width: 0,
        height: 0,
        tiles: []
    }
}

var open = true;

server.on("connection", (connection) => {
    console.log(`Established connection with ${connection.url}`)

    // Handle inputs
    connection.on('message', (event) => {
        // Potentially receive full player states
    })

    connection.send(`Connection ready with ${server.address()}.`);
    console.log(`Connection ready with ${server.address()}.`)
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
async () => {
    const startTimeMs = Date.now();
    const TICK_RATE = config.tickRate;
    let updates = 0;
    while (open) {

        if (
            (Date.now() - startTimeMs) / 1000 * TICK_RATE > updates
        ) {
            // Update states
            server.clients.forEach(async (client) => {
                client.send(gameStateToBinary(state))
            })
        }

    }
}

console.log(`Server initialized at ${server.address()}`)