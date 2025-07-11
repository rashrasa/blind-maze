"use client";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { GameState, Player, PlayerSnapshot, TileType } from "../types/game_types";
import { gameStateFromBinary, gameStateToBinary, playerStateToBinary } from "../types/communication";
import WebSocketAsPromised from "websocket-as-promised";


enum GameClientMenu {
    MAIN_MENU,
    SETTINGS_MENU,
    GAME_SCREEN,
}

interface GameClientState {
    menu: GameClientMenu;
    server: WebSocket | null;
}

interface GameClientProps {
    viewPortHeight: number,
    viewPortWidth: number
}


const GameClient: React.FC<GameClientProps> = (props) => {
    const viewPortHeight = props.viewPortHeight
    const viewPortWidth = props.viewPortWidth
    const serverInput = useRef<HTMLTextAreaElement>(null);
    const error = useRef<string>(null)

    const PLAYER_SPEED = 0.5

    const thisPlayer: Player = {
        id: "abcde",
        displayName: "Player 0",
        username: "username",
        avatarUrl: "google.ca"
    }

    const [state, setState] = useState<GameClientState>({
        menu: GameClientMenu.MAIN_MENU,
        server: null,
    });

    const [playerState, setPlayerState] = useState<PlayerSnapshot>({
        player: thisPlayer,
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
    })

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
                                let initialState = false
                                if (server == null) {
                                    error.current = "Error: Failed to connect to server."
                                }
                                else {
                                    server.addEventListener("message", (ev) => {
                                        let data = gameStateFromBinary(ev.data)
                                        if (!initialState) {
                                            initialState = true;
                                            console.log(data)
                                        }
                                        setGameStateSnapshot(data)
                                    })
                                    server.addEventListener("close", () => {
                                        setState({
                                            server: null,
                                            menu: GameClientMenu.MAIN_MENU
                                        })
                                    })
                                    await sendUpdatedState(server, playerState)
                                    setState({ server: server, menu: GameClientMenu.GAME_SCREEN })
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
                    <span className="absolute z-10 text-gray-300">Connected to: {state?.server?.url.substring("ws://".length)} <span className="cursor-pointer text-red-400"
                        onClick={() => {
                            state.server?.close();
                            setState({
                                server: null,
                                menu: GameClientMenu.MAIN_MENU
                            })
                        }}>Disconnect</span>
                    </span>
                    {/* Z = 0 */}
                    {(gameStateSnapshot != null) ?
                        renderGame(gameStateSnapshot, playerState, viewPortWidth, viewPortHeight) :
                        <span className="relative text-white" style={{ top: "250px", left: "155px" }}>
                            Initial game state not been received yet.
                        </span>}
                </div>
            );

    }
    async function handleKeyUp(event: KeyboardEvent) {
        const inputKey = event.code
        let velocity;
        switch (inputKey) {
            case "ArrowUp":
                velocity = {
                    x: playerState.velocity.x,
                    y: playerState.velocity.y + PLAYER_SPEED
                }
                break;
            case "ArrowDown":
                velocity = {
                    x: playerState.velocity.x,
                    y: playerState.velocity.y - PLAYER_SPEED
                }
                break;
            case "ArrowLeft":
                velocity = {
                    x: playerState.velocity.x + PLAYER_SPEED,
                    y: playerState.velocity.y
                }
                break;
            case "ArrowRight":
                velocity = {
                    x: playerState.velocity.x - PLAYER_SPEED,
                    y: playerState.velocity.y
                }
                break;
            default:
                return;
        }
        let newState = {
            player: thisPlayer,
            isLeader: false,
            position: {
                x: playerState.position.x,
                y: playerState.position.y
            },
            velocity: velocity,
            snapshotTimestampMs: Date.now()
        }
        setPlayerState(newState)
        sendUpdatedState(state.server!, newState)
    }

    async function handleKeyDown(event: KeyboardEvent) {
        const inputKey = event.code
        let velocity;
        switch (inputKey) {
            case "ArrowUp":
                velocity = {
                    x: playerState.velocity.x,
                    y: playerState.velocity.y - PLAYER_SPEED
                }
                break;
            case "ArrowDown":
                velocity = {
                    x: playerState.velocity.x,
                    y: playerState.velocity.y + PLAYER_SPEED
                }
                break;
            case "ArrowLeft":
                velocity = {
                    x: playerState.velocity.x - PLAYER_SPEED,
                    y: playerState.velocity.y
                }
                break;
            case "ArrowRight":
                velocity = {
                    x: playerState.velocity.x + PLAYER_SPEED,
                    y: playerState.velocity.y
                }
                break;
            default:
                return;
        }
        let newState = {
            player: thisPlayer,
            isLeader: false,
            position: {
                x: playerState.position.x,
                y: playerState.position.y
            },
            velocity: velocity,
            snapshotTimestampMs: Date.now()
        }
        setPlayerState(newState)
        sendUpdatedState(state.server!, newState)
    }
}

async function connectToServer(server: string | null): Promise<WebSocket | null> {
    if (server == null) return null;
    let connection = new WebSocketAsPromised(server!);
    let result = await (connection.open());
    return connection.ws;
}

async function sendUpdatedState(server: WebSocket, state: PlayerSnapshot) {
    server.send(playerStateToBinary(state));
}

function renderGame(state: GameState, thisPlayer: PlayerSnapshot, viewPortWidthPx: number, viewPortHeightPx: number): ReactNode {
    const PIXELS_PER_TILE = 30
    const PLAYER_SQUARE_LENGTH_TILES = 2
    //const CENTER_X = thisPlayer.position.x
    //const CENTER_Y = thisPlayer.position.y
    const CENTER_X = thisPlayer.position.x
    const CENTER_Y = thisPlayer.position.y

    const tiles: TileType[][] = state.map.tiles;
    const players: Map<string, PlayerSnapshot> = new Map();
    /* if (state.playerStates != undefined && state.playerStates != null) {
        for (let [playerId, player] of state.playerStates.entries()) {
            players.set(playerId, player)
        }
    } */

    players.set(thisPlayer.player.id, thisPlayer)

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

    const playerStates: PlayerSnapshot[] = Object.values(players)
    playerStates.push(thisPlayer)

    for (let i = 0; i < playerStates.length; i++) {
        const player = playerStates[i]
        if (player == undefined) {
            console.warn("WARNING: Undefined player object received.")
            continue;
        }
        const playerX = player.position.x
        const playerY = player.position.y
        console.log(`Player: (${playerStates[i].position.x}, ${playerStates[i].position.y}),\nRendered position: (${viewPortWidthPx / 2 + (-CENTER_X + playerX) * PIXELS_PER_TILE}px, ${viewPortHeightPx / 2 + (-CENTER_Y + playerY) * PIXELS_PER_TILE}px)`)

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

export default GameClient;