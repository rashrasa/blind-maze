# (WIP) blind-maze

Full stack web game, organized as a TurboRepo. Project is mainly meant to be a learning experience.

## Main Components

**Game Server (In-Progress)**: Written in Go, can be found at `apps/go-server`

**Game Client (In-Progress)**: Written in Typescript, uses DOM library, found at `packages/client`

**Frontend (In-Progress)**: Next.js app that handles authentication, main UI, and can be found at `apps/frontend`

### Others:

**Rust Client (archived for now)**: MVP client written in rust, may be completed in the future. Can be found at `packages/rust-client`

**Typescript Server (archived)**: Server written in typescript. Can be found at `apps/server`

## Development

### Dependencies

1. Install the Go toolkit from https://go.dev/doc/install.

2. Install Turbo using `pnpm i turbo`.

3. Create a `.env.local` file in `apps/frontend` root, add secrets
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Manually create a user in Supabase Authentication with the Email and Password sign up method

### Run

Clone repo, install dependencies by running `pnpm install` in the project root.

**Frontend + Client**: Run `turbo dev` to spin up frontend.

**Server**: Run `go run .` in `apps/go-server`
