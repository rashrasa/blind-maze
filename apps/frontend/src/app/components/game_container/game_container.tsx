'use client';

import { GameClient } from "@blind-maze/client";
import { useEffect, useRef } from "react";
import { Player } from "@blind-maze/types";
import { v4 } from "uuid"

const playerId: string = v4()
const playerColor = `rgba(${Math.floor(Math.random() * 255 + 1)}, ${Math.floor(Math.random() * 255 + 1)}, ${Math.floor(Math.random() * 255 + 1)}, 1)`
const player: Player = {
    uuid: playerId,
    displayName: "Player 0",
    username: "username",
    avatarUrl: "google.ca",
    color: playerColor
}

interface GameContainerProps {
    playerId: string
}

const CLIENT_WIDTH_PX = 800
const CLIENT_HEIGHT_PX = 600

export default function GameContainer({ playerId }: GameContainerProps) {
    let ip = process.env['NEXT_PUBLIC_BLIND_MAZE_SERVER_IP'] ?? "localhost"
    let port = Number(process.env['NEXT_PUBLIC_BLIND_MAZE_SERVER_PORT']) ?? 3001
    const container = useRef<HTMLDivElement | null>(null);
    let client: GameClient | null = null

    useEffect(() => {
        client = new GameClient(player, container.current!, CLIENT_WIDTH_PX, CLIENT_HEIGHT_PX);
        client.connectToServer(`ws://${ip}:${port}`)
        client.setVisibility(true)

        // TODO: Attach player identities when encountering new players, maybe in a pre-game lobby
        client.attachPlayerIdentity(player)

        return () => {
            if (client == null) {
                console.warn("Attempted to dispose client while null.")
                return
            }
            client.dispose()
        }
    }, []
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
            <div className="relative">
                <div className="flex flex-row items-center justify-end z-10 p-8 absolute top-0 right-0 w-full h-10 bg-gray-100 opacity-70">
                    <div
                        className="p-2 bg-white rounded-2xl hover:cursor-pointer select-none"
                        onClick={(ev) => {
                            if (client == null) {
                                console.warn("Attempted to fullscreen client while null.")
                                return
                            }
                            //Intended to only stop click handlers when clicking this icon
                            ev.preventDefault()
                            client.requestFullScreenMode()
                        }}>
                        <span className="material-symbols-outlined">fullscreen</span>
                    </div>
                </div>
            </div>
        </div>
    )
}