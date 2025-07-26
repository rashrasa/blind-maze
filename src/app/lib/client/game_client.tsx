"use client";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { GameState, Player, PlayerSnapshot, TileType } from "../types/game_types";
import { gameStateFromBinary, gameStateToBinary, playerStateToBinary } from "../types/communication";
import WebSocketAsPromised from "websocket-as-promised";
import "node:crypto";
import { hello_wasm } from "../../../../wasm/game-client/pkg";


enum GameClientMenu {
    MAIN_MENU,
    SETTINGS_MENU,
    GAME_SCREEN,
}

interface GameClientState {
    menu: GameClientMenu;
    server: WebSocketAsPromised | null;
}

interface GameClientProps {
    viewPortHeight: number,
    viewPortWidth: number
}

var keysPressed: Map<string, boolean> = new Map()

const PLAYER_SPEED = 35
const PIXELS_PER_TILE = 10
const PLAYER_SQUARE_LENGTH_TILES = .9

const playerId: string = crypto.randomUUID()
const player: Player = {
    id: playerId,
    displayName: "Player 0",
    username: "username",
    avatarUrl: "google.ca"
}

const GameClient: React.FC<GameClientProps> = (props) => {
    const viewPortHeight = props.viewPortHeight
    const viewPortWidth = props.viewPortWidth
    const serverInput = useRef<HTMLTextAreaElement>(null);
    const error = useRef<string>(null)

    const [state, setState] = useState<GameClientState>({
        menu: GameClientMenu.MAIN_MENU,
        server: null,
    });

    const [gameStateSnapshot, setGameStateSnapshot] = useState<GameState | null>(null);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
            window.removeEventListener("keyup", handleKeyUp)
        }
    })
    switch (state.menu) {
        case GameClientMenu.MAIN_MENU: {
            return (
                <div className="flex flex-col space-y-2 p-8 w-full h-full">
                    <span className="text-center text-3xl">
                        Main Menu
                    </span>
                    <hr className="py-4" />
                    <span className="text-2xl font-bold text-center" style={{ fontFamily: "Segoe UI" }}>Server Address</span>
                    <textarea ref={serverInput} defaultValue={"127.0.0.1:3001"} className="border-2 border-black resize-none" rows={1} placeholder="Enter server IP and Port..." />
                    <span
                        className="
                            bg-green-600
                            border-green-900
                            border-2
                          text-white
                            font-bold
                            text-3xl
                            mx-auto
                            text-center
                            cursor-pointer
                            hover:bg-green-500
                            active:bg-green-700
                        "
                        onClick={
                            async (event) => {
                                let server = await connectToServer("ws://" + serverInput?.current?.value)
                                if (server == null) {
                                    error.current = "Error: Failed to connect to server."
                                }
                            }
                        }>
                        <span className="mx-20 my-20 text-center align-middle">Connect</span>
                    </span>
                </div>
            )
        }
        case GameClientMenu.SETTINGS_MENU:
            return (
                <div></div>
            );
        case GameClientMenu.GAME_SCREEN:
            return (
                <div
                    className="bg-black w-full h-full"
                >
                    {/* Z = 10 */}
                    <span className="absolute z-10 text-gray-300">Connected to: {state?.server?.ws?.url.substring("ws://".length)}
                        <span className="cursor-pointer text-red-400"
                            onClick={() => {
                                state.server?.close();
                                setState({
                                    server: null,
                                    menu: GameClientMenu.MAIN_MENU
                                })
                            }}> Disconnect</span>
                    </span>
                    {/* Z = 0 */}
                    {(gameStateSnapshot != null) ?
                        renderGame(gameStateSnapshot, viewPortWidth, viewPortHeight) :
                        <span className="relative text-white" style={{ top: "250px", left: "155px" }}>
                            Initial game state not been received yet.
                        </span>}
                </div>
            );

    }
    function getPlayerState(): PlayerSnapshot | null {
        const currentState = gameStateSnapshot!.playerStates
        let playerResult = currentState.find(playerState => {
            return playerState.player.id === playerId
        })
        if (playerResult == undefined) return null;
        return playerResult;
    }
    function handleKeyUp(event: KeyboardEvent) {
        const inputKey = event.code
        const previous = keysPressed.get(inputKey)
        let playerState = getPlayerState()
        if (playerState == null) {
            throw Error("Unexpected Error: thisPlayer state is null")
        }
        if (previous == undefined || previous == false) {
            return;
        }
        switch (inputKey) {
            case "ArrowUp":
                keysPressed.set("ArrowUp", false)
                break;
            case "ArrowDown":
                keysPressed.set("ArrowDown", false)
                break;
            case "ArrowLeft":
                keysPressed.set("ArrowLeft", false)
                break;
            case "ArrowRight":
                keysPressed.set("ArrowRight", false)
                break;
            default:
                return;
        }
        handleInputState();
    }

    function handleKeyDown(event: KeyboardEvent) {
        const inputKey = event.code
        const previous = keysPressed.get(inputKey)
        let playerState = getPlayerState()
        if (playerState == null) {
            throw Error("Unexpected Error: thisPlayer state is null")
        }
        if (previous != undefined && previous == true) {
            return;
        }
        switch (inputKey) {
            case "ArrowUp":
                keysPressed.set("ArrowUp", true)
                break;
            case "ArrowDown":
                keysPressed.set("ArrowDown", true)
                break;
            case "ArrowLeft":
                keysPressed.set("ArrowLeft", true)
                break;
            case "ArrowRight":
                keysPressed.set("ArrowRight", true)
                break;
            default:
                return;
        }
        handleInputState();
    }

    function handleInputState() {
        let playerState = getPlayerState()
        if (playerState == null) {
            throw Error("Unexpected Error: thisPlayer state is null")
        }
        let velocity = {
            x: 0,
            y: 0
        };
        // refreshInputState();
        if (keysPressed.get("ArrowUp")) velocity.y -= PLAYER_SPEED;
        if (keysPressed.get("ArrowDown")) velocity.y += PLAYER_SPEED;
        if (keysPressed.get("ArrowLeft")) velocity.x -= PLAYER_SPEED;
        if (keysPressed.get("ArrowRight")) velocity.x += PLAYER_SPEED;


        let updatedState = {
            player: playerState.player,
            isLeader: playerState.isLeader,
            position: {
                x: playerState.position.x,
                y: playerState.position.y
            },
            velocity: velocity,
            snapshotTimestampMs: Date.now()
        }
        updateStateAndServer(state.server!.ws!, updatedState)
    }

    async function connectToServer(serverLocation: string | null): Promise<WebSocketAsPromised | null> {
        if (serverLocation == null) return null;
        let connection = new WebSocketAsPromised(serverLocation!);
        let result = await (connection.open());
        let initialState = false
        let intitalPlayerState = {
            player: player,
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
            return null
        }
        else {
            connection.ws.addEventListener("message", (ev) => {
                let data = gameStateFromBinary(ev.data)

                if (!initialState) {
                    initialState = true;
                    console.log(`Received state:` + JSON.stringify(data))
                }
                setGameStateSnapshot(data)
            })
            connection.ws.addEventListener("close", () => {
                setState({
                    server: null,
                    menu: GameClientMenu.MAIN_MENU
                })
            })
            setState({ server: connection, menu: GameClientMenu.GAME_SCREEN })
        }
        updateStateAndServer(connection.ws, intitalPlayerState)
        return connection;
    }
    async function updateStateAndServer(server: WebSocket, updatedState: PlayerSnapshot) {
        server!.send(playerStateToBinary(updatedState));
    }


    function renderGame(state: GameState, viewPortWidthPx: number, viewPortHeightPx: number): ReactNode {
        const playerStates: PlayerSnapshot[] = state.playerStates

        const thisPlayer: PlayerSnapshot | null = getPlayerState()

        const CENTER_X = thisPlayer?.position.x ?? 7.5
        const CENTER_Y = thisPlayer?.position.y ?? 7.5

        const tiles: TileType[][] = state.map.tiles;

        const tileElements: ReactNode[] = []
        const playerElements: ReactNode[] = []

        // Row
        for (let i = 0; i < tiles.length; i++) {
            // Column
            for (let j = 0; j < tiles[i].length; j++) {
                tileElements.push(
                    <rect
                        y={viewPortHeightPx / 2 + (-CENTER_Y + i) * PIXELS_PER_TILE}
                        x={viewPortWidthPx / 2 + (-CENTER_X + j) * PIXELS_PER_TILE}
                        width={PIXELS_PER_TILE}
                        height={PIXELS_PER_TILE}
                        z={0}
                        className="absolute"
                        style={{
                            fill: tiles[i][j] ? "white" : "black",
                            stroke: "black",
                            strokeWidth: 1
                        }}>
                    </rect >
                )
            }
        }

        for (const player of playerStates) {
            if (player == undefined) {
                console.warn("WARNING: Undefined player object received.")
                continue;
            }
            const playerX = player.position.x
            const playerY = player.position.y
            const speedX = player.velocity.x
            const speedY = player.velocity.y
            //console.log(`Player: (${playerX}, ${playerY}), Velocity(${speedX}, ${speedY}),\nRendered position: (${viewPortWidthPx / 2 + (-CENTER_X + playerX) * PIXELS_PER_TILE}px, ${viewPortHeightPx / 2 + (-CENTER_Y + playerY) * PIXELS_PER_TILE}px)`)

            playerElements.push(
                <circle
                    cy={viewPortHeightPx / 2 + (-CENTER_Y + playerY) * PIXELS_PER_TILE}
                    cx={viewPortWidthPx / 2 + (-CENTER_X + playerX) * PIXELS_PER_TILE}
                    r={PLAYER_SQUARE_LENGTH_TILES * PIXELS_PER_TILE / 2}
                    z={10}
                    stroke="white"
                    strokeWidth={1}
                    fill="green"
                    className="absolute">

                </circle>
            )
        }
        const rootElement = <svg width={viewPortWidthPx} height={viewPortHeightPx}
            className="relative"
            style={{
                maxWidth: `${viewPortWidthPx}px`,
                maxHeight: `${viewPortHeightPx}px`,
            }}>
            {...tileElements}
            {...playerElements}
        </svg>

        return rootElement
    }
}

export default GameClient;