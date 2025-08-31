"use client"

import { createClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";
import { Player } from "@blind-maze/types";


export default function LoggedInScreen() {
    const supabase = createClient()

    return (
        <>
            <div className="flex flex-row w-40 h-8 bg-cyan-400 border-2 border-cyan-950 rounded-4xl p-8 m-4 
                        hover:cursor-pointer hover:bg-cyan-600 active:bg-cyan-700 text-center items-center justify-center"
                onClick={(_) => {
                    supabase.auth.signOut();
                    redirect("/login")
                }}
            >

                <span className="text-white font-bold text-lg">Sign Out</span>
            </div>
        </>
    )
}