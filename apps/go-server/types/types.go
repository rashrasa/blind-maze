package types

import (
	"encoding/binary"
	"log"
	"math"
	"runtime"
)

type Player struct {
	Id          string
	Username    string
	DisplayName string
	AvatarUrl   string
	Color       string
}

type PlayerSnapshot struct {
	IsLeader            bool
	Player              Player
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
// u32 avatarLength; 		string utf8 avatar;
// u32 colorLength; 		string utf8 color;
// u32 displayNameLength; 	string utf8 displayName;
// u32 idLength; 			string utf8 id;
// u32 usernameLength; 		string utf8 username;
// ]
func (player Player) ToBinary() []byte {
	avatarBytes := []byte(player.AvatarUrl)
	avatarBytesLength := uint32(len(avatarBytes))

	colorBytes := []byte(player.Color)
	colorBytesLength := uint32(len(colorBytes))

	displayNameBytes := []byte(player.DisplayName)
	displayNameBytesLength := uint32(len(displayNameBytes))

	idBytes := []byte(player.Id)
	idBytesLength := uint32(len(idBytes))

	usernameBytes := []byte(player.Username)
	usernameBytesLength := uint32(len(usernameBytes))

	buffer := []byte{}

	buffer = binary.BigEndian.AppendUint32(buffer, avatarBytesLength)
	buffer = append(buffer, avatarBytes...)

	buffer = binary.BigEndian.AppendUint32(buffer, colorBytesLength)
	buffer = append(buffer, colorBytes...)

	buffer = binary.BigEndian.AppendUint32(buffer, displayNameBytesLength)
	buffer = append(buffer, displayNameBytes...)

	buffer = binary.BigEndian.AppendUint32(buffer, idBytesLength)
	buffer = append(buffer, idBytes...)

	buffer = binary.BigEndian.AppendUint32(buffer, usernameBytesLength)
	buffer = append(buffer, usernameBytes...)

	return buffer
}

// ENCODING:
// [
// u32 avatarLength; 		string utf8 avatar;
// u32 colorLength; 		string utf8 color;
// u32 displayNameLength; 	string utf8 displayName;
// u32 idLength; 			string utf8 id;
// u32 usernameLength; 		string utf8 username;
// ]
func PlayerFromBinary(p []byte) (Player, uint32) {
	var counter uint32 = 0

	avatarLength := binary.BigEndian.Uint32(p[counter : counter+4])
	counter += 4
	avatar := string(p[counter : counter+avatarLength])
	counter += avatarLength

	colorLength := binary.BigEndian.Uint32(p[counter : counter+4])
	counter += 4
	color := string(p[counter : counter+colorLength])
	counter += colorLength

	displayNameLength := binary.BigEndian.Uint32(p[counter : counter+4])
	counter += 4
	displayName := string(p[counter : counter+displayNameLength])
	counter += displayNameLength

	idLength := binary.BigEndian.Uint32(p[counter : counter+4])
	counter += 4
	id := string(p[counter : counter+idLength])
	counter += idLength

	usernameLength := binary.BigEndian.Uint32(p[counter : counter+4])
	counter += 4
	username := string(p[counter : counter+usernameLength])
	counter += usernameLength

	return Player{
		AvatarUrl:   avatar,
		Color:       color,
		DisplayName: displayName,
		Id:          id,
		Username:    username,
	}, counter
}

// ENCODING:
// [
// bool isLeader 1 byte;
// Player player;
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

	playerBytes := playerSnapshot.Player.ToBinary()

	positionXBytes := math.Float64bits(playerSnapshot.Position.X)
	positionYBytes := math.Float64bits(playerSnapshot.Position.Y)

	velocityXBytes := math.Float64bits(playerSnapshot.Velocity.X)
	velocityYBytes := math.Float64bits(playerSnapshot.Velocity.Y)

	buffer := []byte{}

	buffer = append(buffer, isLeaderByte)

	buffer = append(buffer, playerBytes...)

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

	player, playerNumBytes := PlayerFromBinary(p[1:])
	counter += playerNumBytes

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
		Player:              player,
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
