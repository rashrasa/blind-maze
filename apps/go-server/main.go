package main

import (
	"encoding/binary"
	"errors"
	"log"
	"math"
	"net/http"
	"runtime"
	"strconv"

	"github.com/gorilla/websocket"
)

// Types

type Player struct {
	id          string
	username    string
	displayName string
	avatarUrl   string
	color       string
}

type PlayerSnapshot struct {
	isLeader            bool
	player              Player
	position            Vector2[float64]
	velocity            Vector2[float64]
	snapshotTimestampMs uint64
}

type MapLayout struct {
	width  uint32
	height uint32
	tiles  []byte
}

type GameState struct {
	playerStates []PlayerSnapshot
	mapLayout    MapLayout
}

type Vector2[T any] struct {
	x T
	y T
}

type BlindMazePlayerStateUpdateRequest struct {
	uuid     string
	position Vector2[float64]
	velocity Vector2[float64]
}

type WebsocketHandler struct {
	upgrader websocket.Upgrader
}

// ENCODING:
// [
// u32 width;
// u32 height;
// flattened byteArray of map
// ]
func (layout MapLayout) ToBinary() []byte {
	buffer := *new([]byte)

	binary.BigEndian.AppendUint32(buffer, layout.width)
	binary.BigEndian.AppendUint32(buffer, layout.height)

	buffer = append(buffer, layout.tiles...)

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

	avatarBytes := []byte(player.avatarUrl)
	avatarBytesLength := uint32(len(avatarBytes))

	colorBytes := []byte(player.color)
	colorBytesLength := uint32(len(colorBytes))

	displayNameBytes := []byte(player.displayName)
	displayNameBytesLength := uint32(len(displayNameBytes))

	idBytes := []byte(player.id)
	idBytesLength := uint32(len(idBytes))

	usernameBytes := []byte(player.username)
	usernameBytesLength := uint32(len(usernameBytes))

	buffer := *new([]byte)

	binary.BigEndian.AppendUint32(buffer, avatarBytesLength)
	buffer = append(buffer, avatarBytes...)

	binary.BigEndian.AppendUint32(buffer, colorBytesLength)
	buffer = append(buffer, colorBytes...)

	binary.BigEndian.AppendUint32(buffer, displayNameBytesLength)
	buffer = append(buffer, displayNameBytes...)

	binary.BigEndian.AppendUint32(buffer, idBytesLength)
	buffer = append(buffer, idBytes...)

	binary.BigEndian.AppendUint32(buffer, usernameBytesLength)
	buffer = append(buffer, usernameBytes...)

	return buffer
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
	if playerSnapshot.isLeader {
		isLeaderByte = 1
	} else {
		isLeaderByte = 0
	}

	playerBytes := playerSnapshot.player.ToBinary()

	positionXBytes := math.Float64bits(playerSnapshot.position.x)
	positionYBytes := math.Float64bits(playerSnapshot.position.y)

	velocityXBytes := math.Float64bits(playerSnapshot.velocity.x)
	velocityYBytes := math.Float64bits(playerSnapshot.velocity.y)

	buffer := *new([]byte)

	buffer = append(buffer, isLeaderByte)

	buffer = append(buffer, playerBytes...)

	binary.BigEndian.AppendUint64(buffer, positionXBytes)
	binary.BigEndian.AppendUint64(buffer, positionYBytes)
	binary.BigEndian.AppendUint64(buffer, velocityXBytes)
	binary.BigEndian.AppendUint64(buffer, velocityYBytes)

	binary.BigEndian.AppendUint64(buffer, playerSnapshot.snapshotTimestampMs)

	return buffer
}

// ENCODING:
// [
// u32 numPlayers;	PlayerSnapshot[];
// MapLayout;
// ]
func (gameState GameState) ToBinary() []byte {

	buffer := *new([]byte)

	for _, player := range gameState.playerStates {
		buffer = append(buffer, player.ToBinary()...)
	}

	buffer = append(buffer, gameState.mapLayout.ToBinary()...)

	return buffer
}

// ENCODING:
// bytes[0:4] = Message length,
// bytes[4:Message Length-32] = uuid,
// bytes[Message Length-32: Message Length-16] = position,
// bytes[Message Length-16: Message Length] = velocity
func ParseRequest(p []byte) (BlindMazePlayerStateUpdateRequest, error) {
	messageLength := binary.BigEndian.Uint32(p[0:4])
	if (messageLength) != uint32(len(p)) {
		return BlindMazePlayerStateUpdateRequest{}, errors.New("message in an invalid format")
	}

	uuid := string(p[4 : messageLength-32])
	position := Vector2[float64]{
		x: math.Float64frombits(binary.BigEndian.Uint64(p[messageLength-32 : messageLength-24])),
		y: math.Float64frombits(binary.BigEndian.Uint64(p[messageLength-24 : messageLength-16])),
	}
	velocity := Vector2[float64]{
		x: math.Float64frombits(binary.BigEndian.Uint64(p[messageLength-16 : messageLength-8])),
		y: math.Float64frombits(binary.BigEndian.Uint64(p[messageLength-8 : messageLength-0])),
	}

	return BlindMazePlayerStateUpdateRequest{
		uuid:     uuid,
		position: position,
		velocity: velocity,
	}, nil
}

// Global variables for now
var gameState = new(GameState)
var activeConnections []*websocket.Conn

func (wsh WebsocketHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := wsh.upgrader.Upgrade(w, r, nil)

	if err != nil {
		log.Println(err)
		return
	}
	log.Println("New connection from " + r.RemoteAddr)

	defer conn.Close()
	defer func() {
		for i, connection := range activeConnections {
			if connection == conn {
				// Replaces connection to remove with the rest of the list
				activeConnections[i] = activeConnections[len(activeConnections)-1]

				// Replaces array with slice from 0 to length
				activeConnections = activeConnections[:len(activeConnections)-1]
			}
		}
		log.Println("Active connections: " + strconv.Itoa(len(activeConnections)))
	}()

	activeConnections = append(activeConnections, conn)
	log.Println("Active connections: " + strconv.Itoa(len(activeConnections)))

	for {
		messageType, bytes, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}
		switch messageType {
		case websocket.BinaryMessage:
			parsedRequest, err := ParseRequest(bytes)
			if err != nil {
				conn.WriteMessage(websocket.TextMessage, []byte("Received message in invalid format"))
				return
			}
			log.Print("Attempting to find user with id " + parsedRequest.uuid)
			var playerSnapshot *PlayerSnapshot
			for _, playerSnapshotItem := range gameState.playerStates {
				if playerSnapshotItem.player.id == parsedRequest.uuid {
					log.Print("Found: " + playerSnapshotItem.player.id)
					playerSnapshot = &playerSnapshotItem
					break
				}
			}
			defer func() {
				if r := recover(); r != nil {
					switch r := r.(type) {
					case runtime.Error:
						log.Print("Could not find user in list of player states." + r.Error())
					}
				}
			}()

			playerSnapshot.position = parsedRequest.position
			playerSnapshot.velocity = parsedRequest.velocity

			currentGameState := *gameState

			for _, connection := range activeConnections {
				connection.WriteMessage(websocket.BinaryMessage, currentGameState.ToBinary())
			}
		case websocket.TextMessage:
			log.Print("Received message in string format: " + string(bytes))
		}

	}
}

func main() {
	testPlayer := new(PlayerSnapshot)
	testPlayer.player.id = "A"
	gameState.playerStates = append(gameState.playerStates, *testPlayer)

	webSocketHandler := WebsocketHandler{
		upgrader: websocket.Upgrader{},
	}

	http.Handle("/", webSocketHandler)
	log.Println("Starting server...")

	log.Fatal(http.ListenAndServe("localhost:3001", nil))
}
