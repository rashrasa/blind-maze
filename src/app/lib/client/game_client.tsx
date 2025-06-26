"use client";
import React, { ReactNode, useState } from "react";

enum GameClientMenu {
    MAIN_MENU,
    SETTINGS_MENU,
    GAME_SCREEN,
}

interface GameClientState {
    menu: GameClientMenu;
    server: String | null;
}

interface GameClientProps { }


const GameClient: React.FC<GameClientProps> = () => {
    const [state, setState] = useState<GameClientState>({
        menu: GameClientMenu.MAIN_MENU,
        server: null,
    });
    switch (state.menu) {
        case GameClientMenu.MAIN_MENU:
            return buildMainMenu();
        case GameClientMenu.SETTINGS_MENU:
            return buildSettingsMenu();
        case GameClientMenu.GAME_SCREEN:
            return buildGameScreen(state.server!);
    }
};



function buildMainMenu(): ReactNode {
    return (
        <div>
            <p>
            </p>
        </div>
    )
}

function buildSettingsMenu(): ReactNode {
    return <div></div>;
}

function buildGameScreen(server: String): ReactNode {

    return <div></div>;
}

export default GameClient;