import { createClient } from '@/utils/supabase/server';
import NavBar from "./components/navbar/navbar";

import GameContainer from "@/app/components/game_container/game_container";
import React from 'react';

export default async function Page() {
  return (
    <main>
      <div>
        <div className="min-h-[1600px]">
          <GameContainer />
        </div>
      </div>
    </main>
  );
}
