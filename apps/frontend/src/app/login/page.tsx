import React from "react";
import LoginForm from "./login_form";

export default async function Authentication() {
    return (
        <>
            <div className="flex flex-col items-center my-16">
                <div className="flex flex-col items-center rounded-4xl shadow-2xl p-8 w-[90%]">
                    <LoginForm />
                </div>
            </div>
        </>
    )
}