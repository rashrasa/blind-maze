"use client"

import { createClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";

export default function AnonymousLoginButton() {
    const supabase = createClient()

    return (
        <div className="flex flex-row w-60 h-24 bg-cyan-400 border-2 border-cyan-950 rounded-4xl p-8 m-4 
                        hover:cursor-pointer hover:bg-cyan-600 active:bg-cyan-700 text-center items-center justify-center"
            onClick={(_) => {
                supabase.auth.signInAnonymously().then((res) => {
                    redirect("/")
                });

            }}
        >
            <span className="text-white font-bold text-2xl">Play As Guest</span>
        </div>
    )

}