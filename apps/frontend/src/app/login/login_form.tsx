"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function LoginForm() {
    const supabase = createClient();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    return (
        <form className="flex flex-col gap-8"
            onSubmit={(event) => {
                event.preventDefault();
                supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                }).then((response) => {
                    console.log(response.data.user?.email)
                    router.push("/")
                })
            }} >
            <label>Email:
                <input type="text" onChange={(e) => {
                    setEmail(e.target.value)
                }} />
            </label>
            <label>Password:
                <input type="password" onChange={(e) => {
                    setPassword(e.target.value)
                }} />
            </label>
            <input
                type="submit"
                value={"Sign In"}
                className="rounded-xl p-8 bg-amber-200 border-amber-900 border-2 hover:cursor-pointer"
            />
        </form>
    )
}