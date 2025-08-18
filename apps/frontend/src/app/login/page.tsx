import NavBar from "../components/navbar/navbar";
import LoginForm from "./login_form";

export default async function Authentication() {
    return (
        <div>
            <NavBar />
            <div className="flex flex-col items-center">
                <div className="flex flex-col items-center rounded-4xl w-[70%] h-[800px] shadow-2xl">
                    <LoginForm />
                </div>
            </div>
        </div>
    )
}