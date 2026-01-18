# blind-maze

![Recording 2026-01-17 194300](https://github.com/user-attachments/assets/2ad0c130-5865-46e5-a5c4-499206b3fce3)

*Two local clients connected to a dedicated server through websockets.*

Full stack web game, organized as a TurboRepo.

## Highlights

- Dedicated server
- Hand rolled binary encoding
- Supabase integration using middleware for auth routing

## Main Components

**Game Server**: Written in Go, can be found at `apps/go-server`.

- Runs a global tick

**Game Client**: Written in Typescript, uses DOM library, found at `packages/client`

**Frontend**: Next.js app that can handle authentication, main UI, and can be found at `apps/frontend`

## Development

### Dependencies

1. Install the Go toolkit from https://go.dev/doc/install.

2. Install Turbo using `pnpm i turbo`.

### Run

Clone repo, install dependencies by running `pnpm install` in the project root.

**Frontend + Client**: Run `turbo dev` to spin up frontend.

**Server**: Run `go run .` in `apps/go-server`
