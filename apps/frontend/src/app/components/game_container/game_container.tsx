'use client';

import { GameClient } from "@blind-maze/client";
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Player } from "@blind-maze/types";

import init, { hello_wasm, connect_to_server } from "@blind-maze/rust-client";

enum GameClientMenu {
    MAIN_MENU,
    SETTINGS_MENU,
    GAME_SCREEN,
}

interface GameClientState {
    menu: GameClientMenu;
}

const playerId: string = crypto.randomUUID()
const playerColor = `rgba(${Math.floor(Math.random() * 255 + 1)}, ${Math.floor(Math.random() * 255 + 1)}, ${Math.floor(Math.random() * 255 + 1)}, 1)`
const player: Player = {
    id: playerId,
    displayName: "Player 0",
    username: "username",
    avatarUrl: "google.ca",
    color: playerColor
}

export default function GameContainer() {
    useEffect(() => {
        init().then(() => {
            connect_to_server("127.0.0.1", 3000).then((result) => {
                console.log(`Async rust function completed. Result: ${result}`)
            }).catch((err) => {
                console.error(`Caught error from async wasm function: ${err}`)
            })
        })
    }, []);
    const container = useRef<HTMLDivElement | null>(null);
    const [menuState, setMenuState] = useState<GameClientState>({ menu: GameClientMenu.MAIN_MENU });
    const [showClient, setShowClient] = useState(false);
    let gameClient: GameClient | null;
    useLayoutEffect(() => {
        gameClient = new GameClient(player, container.current!, 600, 600);
        gameClient.setVisibility(false)
        return () => {
            gameClient?.dispose()
        }
    }, [])

    return (
        <div
            ref={container}
            className="border-2 border-black box-border mx-auto mt-52"
            style={{
                width: "600px",
                height: "600px",

            }}
        >
            <div style={{
                visibility: showClient ? "hidden" : "visible",
                height: showClient ? "0px" : "auto",
                width: showClient ? "0px" : "auto"
            }}>
                <button
                    className="mx-auto text-blue-500 z-10 w-12 h-8"
                    onClick={() => {
                        gameClient?.setVisibility(!gameClient?.isClientVisible())
                        setShowClient(!showClient);
                        gameClient?.connectToServer("ws://localhost:3001")
                    }}
                >
                    Button
                </button>
            </div>

        </div>
    )
}