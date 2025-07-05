'use client';

import GameClient from "@/app/lib/client/game_client";

export default function GameContainer() {
    return (
        <div
            className="border-2 border-black mx-auto mt-52"
            style={{
                width: "600px",
                height: "600px"
            }}
        >
            <GameClient viewPortWidth={600} viewPortHeight={600} />
        </div>
    )
}