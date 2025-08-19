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
        <form
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
            <div className="flex flex-col w-full border-2 border-black rounded-2xl p-8 text-lg font-semibold font-sans items-center space-y-8">
                <div className="flex flex-row gap-8">
                    <div className="flex flex-col justify-stretch space-y-4">
                        <label>Email:</label>
                        <label>Password:</label>
                    </div>

                    <div className="flex flex-col justify-stretch flex-1 space-y-4">
                        <input
                            type="text"
                            className="ml-8 border border-black rounded-sm"
                            onChange={(e) => {
                                setEmail(e.target.value)
                            }} />
                        <input
                            type="password"
                            className="ml-8 border border-black rounded-sm"
                            onChange={(e) => {
                                setPassword(e.target.value)
                            }} />
                    </div>

                </div>
                <input
                    type="submit"
                    value={"Sign In"}
                    className="rounded-xl bg-sky-200 border-sky-900 border-2 hover:cursor-pointer w-[50%]"
                />
            </div>
        </form>
    )
}