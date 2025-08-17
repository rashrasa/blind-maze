import Link from 'next/link';

interface NavBarElementData {
    key: string,
    displayName: string,
    route: string
}

function NavBarItem(parameters: NavBarElementData) {
    return (
        <div
            key={parameters.key}
            className="rounded-lg hover:bg-sky-200 hover:cursor-pointer active:bg-sky-300 p-2"
        >
            <Link
                href={"" + parameters.route}
                className="text-2xl"
            >
                {parameters.displayName}
            </Link>
        </div>
    );
}

export default function NavBar() {
    let leading: React.ReactNode[] = [
        NavBarItem({
            key: "home",
            displayName: "Home",
            route: "/"
        }),
        NavBarItem({
            key: "leaderboards",
            displayName: "Leaderboards",
            route: "/leaderboards"
        })
    ]
    let trailing: React.ReactNode[] = [
        NavBarItem({
            key: "auth",
            displayName: "Sign In",
            route: "/login"
        })
    ]
    return (
        <div className="sticky top-0 start-0 w-full h-20 px-4 shadow-sm pt-5">
            <div className="w-full flex flex-wrap items-center justify-between mx-auto p-4">
                <div className="flex flex-row shrink gap-8">
                    {...leading}
                </div>
                <div className="flex flex-row shrink gap-8">
                    {...trailing}
                </div>
            </div>
        </div>
    );
}