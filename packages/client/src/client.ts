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

// Appends itself to container
export class GameClient {
    // Instance constants
    private readonly container: HTMLDivElement;
    private readonly canvas: HTMLCanvasElement;
    private readonly thisPlayer: Player;

    // State
    private host: string | null;
    private webSocketConnection: WebSocket | null;
    private lastGameSnapshot: GameSnapshot | null;
    private lastThisPlayerSnapshot: PlayerSnapshot | null;
    private keysPressed: Map<string, boolean>
    private disposed: boolean;

    constructor(player: Player, clientContainer: HTMLElement, viewPortWidthPx: number, viewPortHeightPx: number) {
        this.container = document.createElement("div");
        this.container.className = "w-[600px] h-[600px]"

        this.canvas = document.createElement("canvas");
        this.canvas.width = viewPortWidthPx;
        this.canvas.height = viewPortHeightPx;

        this.canvas.addEventListener("keydown", this.handleKeyDown);
        this.canvas.addEventListener("keyup", this.handleKeyUp);

        this.thisPlayer = player;
        this.container.appendChild(this.canvas);
        clientContainer.appendChild(this.container);

        this.host = null;
        this.webSocketConnection = null;
        this.lastGameSnapshot = null;
        this.lastThisPlayerSnapshot = null;
        this.keysPressed = new Map()
        this.disposed = false

        this.startRenderLoop();
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
                    console.error("Received game state without current player.")
                }
            })
            connection.ws.addEventListener("close", () => {
                this.host = null
                this.webSocketConnection = null;
            })
            this.host = serverLocation
            this.webSocketConnection = connection.ws
        }
        this.updateStateAndServer(connection.ws, intitalPlayerState)
        return true;
    }


    public dispose() {
        this.canvas.removeEventListener("keydown", this.handleKeyDown)
        this.canvas.removeEventListener("keyup", this.handleKeyUp)
        this.disposed = true;
    }

    private startRenderLoop() {
        if (this.disposed == true) {
            console.warn("Attempted to start render loop while disposed.");
            return;
        }

        requestAnimationFrame(this.renderUntilStopped)
    }

    private renderUntilStopped() {
        if (this.disposed == true) {
            console.info("Shutting down renderer.");
            return;
        }
        if (this.lastGameSnapshot != null) this.renderGameOnCanvas(this.lastGameSnapshot)
        requestAnimationFrame(this.renderUntilStopped)
    }

    private renderGameOnCanvas(state: GameSnapshot) {
        const context = this.canvas.getContext("2d");
        if (context == null) {
            console.warn("Attempted to draw on non-existant canvas")
            return
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

    private async updateStateAndServer(server: WebSocket, updatedState: PlayerSnapshot): Promise<void> {
        server!.send(playerStateToBinary(updatedState));
    }

    private handleKeyUp(event: KeyboardEvent) {
        const inputKey = event.code
        const previous = this.keysPressed.get(inputKey)
        if (this.lastThisPlayerSnapshot == null) {
            throw Error("Unexpected Error: thisPlayer state is null")
        }
        if (previous == undefined || previous == false) {
            return;
        }
        switch (inputKey) {
            case "ArrowUp":
                this.keysPressed.set("ArrowUp", false)
                break;
            case "ArrowDown":
                this.keysPressed.set("ArrowDown", false)
                break;
            case "ArrowLeft":
                this.keysPressed.set("ArrowLeft", false)
                break;
            case "ArrowRight":
                this.keysPressed.set("ArrowRight", false)
                break;
            default:
                return;
        }
        this.handleInputState();
    }

    private handleKeyDown(event: KeyboardEvent) {
        const inputKey = event.code
        const previous = this.keysPressed.get(inputKey)
        if (this.lastThisPlayerSnapshot == null) {
            throw Error("Unexpected Error: thisPlayer state is null")
        }
        if (previous != undefined && previous == true) {
            return;
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
        if (this.lastThisPlayerSnapshot == null) {
            throw Error("Unexpected Error: thisPlayer state is null")
        }
        let velocity = {
            x: 0,
            y: 0
        };
        // refreshInputState();
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
        this.updateStateAndServer(this.webSocketConnection!, updatedState)
    }
}