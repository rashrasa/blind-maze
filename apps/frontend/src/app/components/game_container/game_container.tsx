'use client';

import { GameClient } from "@blind-maze/client";
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Player } from "@blind-maze/types";

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
    const container = useRef<HTMLDivElement | null>(null);

    const CLIENT_WIDTH_PX = 1800
    const CLIENT_HEIGHT_PX = 900

    useLayoutEffect(() => {
        let client = new GameClient(player, container.current!, CLIENT_WIDTH_PX, CLIENT_HEIGHT_PX);
        client.connectToServer("ws://localhost:3001")
        client.setVisibility(true)

        return () => {
            client.dispose()
        }
    }
    )
    return (
        <div
            ref={container}
            className="border-2 border-black box-border mx-auto mt-32"
            style={{
                width: `${CLIENT_WIDTH_PX}px`,
                height: `${CLIENT_HEIGHT_PX}px`,

            }}
        >
        </div>
    )
}