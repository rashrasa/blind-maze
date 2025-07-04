"use client";
import React, { ReactNode, useRef, useState } from "react";
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

interface GameClientProps { }


const GameClient: React.FC<GameClientProps> = () => {
    const serverInput = useRef<HTMLTextAreaElement>(null);
    const error = useRef<string>(null)
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
            x: 5.5,
            y: 5.5
        },
        snapshotTimestampMs: Date.now()
    })

    const [gameStateSnapshot, setGameStateSnapshot] = useState<GameState | null>(null);
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
                                else {
                                    server.addEventListener("message", (ev) => {
                                        setGameStateSnapshot(gameStateFromBinary(ev.data))
                                        console.log(`Received game state: ${JSON.stringify(ev.data)}`)
                                    })
                                    server.addEventListener("close", () => {
                                        setState({
                                            server: null,
                                            menu: GameClientMenu.MAIN_MENU
                                        })
                                    })
                                    sendUpdatedState(server, playerState)
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
                <div className="bg-black w-full h-full">
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
                        renderGame(gameStateSnapshot, playerState, 600, 600) :
                        <span className="relative text-white" style={{ top: "250px", left: "155px" }}>
                            Initial game state not been received yet.
                        </span>}
                </div>
            );

    }
}

// Error with return to main menu button
function buildErrorScreen(error: string): ReactNode {
    return (
        <div>
            <div>
                <p className="text-center pt-20">
                    Could not connect to server.
                </p>
            </div>
        </div>
    )
}

function showInformationDialog(message: string, confirmText: string): ReactNode {
    return (
        <div className="w-screen h-screen bg-blend-color-burn bg-gray-700">
            <div className="flex flex-col w-60 h-60">

            </div>
        </div>
    )
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
    const PIXELS_PER_TILE = 60
    const PLAYER_SQUARE_LENGTH_TILES = 0.25
    const CENTER_X = thisPlayer.position.x
    const CENTER_Y = thisPlayer.position.y

    const tiles: TileType[][] = state.map.tiles;
    const playerMap = state.playerStates;
    const players: PlayerSnapshot[] = Object.values(playerMap)

    const rootElement = <div style={{ width: `${viewPortWidthPx} px`, height: `${viewPortHeightPx} px` }}>

    </div>

    const thisPlayerElement = (<div
        className="bg-white absolute"
        style={{
            zIndex: -1,
            top: `${(CENTER_Y - PLAYER_SQUARE_LENGTH_TILES * PIXELS_PER_TILE)}px`,
            left: `${(CENTER_X - PLAYER_SQUARE_LENGTH_TILES * PIXELS_PER_TILE)}px`,
            width: `${PLAYER_SQUARE_LENGTH_TILES * PIXELS_PER_TILE}px`,
            height: `${PLAYER_SQUARE_LENGTH_TILES * PIXELS_PER_TILE}px`
        }}>

    </div>)

    const tileElements: ReactNode[] = []
    const playerElements: ReactNode[] = []

    for (let i = 0; i < tiles.length; i++) {
        for (let j = 0; j < tiles[i].length; j++) {
            tileElements.push(
                <div>

                </div>
            )
        }
    }

    for (let i = 0; players.length; i++) {
        const player = players[i]
        const playerX = player.position.x
        const playerY = player.position.y

        playerElements.push(
            <div
                className="bg-white absolute"
                style={{
                    zIndex: -1,
                    top: `${((CENTER_Y - playerY) - PLAYER_SQUARE_LENGTH_TILES * PIXELS_PER_TILE)}px`,
                    left: `${((CENTER_X - playerX) - PLAYER_SQUARE_LENGTH_TILES * PIXELS_PER_TILE)}px`,
                    width: `${PLAYER_SQUARE_LENGTH_TILES * PIXELS_PER_TILE}px`,
                    height: `${PLAYER_SQUARE_LENGTH_TILES * PIXELS_PER_TILE}px`
                }}>

            </div>
        )
    }

    return
}

export default GameClient;