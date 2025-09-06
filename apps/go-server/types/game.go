package types

import (
	"encoding/binary"
	"math"
	"math/rand"
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
	for _, state := range state.PlayerStates {
		state.Tick(durationMs)
	}
	for particleIndex, particle := range state.Particles {
		particle.Tick(durationMs)
		if particle.TimeLeftMs < 0 {
			state.Particles = append(state.Particles[:particleIndex], state.Particles[particleIndex+1:]...)
		}
		centerX := particle.Position.X
		centerY := particle.Position.Y
		particleLeftX := centerX - PARTICLE_SQUARE_LENGTH_TILES/2.0
		particleRightX := centerX + PARTICLE_SQUARE_LENGTH_TILES/2.0
		particleTopY := centerY - PARTICLE_SQUARE_LENGTH_TILES/2.0
		particleBottomY := centerY + PARTICLE_SQUARE_LENGTH_TILES/2.0
		currentVX := particle.Velocity.X
		currentVY := particle.Velocity.Y

		newVX := currentVX
		newVY := currentVY

		angle := math.Atan2(currentVY, currentVY)
		speed := math.Sqrt(math.Pow(currentVX, 2) + math.Pow(currentVY, 2))
		noise := rand.Float64()*math.Pi/12.0 - math.Pi/6.0

		newAngle := angle + noise

		collisionVX := -speed * math.Cos(newAngle)
		collisionVY := -speed * math.Sin(newAngle)

		// Check for particle collisions
		// TODO: Reduce number of rows and columns being checked
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
								newVX = collisionVX
							}
						} else if currentVX < 0 {
							// Heading left
							if (particleLeftX < float64(x)+1 && particleLeftX > float64(x)) && (centerY > float64(y) && centerY < float64(y)+1) {
								newVX = collisionVX
							}
						}
						// Heading down
						if currentVY > 0 {
							if (particleBottomY > float64(y) && particleBottomY < float64(y)+1) && (centerX > float64(x) && centerX < float64(x)+1) {
								newVY = collisionVY
							}
						} else if currentVY < 0 {
							// Heading up
							if (particleTopY < float64(y)+1 && particleTopY > float64(y)) && (centerX > float64(x) && centerX < float64(x)+1) {
								newVY = collisionVY
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
