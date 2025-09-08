# (WIP) blind-maze

Full stack web game, organized as a TurboRepo.

## Main Components

**Game Server (In-Progress)**: Written in Go, can be found at `apps/go-server`

**Game Client (In-Progress)**: Written in Typescript, uses DOM library, found at `packages/client`

**Frontend (In-Progress)**: Next.js app that handles authentication, main UI, and can be found at `apps/frontend`

### Others:

**Rust Client (archived for now)**: MVP client written in rust, may be completed in the future. Can be found at `packages/rust-client`

## Development

### Dependencies

1. Install the Go toolkit from https://go.dev/doc/install.

2. Install Turbo using `pnpm i turbo`.

### Run

Clone repo, install dependencies by running `pnpm install` in the project root.

**Frontend + Client**: Run `turbo dev` to spin up frontend.

**Server**: Run `go run .` in `apps/go-server`
