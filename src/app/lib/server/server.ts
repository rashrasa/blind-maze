// Standalone server component capable of accepting connections from game clients

import { WebSocketServer, WebSocket } from 'ws';
import { GameState } from '../types/game_types';
import { gameStateToBinary } from '../types/communication';
import config from './server-config.json';

// Simple websocket server
const ip: string = config.host
const port: number = config.port

const server = new WebSocketServer({
    port: 3001
});

let connections: WebSocket[] = []

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
    connections.push(connection)

    // Handle inputs
    connection.on('message', (event) => {
        // Potentially receive full player states
    })

    connection.on("close", (event) => {
        connections = connections.filter((ws) => {
            return ws !== connection
        })
    })

    connection.send(`Connection ready with ${connection.url}.`);
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


async function serverLoop() {
    while (open) {
        // Emit constant rate of current states
        const startTimeMs = Date.now();
        const TICK_RATE = config.tickRate;
        let updates = 0;

        if (
            (Date.now() - startTimeMs) / 1000 * TICK_RATE > updates
        ) {
            // Update states
            server.clients.forEach(async (client) => {
                client.send(gameStateToBinary(state))
            })
            updates++;
            if (updates % 60 == 0) {
                console.log(`Emitted ${updates} updates`)
            }
        }
    }
}

console.log(`Server initialized at ${JSON.stringify(server.address())}`)

process.on("SIGINT", function () {
    console.log("Closed server!")
    server.close()
    process.exit(1);
});