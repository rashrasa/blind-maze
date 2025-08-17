import { createClient } from '@/utils/supabase/server';
import NavBar from "./components/navbar/navbar";

import GameContainer from "@/app/components/game_container/game_container";


export default async function Page() {
  return (
    <div className="">
      <main className='flex flex-col mt-24'>
        <NavBar />
        <div>
          <div>
            <GameContainer />
          </div>
        </div>
      </main>
      <footer className="row-start-3 h-20 items-center justify-center">
      </footer>
    </div>
  );
}
