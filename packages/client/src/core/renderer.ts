import { GameSnapshot, Player, PlayerSnapshot, TileType } from "@blind-maze/types";

export const PIXELS_PER_TILE = 50

// Should be moved to global constants
export const PLAYER_SQUARE_LENGTH_TILES = .5
export const PLAYER_SPEED = 5

export interface Renderer {
    isClientVisible(): boolean,
    getMainCanvas(): HTMLElement,
    dispose(): void,
    render(state: GameSnapshot, centerX: number, centerY: number): void,
    setVisibility(visible: boolean): void
}

export class DefaultRenderer implements Renderer {
    // Instance constants
    private readonly container: HTMLDivElement;
    private readonly canvas: HTMLCanvasElement;
    private readonly viewPortWidthPx: number;
    private readonly viewPortHeightPx: number;
    private readonly clientContainer: HTMLElement

    private isVisible = false;
    private disposed: boolean = false;

    constructor(clientContainer: HTMLElement, viewPortWidthPx: number, viewPortHeightPx: number) {
        this.container = document.createElement("div");
        this.container.className = `w-[${viewPortWidthPx}px] h-[${viewPortHeightPx}px]`

        this.container.style.display = "none"

        this.viewPortWidthPx = viewPortWidthPx;
        this.viewPortHeightPx = viewPortHeightPx;

        this.canvas = document.createElement("canvas");
        this.canvas.width = viewPortWidthPx;
        this.canvas.height = viewPortHeightPx;
        this.clientContainer = clientContainer;

        this.container.appendChild(this.canvas);
        clientContainer.appendChild(this.container);
    }

    isClientVisible(): boolean {
        return this.isVisible;
    }

    getMainCanvas(): HTMLElement {
        return this.canvas;
    }

    dispose() {
        if (this.clientContainer.ownerDocument.defaultView == null) {
            console.error("Could not unbind keyboard events to window.");
        }
        else {
            this.setVisibility(false)
        }

        this.disposed = true;
    }

    render(state: GameSnapshot, centerX: number, centerY: number) {
        const context = this.canvas.getContext("2d");
        if (context == null) {
            console.warn("Attempted to draw on non-existant canvas")
            return
        }

        context.fillStyle = "black"
        context.lineWidth = 0;
        context.fillRect(0, 0, this.viewPortWidthPx, this.viewPortHeightPx)

        if (state == null) {
            console.warn("Could not render full client, state is null");
            return;
        }

        const playerStates: PlayerSnapshot[] = state.playerStates

        const tiles: TileType[][] = state.map.tiles;

        context.strokeStyle = "black"
        // Row
        for (let i = 0; i < tiles.length; i++) {
            // Column
            for (let j = 0; j < tiles[i]!.length; j++) {
                context.fillStyle = tiles[i]![j] ? "white" : "black"
                context.fillRect(
                    this.viewPortWidthPx / 2 + (-centerX + j) * PIXELS_PER_TILE,
                    this.viewPortHeightPx / 2 + (-centerY + i) * PIXELS_PER_TILE,
                    PIXELS_PER_TILE,
                    PIXELS_PER_TILE
                )
            }
        }

        context.strokeStyle = "white"
        context.lineWidth = 2
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
                this.viewPortWidthPx / 2 + (-centerX + playerX) * PIXELS_PER_TILE,
                this.viewPortHeightPx / 2 + (-centerY + playerY) * PIXELS_PER_TILE,
                PLAYER_SQUARE_LENGTH_TILES * PIXELS_PER_TILE / 2,
                0,
                2 * Math.PI
            )
            context.fill()
        }

    }

    setVisibility(visible: boolean) {
        if (visible) {
            this.container.style.display = "block"
        }
        else {
            this.container.style.display = "none"
        }
        this.isVisible = visible;
    }
}