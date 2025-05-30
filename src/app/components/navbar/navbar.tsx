"use client";

import Link from 'next/link';

interface NavBarElementData{
    key: string,
    displayName: string,
    route: string
}

function NavBarItem(parameters: NavBarElementData) {
    return(
        <div 
            key={parameters.key} 
            className="rounded-lg hover:bg-gray-200 hover:cursor-pointer active:bg-gray-300 p-2 inline-block"
        >
            <Link
                href={""+parameters.route}
                className="text-2xl"
            >
                {parameters.displayName}
            </Link>
        </div>
    );
}

export default function NavBar(){
    let leading:React.ReactNode[] = [
        NavBarItem({
            key: "home",
            displayName:"Home",
            route: "/"
        }),
        NavBarItem({
            key: "leaderboards",
            displayName:"Leaderboards",
            route: "/leaderboards"
        })
    ]
    let trailing:React.ReactNode[] = [
        NavBarItem({
            key: "auth",
            displayName:"Sign In",
            route: "/authentication"
        })
    ]
    return(
        <div className="flex justify-between w-full h-20 bg-gray-100 px-4 sticky left-0 top-0 overflow-hidden">
            <div className="my-auto space-x-2 ml-4">
                {leading}
            </div>
            <div className="my-auto space-x-2 mr-4">
                {trailing}
            </div>
        </div>
    );
}