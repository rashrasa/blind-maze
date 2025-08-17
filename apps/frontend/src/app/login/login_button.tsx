"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginButton() {
    const supabase = createClient();
    const router = useRouter();
    return (
        <button
            className="rounded-xl p-8 bg-amber-200 border-amber-900 border-2 hover:cursor-pointer"
            onClick={() => {
                supabase.auth.signInAnonymously().then((response) => {
                    response.data.user
                    router.push("/")
                })
            }} >
            Login as Guest
        </button>
    )
}