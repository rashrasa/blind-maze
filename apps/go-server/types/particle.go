package types

import (
	"encoding/binary"
	"math"
)

type Particle struct {
	Position   Vector2[float64]
	Velocity   Vector2[float64]
	TimeLeftMs float64
}

func ParticleFromBinary(p []byte) Particle {
	counter := 0

	posX := math.Float64frombits(binary.BigEndian.Uint64(p[counter : counter+8]))
	counter += 8
	posY := math.Float64frombits(binary.BigEndian.Uint64(p[counter : counter+8]))
	counter += 8

	velX := math.Float64frombits(binary.BigEndian.Uint64(p[counter : counter+8]))
	counter += 8
	velY := math.Float64frombits(binary.BigEndian.Uint64(p[counter : counter+8]))
	counter += 8

	timeLeftMs := math.Float64frombits(binary.BigEndian.Uint64(p[counter : counter+8]))
	counter += 8

	return Particle{
		Position: Vector2[float64]{
			X: posX,
			Y: posY,
		},
		Velocity: Vector2[float64]{
			X: velX,
			Y: velY,
		},
		TimeLeftMs: timeLeftMs,
	}
}

func (particle *Particle) ToBinary() []byte {
	buffer := []byte{}

	buffer = binary.BigEndian.AppendUint64(buffer, math.Float64bits(particle.Position.X))
	buffer = binary.BigEndian.AppendUint64(buffer, math.Float64bits(particle.Position.Y))

	buffer = binary.BigEndian.AppendUint64(buffer, math.Float64bits(particle.Velocity.X))
	buffer = binary.BigEndian.AppendUint64(buffer, math.Float64bits(particle.Velocity.Y))

	buffer = binary.BigEndian.AppendUint64(buffer, math.Float64bits(particle.TimeLeftMs))

	return buffer
}

func (particle *Particle) Tick(durationMs float64) {
	particle.Position.X += particle.Velocity.X * durationMs / 1000.0
	particle.Position.Y += particle.Velocity.Y * durationMs / 1000.0
	particle.TimeLeftMs -= durationMs
}
