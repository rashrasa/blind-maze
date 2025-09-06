package types

import (
	"encoding/binary"
	"log"
	"math"
	"runtime"
	"time"
)

type PlayerSnapshot struct {
	IsLeader            bool
	Uuid                string
	Position            Vector2[float64]
	Velocity            Vector2[float64]
	SnapshotTimestampMs uint64
}

// ENCODING:
// [
// bool isLeader 	1 byte;
// u32 uuidLength; 	string uuid;
// f64 position x; 	f64 position y;
// f64 velocity x; 	f64 velocity y;
// u64 serverTimestamp;
// ]
func (playerSnapshot *PlayerSnapshot) ToBinary() []byte {

	var isLeaderByte byte
	if playerSnapshot.IsLeader {
		isLeaderByte = 1
	} else {
		isLeaderByte = 0
	}

	positionXBytes := math.Float64bits(playerSnapshot.Position.X)
	positionYBytes := math.Float64bits(playerSnapshot.Position.Y)

	velocityXBytes := math.Float64bits(playerSnapshot.Velocity.X)
	velocityYBytes := math.Float64bits(playerSnapshot.Velocity.Y)

	buffer := []byte{}

	buffer = append(buffer, isLeaderByte)

	buffer = append(buffer, EncodeString(playerSnapshot.Uuid)...)

	buffer = binary.BigEndian.AppendUint64(buffer, positionXBytes)
	buffer = binary.BigEndian.AppendUint64(buffer, positionYBytes)
	buffer = binary.BigEndian.AppendUint64(buffer, velocityXBytes)
	buffer = binary.BigEndian.AppendUint64(buffer, velocityYBytes)

	buffer = binary.BigEndian.AppendUint64(buffer, playerSnapshot.SnapshotTimestampMs)

	return buffer
}

func PlayerSnapshotFromBinary(p []byte) (PlayerSnapshot, error) {
	defer func() {
		if r := recover(); r != nil {
			switch r := r.(type) {
			case runtime.Error:
				log.Print("Could not handle request properly. " + r.Error() + "\n")

			}
		}
	}()
	counter := uint32(0)

	isLeader := p[counter] == 1
	counter += 1

	uuid, length := DecodeString(p[counter:])
	counter += length

	posX := math.Float64frombits(binary.BigEndian.Uint64(p[counter : counter+8]))
	counter += 8
	posY := math.Float64frombits(binary.BigEndian.Uint64(p[counter : counter+8]))
	counter += 8

	velX := math.Float64frombits(binary.BigEndian.Uint64(p[counter : counter+8]))
	counter += 8
	velY := math.Float64frombits(binary.BigEndian.Uint64(p[counter : counter+8]))
	counter += 8

	timestamp := binary.BigEndian.Uint64(p[counter : counter+8])
	counter += 8

	return PlayerSnapshot{
		IsLeader:            isLeader,
		Uuid:                uuid,
		Position:            Vector2[float64]{posX, posY},
		Velocity:            Vector2[float64]{velX, velY},
		SnapshotTimestampMs: timestamp,
	}, nil
}

func (player *PlayerSnapshot) Tick(durationMs float64) {
	player.Position.X = player.Position.X + player.Velocity.X*durationMs/1000.0
	player.Position.Y = player.Position.Y + player.Velocity.Y*durationMs/1000.0
	player.SnapshotTimestampMs = uint64(time.Now().UnixMilli())
}
