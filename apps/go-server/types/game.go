package types

import "encoding/binary"

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

		// Check for particle collisions

	}
}
