"use client";

import { MouseEventHandler } from "react";

interface NavBarElementData{
    key: string,
    displayName: string,
    onClick: MouseEventHandler<HTMLSpanElement>
}

function NavBarItem(parameters: NavBarElementData) {
    return(
        <div 
            key={parameters.key} 
            className="rounded-lg hover:bg-gray-200 hover:cursor-pointer active:bg-gray-300 p-2 inline-block"
        >
            <span className="text-2xl" onClick={(event)=>{parameters.onClick(event)}}>
                {parameters.displayName}
            </span>
        </div>
    );
}

export default function NavBar(){
    let leading:React.ReactNode[] = [
        NavBarItem({key: "home", displayName:"Home", onClick: ()=>{console.log("Pressed Home.")}}),
        NavBarItem({key: "leaderboards", displayName:"Leaderboards", onClick: ()=>{console.log("Pressed Leaderboards.")}})
    ]
    let trailing:React.ReactNode[] = [
        NavBarItem({key: "auth", displayName:"Sign In", onClick: ()=>{console.log("Pressed Sign in buttton.")}})
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