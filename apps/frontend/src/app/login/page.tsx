import React from "react";
import LoginForm from "./login_form";
import { createClient } from "@/utils/supabase/server";
import AnonymousLoginButton from "./anonymous_login_button";
import LoggedInScreen from "./logged_in_screen";

export default async function Authentication() {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    return (
        <>
            <div className="flex flex-col items-center my-16">
                <div className="flex flex-col items-center rounded-4xl shadow-2xl p-8 w-[800px] gap-8"
                    style={{ display: user.data.user ? "none" : "flex" }}>
                    <LoginForm />
                    <AnonymousLoginButton />
                </div>
                <div className="flex flex-col items-center rounded-4xl shadow-2xl p-8 w-[800px] gap-8"
                    style={{ display: user.data.user ? "flex" : "none" }}>
                    <LoggedInScreen />
                </div>
            </div>
        </>
    )
}