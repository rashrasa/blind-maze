import {
    TileType,
    gameStateFromBinary,
    gameStateToBinary,
    playerStateToBinary
} from "@blind-maze/types";

import type {
    GameSnapshot,
    Player,
    PlayerSnapshot,
} from "@blind-maze/types";


import WebSocketAsPromised from "websocket-as-promised";
import "crypto";

const PLAYER_SPEED = 30
const PIXELS_PER_TILE = 20
const PLAYER_SQUARE_LENGTH_TILES = .9
const TICK_RATE = 60;

// Appends itself to container
export class GameClient {
    // Instance constants
    private readonly container: HTMLDivElement;
    private readonly canvas: HTMLCanvasElement;
    private readonly thisPlayer: Player;
    private readonly viewPortWidthPx: number;
    private readonly viewPortHeightPx: number;
    private readonly clientContainer: HTMLElement

    private updates = 0;

    // State
    private host: string | null;
    private webSocketConnection: WebSocket | null;
    private lastGameSnapshot: GameSnapshot | null;
    private lastThisPlayerSnapshot: PlayerSnapshot | null;
    private keysPressed: Map<string, boolean>
    private isVisible = false;
    private disposed: boolean;

    constructor(player: Player, clientContainer: HTMLElement, viewPortWidthPx: number, viewPortHeightPx: number) {
        this.container = document.createElement("div");
        this.container.className = "w-[600px] h-[600px]"

        this.container.style.display = "none"

        this.viewPortWidthPx = viewPortWidthPx;
        this.viewPortHeightPx = viewPortHeightPx;

        this.canvas = document.createElement("canvas");
        this.canvas.width = viewPortWidthPx;
        this.canvas.height = viewPortHeightPx;
        this.clientContainer = clientContainer;

        if (this.clientContainer.ownerDocument.defaultView == null) {
            console.error("Could not bind keyboard events to window.");
        }
        else {
            this.clientContainer.ownerDocument.defaultView.addEventListener("keydown", this.handleKeyDown.bind(this));
            this.clientContainer.ownerDocument.defaultView.addEventListener("keyup", this.handleKeyUp.bind(this));
        }

        this.thisPlayer = player;
        this.container.appendChild(this.canvas);
        clientContainer.appendChild(this.container);

        this.host = null;
        this.webSocketConnection = null;
        this.lastGameSnapshot = null;
        this.lastThisPlayerSnapshot = null;
        this.keysPressed = new Map()
        this.disposed = false
    }

    public dispose() {
        if (this.clientContainer.ownerDocument.defaultView == null) {
            console.error("Could not unbind keyboard events to window.");
        }
        else {
            this.setVisibility(false)
            this.webSocketConnection?.close()
            this.clientContainer.ownerDocument.defaultView?.removeEventListener("keydown", this.handleKeyDown.bind(this))
            this.clientContainer.ownerDocument.defaultView?.removeEventListener("keyup", this.handleKeyUp.bind(this))
        }
        this.disposed = true;
    }


    public async connectToServer(serverLocation: string): Promise<boolean> {
        let connection = new WebSocketAsPromised(serverLocation);
        await connection.open();

        let initialState = false
        let intitalPlayerState = {
            player: this.thisPlayer,
            isLeader: false,
            position: {
                x: 1.5,
                y: 1.5
            },
            velocity: {
                x: 0,
                y: 0
            },
            snapshotTimestampMs: Date.now()
        }
        if (connection.ws == null) {
            return false
        }
        else {
            connection.ws.addEventListener("message", (ev) => {
                let data = gameStateFromBinary(ev.data)

                if (!initialState) {
                    initialState = true;
                    console.log(`Received state:` + JSON.stringify(data))
                }
                this.lastGameSnapshot = data
                const thisPlayerSnapshot: PlayerSnapshot | undefined = this.lastGameSnapshot.playerStates.find((playerState) =>
                    playerState.player.id === this.thisPlayer.id
                )
                if (thisPlayerSnapshot != undefined) {
                    this.lastThisPlayerSnapshot = thisPlayerSnapshot;
                }
                else {
                    console.warn("Received game state without current player.")
                }
            })
            connection.ws.addEventListener("close", () => {
                this.host = null
                this.webSocketConnection = null;
            })
            this.host = serverLocation
            this.webSocketConnection = connection.ws
        }
        this.sendUpdateToServer(connection.ws, intitalPlayerState)
        requestAnimationFrame(this.renderUntilStopped.bind(this))
        return true;
    }

    public setVisibility(visible: boolean) {
        if (visible) {
            this.container.style.display = "block"
        }
        else {
            this.container.style.display = "none"
        }
        this.isVisible = visible;
    }

    public isClientVisible() {
        return this.isVisible;
    }

    private async renderUntilStopped(timeElapsed: number) {
        if (this.disposed == true) {
            console.info("Shutting down renderer.");
            cancelAnimationFrame(timeElapsed)
            return;
        }
        if (this.lastGameSnapshot != null || true) {
            if ((timeElapsed) / (1000.0 / TICK_RATE) > this.updates) {
                this.handleInputState()
                this.tick(1000.0 / TICK_RATE);
                this.renderGameOnCanvas(this.lastGameSnapshot)
                this.updates++;
                await this.sendUpdateToServer(this.webSocketConnection!, this.lastThisPlayerSnapshot!)
            }

        }
        requestAnimationFrame(this.renderUntilStopped.bind(this))
    }

    private renderGameOnCanvas(state: GameSnapshot | null) {
        const context = this.canvas.getContext("2d");
        if (context == null) {
            console.warn("Attempted to draw on non-existant canvas")
            return
        }
        context.rect(0, 0, this.viewPortWidthPx, this.viewPortHeightPx);
        context.fill()

        if (state == null) {
            console.warn("Could not render full client, state is null");
            return;
        }

        const playerStates: PlayerSnapshot[] = state.playerStates

        const CENTER_X = this.lastThisPlayerSnapshot?.position.x ?? 7.5
        const CENTER_Y = this.lastThisPlayerSnapshot?.position.y ?? 7.5

        const viewPortHeightPx = this.canvas.height
        const viewPortWidthPx = this.canvas.width

        const tiles: TileType[][] = state.map.tiles;

        context.clearRect(0, 0, viewPortWidthPx, viewPortHeightPx)

        context.strokeStyle = "black"
        context.lineWidth = 1
        // Row
        for (let i = 0; i < tiles.length; i++) {
            // Column
            for (let j = 0; j < tiles[i]!.length; j++) {
                context.fillStyle = tiles[i]![j] ? "white" : "black"
                context.fillRect(
                    viewPortWidthPx / 2 + (-CENTER_X + j) * PIXELS_PER_TILE,
                    viewPortHeightPx / 2 + (-CENTER_Y + i) * PIXELS_PER_TILE,
                    PIXELS_PER_TILE,
                    PIXELS_PER_TILE
                )
            }
        }

        context.strokeStyle = "white"
        context.lineWidth = 1
        for (const player of playerStates) {
            if (player == undefined) {
                console.warn("WARNING: Undefined player object received.")
                continue;
            }
            const playerX = player.position.x
            const playerY = player.position.y
            context.fillStyle = player.player.color ?? "white"
            context.beginPath()
            context.arc(
                viewPortWidthPx / 2 + (-CENTER_X + playerX) * PIXELS_PER_TILE,
                viewPortHeightPx / 2 + (-CENTER_Y + playerY) * PIXELS_PER_TILE,
                PLAYER_SQUARE_LENGTH_TILES * PIXELS_PER_TILE / 2,
                0,
                2 * Math.PI
            )
            context.fill()
        }
    }

    private async sendUpdateToServer(server: WebSocket, updatedState: PlayerSnapshot): Promise<void> {
        server?.send(playerStateToBinary(updatedState));
    }

    // Main function for updating the game
    private tick(milliseconds: number) {
        if (this.lastThisPlayerSnapshot == null) {
            console.warn("Tried ticking without a player snaphot. Ignoring.")
            return;
        }
        let updatedState: PlayerSnapshot = {
            isLeader: this.lastThisPlayerSnapshot!.isLeader,
            player: this.lastThisPlayerSnapshot!.player,
            position: {
                x: this.lastThisPlayerSnapshot!.position.x + this.lastThisPlayerSnapshot!.velocity.x * milliseconds / 1000.0,
                y: this.lastThisPlayerSnapshot!.position.y + this.lastThisPlayerSnapshot!.velocity.y * milliseconds / 1000.0
            },
            velocity: this.lastThisPlayerSnapshot!.velocity,
            snapshotTimestampMs: Date.now()
        }
        this.lastThisPlayerSnapshot = updatedState;
    }

    private handleKeyUp(event: KeyboardEvent) {
        if (!this.isVisible) return;
        const inputKey = event.code
        if (this.lastThisPlayerSnapshot == null) {
            throw Error("Unexpected Error: thisPlayer state is null")
        }
        switch (inputKey) {
            case "ArrowUp":
                event.preventDefault()
                this.keysPressed.set("ArrowUp", false)
                break;
            case "ArrowDown":
                event.preventDefault()
                this.keysPressed.set("ArrowDown", false)
                break;
            case "ArrowLeft":
                event.preventDefault()
                this.keysPressed.set("ArrowLeft", false)
                break;
            case "ArrowRight":
                event.preventDefault()
                this.keysPressed.set("ArrowRight", false)
                break;
            default:
                return;
        }
        this.handleInputState();
    }

    private handleKeyDown(event: KeyboardEvent) {
        if (!this.isVisible) return;
        const inputKey = event.code
        if (this.lastThisPlayerSnapshot == null) {
            throw Error("Unexpected Error: thisPlayer state is null")
        }
        switch (inputKey) {
            case "ArrowUp":
                event.preventDefault()
                this.keysPressed.set("ArrowUp", true)
                break;
            case "ArrowDown":
                event.preventDefault()
                this.keysPressed.set("ArrowDown", true)
                break;
            case "ArrowLeft":
                event.preventDefault()
                this.keysPressed.set("ArrowLeft", true)
                break;
            case "ArrowRight":
                event.preventDefault()
                this.keysPressed.set("ArrowRight", true)
                break;
            default:
                return;
        }
        this.handleInputState();
    }

    private handleInputState() {
        if (!this.isVisible) return;
        if (this.lastThisPlayerSnapshot == null) {
            throw Error("Unexpected Error: thisPlayer state is null")
        }
        let velocity = {
            x: 0,
            y: 0
        };

        if (this.keysPressed.get("ArrowUp")) velocity.y -= PLAYER_SPEED;
        if (this.keysPressed.get("ArrowDown")) velocity.y += PLAYER_SPEED;
        if (this.keysPressed.get("ArrowLeft")) velocity.x -= PLAYER_SPEED;
        if (this.keysPressed.get("ArrowRight")) velocity.x += PLAYER_SPEED;


        let updatedState: PlayerSnapshot = {
            player: this.lastThisPlayerSnapshot.player,
            isLeader: this.lastThisPlayerSnapshot.isLeader,
            position: {
                x: this.lastThisPlayerSnapshot.position.x,
                y: this.lastThisPlayerSnapshot.position.y
            },
            velocity: velocity,
            snapshotTimestampMs: Date.now()
        }
        this.lastThisPlayerSnapshot = updatedState;
    }
}