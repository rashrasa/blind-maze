'use client';

import GameContainer from "./components/game_container/game_container";
import NavBar from "./components/navbar/navbar";

export default function Home() {
  return (
    <div className="">
      <main className="">
        <NavBar/>
        <div className="">
          <GameContainer/>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
      </footer>
    </div>
  );
}
