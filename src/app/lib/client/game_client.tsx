"use client";
import React, { ReactNode, useRef, useState } from "react";
import { PlayerSnapshot } from "../types/game_types";
import { gameStateToBinary, playerStateToBinary } from "../types/communication";
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

    const [state, setState] = useState<GameClientState>({
        menu: GameClientMenu.MAIN_MENU,
        server: null,
    });
    switch (state.menu) {
        case GameClientMenu.MAIN_MENU: {
            return (
                <div className="flex flex-col space-y-2 p-8 w-full h-full">
                    <span className="text-center text-3xl">
                        Main Menu
                    </span>
                    <hr className="py-4" />
                    <span className="text-2xl font-bold text-center" style={{ fontFamily: "Segoe UI" }}>Server Address</span>
                    <textarea ref={serverInput} className="border-2 border-black resize-none" rows={1} placeholder="Enter server IP and Port..." />
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
                <div className="bg-gray-200 w-full h-full">
                    <span className="z-10">Connected to: {state?.server?.url.substring("ws://".length)}</span>
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

export default GameClient;