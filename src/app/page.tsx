'use client';

import GameContainer from "./components/game_container/game_container";
import NavBar from "./components/navbar/navbar";
import { hello_wasm } from "../../wasm/game-client/pkg";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    hello_wasm()
  })
  return (
    <div className="">
      <main className="z-0">
        <NavBar />
        <div className="">
          <GameContainer />
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
      </footer>
    </div>
  );
}
