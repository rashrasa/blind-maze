import Link from 'next/link';

interface NavBarElementData {
    passedKey: string,
    displayName: string,
    route: string
}

function NavBarItem(parameters: NavBarElementData) {
    return (
        <Link key={parameters.passedKey}
            href={parameters.route}
            className="text-2xl rounded-lg hover:bg-sky-200 hover:cursor-pointer active:bg-sky-300 p-2"
        >
            {parameters.displayName}
        </Link>
    );
}

export default function NavBar() {
    let leading: NavBarElementData[] = [
        {
            passedKey: "home",
            displayName: "Home",
            route: "/"
        },
        // {
        //     passedKey: "leaderboards",
        //     displayName: "Leaderboards",
        //     route: "/leaderboards"
        // }
    ]
    let trailing: NavBarElementData[] = [
        {
            passedKey: "authentication",
            displayName: "Account",
            route: "/login"
        }
    ]
    return (
        <div className=''>
            <div className="flex justify-between items-center sticky w-full top-0 h-20 shadow-sm bg-white px-8">
                <div className="flex items-center gap-8">
                    {leading.map(item => (
                        <NavBarItem key={item.passedKey} passedKey={item.passedKey} displayName={item.displayName} route={item.route} />
                    ))}
                </div>
                <div className="flex items-center gap-8">
                    {trailing.map(item => (
                        <NavBarItem key={item.passedKey} passedKey={item.passedKey} displayName={item.displayName} route={item.route} />
                    ))}
                </div>
            </div>
        </div>
    );
}