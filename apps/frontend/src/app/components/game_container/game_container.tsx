'use client';

import { GameClient } from "@blind-maze/client";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Player } from "@blind-maze/types";

enum GameClientMenu {
    MAIN_MENU,
    SETTINGS_MENU,
    GAME_SCREEN,
}

interface GameClientState {
    menu: GameClientMenu;
}

var keysPressed: Map<string, boolean> = new Map()

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
    const container = useRef<HTMLDivElement | null>(null);
    const [menuState, setMenuState] = useState<GameClientState>({ menu: GameClientMenu.MAIN_MENU });
    useEffect(() => {
        const gameClient = new GameClient(player, container.current!, 600, 600);
        return () => {
            gameClient.dispose()
        }
    }, [])

    return (
        <div
            ref={container}
            className="border-2 border-black mx-auto mt-52"
            style={{
                width: "600px",
                height: "600px"
            }}
        >
        </div>
    )
}