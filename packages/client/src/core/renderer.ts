import { GameSnapshot, Player, PlayerSnapshot, TileType } from "@blind-maze/types";

export const PIXELS_PER_TILE = 50

// Should be moved to global constants
export const PLAYER_SQUARE_LENGTH_TILES = .5
export const PARTICLE_SQUARE_LENGTH_TILES = 0.2
export const PLAYER_SPEED = 5
export const PARTICLE_INITIAL_VELOCITY = 100
export const PARTICLE_LIFETIME_MS = 10000
export const CANVAS_ID = "home_main_game_canvas_id"

export interface Renderer {
    isClientVisible(): boolean,
    getMainCanvas(): HTMLElement,
    dispose(): void,
    render(state: GameSnapshot, centerX: number, centerY: number): void,
    attachPlayerIdentity(player: Player): void,
    requestFullscreenMode(): void,
    exitFullScreenMode(): void,
    getDimensions(): { width: number, height: number, x: number, y: number }
    updateDimensions(width: number | null, height: number | null): void,
    setVisibility(visible: boolean): void
}

export class DefaultRenderer implements Renderer {
    // Instance constants
    private readonly container: HTMLDivElement;
    private readonly canvas: HTMLCanvasElement;
    private readonly clientContainer: HTMLElement
    private readonly originalViewPortWidthPx: number;
    private readonly originalViewPortHeightPx: number;

    private playerIdentityMapping: Map<string, Player> = new Map<string, Player>();
    private viewPortWidthPx: number;
    private viewPortHeightPx: number;
    private isVisible = false;
    private isMinimized = true;
    private disposed: boolean = false;


    constructor(clientContainer: HTMLElement, viewPortWidthPx: number, viewPortHeightPx: number) {
        this.originalViewPortWidthPx = viewPortWidthPx
        this.originalViewPortHeightPx = viewPortHeightPx
        this.container = document.createElement("div");
        this.container.className = `w-[${viewPortWidthPx}px] h-[${viewPortHeightPx}px]`

        this.container.style.display = "none"

        this.viewPortWidthPx = viewPortWidthPx;
        this.viewPortHeightPx = viewPortHeightPx;

        this.canvas = document.createElement("canvas");
        this.canvas.width = viewPortWidthPx;
        this.canvas.height = viewPortHeightPx;
        this.canvas.id = CANVAS_ID
        this.canvas.className = "select-none"
        this.clientContainer = clientContainer;

        this.container.appendChild(this.canvas);
        clientContainer.appendChild(this.container);
    }

    getDimensions(): { width: number; height: number; x: number; y: number } {
        let dims = this.canvas.getBoundingClientRect()
        return {
            width: dims.width,
            height: dims.height,
            x: dims.left,
            y: dims.top
        }
    }

    updateDimensions(width: number | null, height: number | null) {
        if (width != null) {
            this.canvas.width = width
        }
        if (height != null) {
            this.canvas.height = height
        }
        let previousWidth = this.viewPortWidthPx
        let previousHeight = this.viewPortHeightPx

        this.container.className = `w-[${width ?? previousWidth}px] h-[${height ?? previousHeight}px] select-none`
        this.viewPortWidthPx = width ?? previousWidth;
        this.viewPortHeightPx = height ?? previousHeight;

    }

    requestFullscreenMode(): void {
        this.canvas.requestFullscreen();
        this.updateDimensions(window.outerWidth, window.outerHeight)
        this.isMinimized = false
    }

    exitFullScreenMode(): void {
        if (this.isMinimized == true) {
            return;
        }
        this.updateDimensions(this.originalViewPortWidthPx, this.originalViewPortHeightPx)
        this.isMinimized = true
    }


    attachPlayerIdentity(player: Player): void {
        this.playerIdentityMapping.set(player.uuid, player)
    }

    isClientVisible(): boolean {
        return this.isVisible;
    }

    getMainCanvas(): HTMLElement {
        return document.getElementById(CANVAS_ID)!;
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
            context.fillStyle = this.playerIdentityMapping.get(player.uuid)?.color ?? "white"
            context.beginPath()
            context.arc(
                this.viewPortWidthPx / 2 + (-centerX + playerX) * PIXELS_PER_TILE,
                this.viewPortHeightPx / 2 + (-centerY + playerY) * PIXELS_PER_TILE,
                PLAYER_SQUARE_LENGTH_TILES * PIXELS_PER_TILE / 2,
                0,
                2 * Math.PI
            )
            context.closePath()
            context.fill()
        }

        context.strokeStyle = "yellow"
        for (const particle of state.particles) {
            context.beginPath()
            context.arc(
                this.viewPortWidthPx / 2 + (-centerX + particle.position.x) * PIXELS_PER_TILE,
                this.viewPortHeightPx / 2 + (-centerY + particle.position.y) * PIXELS_PER_TILE,
                PARTICLE_SQUARE_LENGTH_TILES * PIXELS_PER_TILE / 2,
                0,
                2 * Math.PI
            )
            context.closePath()
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