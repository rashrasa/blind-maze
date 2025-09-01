package types

import (
	"encoding/binary"
	"log"
	"math"
	"runtime"
)

type PlayerSnapshot struct {
	IsLeader            bool
	Uuid                string
	Position            Vector2[float64]
	Velocity            Vector2[float64]
	SnapshotTimestampMs uint64
}

type MapLayout struct {
	Width  uint32
	Height uint32
	Tiles  []byte
}

type GameState struct {
	PlayerStates []PlayerSnapshot
	MapLayout    MapLayout
}

type Vector2[T any] struct {
	X T
	Y T
}

// u32 length; string;
func EncodeString(s string) []byte {
	encoded := []byte(s)
	result := []byte{}
	result = binary.BigEndian.AppendUint32(result, uint32(len(encoded)))
	result = append(result, encoded...)

	return result
}

// u32 length; string;
// Returns: string; total bytes traversed
func DecodeString(p []byte) (string, uint32) {
	length := binary.BigEndian.Uint32(p[0:4])
	return string(p[4 : length+4]), (length + 4)
}

// ENCODING:
// [
// u32 width;
// u32 height;
// flattened bitArray of map
// ]
func (layout MapLayout) ToBinary() []byte {
	buffer := []byte{}

	buffer = binary.BigEndian.AppendUint32(buffer, layout.Width)
	buffer = binary.BigEndian.AppendUint32(buffer, layout.Height)

	buffer = append(buffer, layout.Tiles...)

	return buffer
}

// ENCODING:
// [
// bool isLeader 	1 byte;
// u32 uuidLength; 	string uuid;
// f64 position x; 	f64 position y;
// f64 velocity x; 	f64 velocity y;
// u64 serverTimestamp;
// ]
func (playerSnapshot PlayerSnapshot) ToBinary() []byte {

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

// ENCODING:
// [
// u32 numPlayers;	PlayerSnapshot[];
// MapLayout;
// ]
func (gameState GameState) ToBinary() []byte {

	buffer := []byte{}
	var numPlayers uint32 = uint32(len(gameState.PlayerStates))
	buffer = binary.BigEndian.AppendUint32(buffer, numPlayers)

	for _, playerState := range gameState.PlayerStates {
		buffer = append(buffer, playerState.ToBinary()...)
	}

	buffer = append(buffer, gameState.MapLayout.ToBinary()...)

	return buffer
}
