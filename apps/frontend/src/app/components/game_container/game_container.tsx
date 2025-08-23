'use client';

import { GameClient } from "@blind-maze/client";
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Player } from "@blind-maze/types";

import { connect_to_server_and_start_client, get_canvas_id } from "@blind-maze/rust-client";

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
    useLayoutEffect(() => {
        connect_to_server_and_start_client("localhost", 3001).then(() => { })
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
            <canvas id={get_canvas_id()} height={600} width={600}>

            </canvas>

        </div>
    )
}