package types

import (
	"encoding/binary"
)

// TODO: remove and update temporary solution
const PARTICLE_SQUARE_LENGTH_TILES = 0.2

type GameState struct {
	PlayerStates []*PlayerSnapshot
	Particles    []*Particle
	MapLayout    MapLayout
}

// ENCODING:
// [
// u32 numPlayers;	PlayerSnapshot[];
// u32 numParticles; Particle[]
// MapLayout;
// ]
func (gameState *GameState) ToBinary() []byte {
	buffer := []byte{}

	buffer = binary.BigEndian.AppendUint32(buffer, uint32(len(gameState.PlayerStates)))
	for _, playerState := range gameState.PlayerStates {
		buffer = append(buffer, playerState.ToBinary()...)
	}

	buffer = binary.BigEndian.AppendUint32(buffer, uint32(len(gameState.Particles)))
	for _, particle := range gameState.Particles {
		buffer = append(buffer, particle.ToBinary()...)
	}

	buffer = append(buffer, gameState.MapLayout.ToBinary()...)

	return buffer
}

func (state *GameState) Tick(durationMs float64) {
	// TODO: Handle all tick logic here (just particle collisions for now)
	for _, state := range state.PlayerStates {
		state.Tick(durationMs)
	}
	for i, particle := range state.Particles {
		particle.Tick(durationMs)
		if particle.TimeLeftMs < 0 {
			state.Particles = append(state.Particles[:i], state.Particles[i+1:]...)
		}
		centerX := particle.Position.X
		centerY := particle.Position.Y
		particleLeftX := centerX - PARTICLE_SQUARE_LENGTH_TILES/2.0
		particleRightX := centerX + PARTICLE_SQUARE_LENGTH_TILES/2.0
		particleTopY := centerY - PARTICLE_SQUARE_LENGTH_TILES/2.0
		particleBottomY := centerY + PARTICLE_SQUARE_LENGTH_TILES/2.0
		currentVX := particle.Velocity.X
		currentVY := particle.Velocity.Y
		newVX := particle.Velocity.X
		newVY := particle.Velocity.Y

		// Check for particle collisions
		for j, row := range state.MapLayout.Tiles {
			for i, columnsByte := range row {
				for bitIndex := 7; bitIndex >= 0; bitIndex-- {
					y := j
					x := (i * 8) + (7 - bitIndex)
					bit := (columnsByte >> bitIndex) & 0b0000_0001
					if bit == 0b0000_0001 {
						// Heading right
						if currentVX > 0 {
							if (particleRightX > float64(x) && particleRightX < float64(x)+1) && (centerY > float64(y) && centerY < float64(y)+1) {
								newVX = -currentVX
							}
						} else if currentVX < 0 {
							// Heading left

							if (particleLeftX < float64(x)+1 && particleLeftX > float64(x)) && (centerY > float64(y) && centerY < float64(y)+1) {
								newVX = -currentVX
							}
						}

						// Heading down
						if currentVY > 0 {
							if (particleBottomY > float64(y) && particleBottomY < float64(y)+1) && (centerX > float64(x) && centerX < float64(x)+1) {
								newVY = -currentVY
							}
						} else if currentVY < 0 {
							// Heading up
							if (particleTopY < float64(y)+1 && particleTopY > float64(y)) && (centerX > float64(x) && centerX < float64(x)+1) {
								newVY = -currentVY
							}
						}

					}
				}
			}
		}

		particle.Velocity.X = newVX
		particle.Velocity.Y = newVY
	}
}
