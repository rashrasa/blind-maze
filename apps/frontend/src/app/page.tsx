
import GameContainer from "@/app/components/game_container/game_container";
import { createClient } from "@/utils/supabase/server";
import React from 'react';

export default async function Page() {
  const supabase = await createClient();
  const playerId = (await supabase.auth.getUser()).data.user!.id
  return (
    <main>
      <div>
        <div>
          <GameContainer playerId={playerId} />
        </div>
      </div>
    </main>
  );
}
