import {
    TileType,
    gameStateFromBinary,
    composeUpdateMessageToServer,
    playerToBinary,
    composeNewConnectionMessage
} from "@blind-maze/types";

import type {
    GameSnapshot,
    Player,
    PlayerSnapshot,
} from "@blind-maze/types";

import { DefaultRenderer, PLAYER_SPEED, PLAYER_SQUARE_LENGTH_TILES, Renderer } from "./core/renderer.js"
import { DefaultInputHandler, InputHandler } from "./core/inputs.js"

import WebSocketAsPromised from "websocket-as-promised";
import "crypto";

// Appends itself to container
export class GameClient {
    private renderer: Renderer;
    private inputHandler: InputHandler;
    private readonly thisPlayer: Player;

    // State
    private host: string | null;
    private webSocketConnection: WebSocket | null;
    private lastGameSnapshot: GameSnapshot | null;
    private lastThisPlayerSnapshot: PlayerSnapshot | null;
    private lastRenderMs: number;
    private updates: number;

    private disposed: boolean;

    constructor(player: Player, clientContainer: HTMLElement, viewPortWidthPx: number, viewPortHeightPx: number) {
        this.renderer = new DefaultRenderer(clientContainer, viewPortWidthPx, viewPortHeightPx);
        this.inputHandler = new DefaultInputHandler(this.renderer.getMainCanvas())

        this.updates = 0;
        this.lastRenderMs = 0;

        this.inputHandler.addInputStateHandler((keysPressed) => {
            if (this.lastThisPlayerSnapshot != null) {
                let newVelocity = {
                    x: 0,
                    y: 0
                };

                if (keysPressed.get("ArrowUp")) newVelocity.y -= PLAYER_SPEED;
                if (keysPressed.get("ArrowDown")) newVelocity.y += PLAYER_SPEED;
                if (keysPressed.get("ArrowLeft")) newVelocity.x -= PLAYER_SPEED;
                if (keysPressed.get("ArrowRight")) newVelocity.x += PLAYER_SPEED;


                let updatedState: PlayerSnapshot = {
                    player: this.lastThisPlayerSnapshot.player,
                    isLeader: this.lastThisPlayerSnapshot.isLeader,
                    position: {
                        x: this.lastThisPlayerSnapshot.position.x,
                        y: this.lastThisPlayerSnapshot.position.y
                    },
                    velocity: newVelocity,
                    snapshotTimestampMs: Date.now()
                }
                this.lastThisPlayerSnapshot = updatedState;
            }
            else {
                console.warn("Received input before receiving initial game state. Ignoring..")
            }
        })

        this.thisPlayer = player;
        this.host = null;
        this.webSocketConnection = null;
        this.lastGameSnapshot = null;
        this.lastThisPlayerSnapshot = null;
        this.disposed = false
    }

    public dispose() {
        this.renderer.dispose()
        this.inputHandler.dispose()
        this.webSocketConnection?.close()

        this.disposed = true;
    }

    /**  On successful connection, starts rendering immediately. */
    public async connectToServer(serverLocation: string): Promise<boolean> {
        let connection = new WebSocketAsPromised(serverLocation);
        await connection.open();

        let initialState = false
        if (connection.ws == null) {
            return false
        }
        else {
            connection.ws.addEventListener("message", async (ev) => {
                let buffer: ArrayBuffer;

                if (typeof ev.data == "string") {
                    console.log("Received string message: " + ev.data)
                    return
                }
                switch (connection.ws!.binaryType) {
                    case "arraybuffer":
                        buffer = ev.data
                        break;
                    case "blob":
                        if (ev.data == undefined) {
                            console.error("Invalid message data. Message.event is undefined")
                            return
                        }
                        buffer = await ev.data!.arrayBuffer()
                        break;
                }

                let data = gameStateFromBinary(buffer!)

                if (!initialState) {
                    initialState = true;
                    console.log(`Received state:` + JSON.stringify(data))
                }

                const thisPlayerSnapshot: PlayerSnapshot | undefined = data.playerStates.find((playerState) =>
                    playerState.player.id === this.thisPlayer.id
                )
                if (thisPlayerSnapshot != undefined) {
                    this.lastThisPlayerSnapshot = thisPlayerSnapshot;
                }
                else {
                    this.lastThisPlayerSnapshot = null
                    console.warn("Received game state without current player.")
                }

                this.lastGameSnapshot = data
            })
            connection.ws.addEventListener("close", () => {
                this.host = null
                this.webSocketConnection = null;
            })
            this.host = serverLocation
            this.webSocketConnection = connection.ws
        }
        let initialMessage: Uint8Array = composeNewConnectionMessage(this.thisPlayer)

        connection.ws.send(initialMessage)

        requestAnimationFrame(this.renderUntilStopped.bind(this))
        return true;
    }

    public setVisibility(visible: boolean) {
        this.renderer.setVisibility(visible)
    }

    public isClientVisible() {
        return this.renderer.isClientVisible();
    }

    private async renderUntilStopped(timeElapsed: number) {
        if (this.disposed == true) {
            console.info("Shutting down renderer.");
            cancelAnimationFrame(timeElapsed)
            return;
        }
        if (this.lastGameSnapshot != null) {
            if (!this.isClientVisible()) return;
            if (this.lastThisPlayerSnapshot == null) {
                console.warn("Warning: thisPlayer state is null")
                return
            }
            this.inputHandler.handleInputState()
            this.tick(timeElapsed - this.lastRenderMs);
            this.renderer.render(
                this.lastGameSnapshot,
                this.lastThisPlayerSnapshot.position.x,
                this.lastThisPlayerSnapshot.position.y
            )
            this.lastRenderMs = timeElapsed;
            this.updates++;
            await this.sendUpdateToServer(this.webSocketConnection!, this.lastThisPlayerSnapshot!)
        }
        requestAnimationFrame(this.renderUntilStopped.bind(this))
    }


    private async sendUpdateToServer(server: WebSocket, updatedState: PlayerSnapshot): Promise<void> {
        server.send(composeUpdateMessageToServer(updatedState));
    }

    // Main function for updating the game state
    private tick(milliseconds: number) {
        if (this.lastThisPlayerSnapshot == null) {
            console.warn("Tried ticking without a player snaphot. Ignoring.")
            return;
        }

        if (this.lastGameSnapshot == null) {
            console.warn("Tried ticking before receiving an initial game snapshot. Ignoring.")
            return;
        }

        let centerX = this.lastThisPlayerSnapshot!.position.x
        let centerY = this.lastThisPlayerSnapshot!.position.y

        let playerLeftX = centerX - PLAYER_SQUARE_LENGTH_TILES / 2.0
        let playerRightX = centerX + PLAYER_SQUARE_LENGTH_TILES / 2.0

        let playerTopY = centerY - PLAYER_SQUARE_LENGTH_TILES / 2.0
        let playerBottomY = centerY + PLAYER_SQUARE_LENGTH_TILES / 2.0

        let currentVX = this.lastThisPlayerSnapshot!.velocity.x
        let currentVY = this.lastThisPlayerSnapshot!.velocity.y

        let newVX = this.lastThisPlayerSnapshot!.velocity.x
        let newVY = this.lastThisPlayerSnapshot!.velocity.y

        let tiles = this.lastGameSnapshot!.map.tiles;


        // Only check nearby tiles
        let startRowInclusive = Math.max(0, Math.floor(playerTopY - 1))
        let endRowInclusive = Math.min(tiles.length - 1, Math.ceil(playerBottomY + 1))

        let startColumnInclusive = Math.max(0, Math.floor(playerLeftX - 1))
        let endColumnInclusive = Math.min(tiles[0]!.length - 1, Math.ceil(playerRightX + 1))

        for (let j = startRowInclusive; j <= endRowInclusive; j++) {
            let row = tiles[j]!


            for (let i = startColumnInclusive; i <= endColumnInclusive; i++) {
                if (row[i]! == TileType.EMPTY) {
                    continue;
                }

                // Heading right
                if (currentVX > 0) {
                    if ((playerRightX > i && playerRightX < i + 1) && (centerY > j && centerY < j + 1)) {
                        newVX = 0;
                    }
                }
                // Heading left 
                else if (currentVX < 0) {
                    if ((playerLeftX < i + 1 && playerLeftX > i) && (centerY > j && centerY < j + 1)) {
                        newVX = 0;
                    }
                }

                // Heading down
                if (currentVY > 0) {
                    if ((playerBottomY > j && playerBottomY < j + 1) && (centerX > i && centerX < i + 1)) {
                        newVY = 0;
                    }
                }
                // Heading up 
                else if (currentVY < 0) {
                    if ((playerTopY < j + 1 && playerTopY > j) && (centerX > i && centerX < i + 1)) {
                        newVY = 0;
                    }
                }

            }
        }

        let updatedState: PlayerSnapshot = {
            isLeader: this.lastThisPlayerSnapshot!.isLeader,
            player: this.lastThisPlayerSnapshot!.player,
            position: {
                x: this.lastThisPlayerSnapshot!.position.x + newVX * milliseconds / 1000.0,
                y: this.lastThisPlayerSnapshot!.position.y + newVY * milliseconds / 1000.0
            },
            velocity: {
                x: newVX,
                y: newVY
            },
            snapshotTimestampMs: Date.now()
        }
        this.lastThisPlayerSnapshot = updatedState;
    }
}