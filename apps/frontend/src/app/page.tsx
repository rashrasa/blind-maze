'use client';

import GameContainer from "./components/game_container/game_container";
import NavBar from "./components/navbar/navbar";
import { useEffect } from "react";
import init, { hello_wasm } from "@blind-maze/game-client";

export default function Home() {
  useEffect(() => {
    (async () => {
      hello_wasm()
    })()
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
