package main

import (
	"encoding/binary"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

const ClientNewConnectionMessage uint8 = 0
const ClientUpdateRequestMessage uint8 = 1

// Global variables for now

var gameState = new(GameState)
var activeConnections []*Connection

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

type WebsocketHandler struct {
	upgrader websocket.Upgrader
}

// ENCODING:
// [
// u32 width;
// u32 height;
// flattened bitArray of map
// ]
func (layout MapLayout) ToBinary() []byte {
	buffer := []byte{}

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

	buffer := []byte{}

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
// u32 avatarLength; 		string utf8 avatar;
// u32 colorLength; 		string utf8 color;
// u32 displayNameLength; 	string utf8 displayName;
// u32 idLength; 			string utf8 id;
// u32 usernameLength; 		string utf8 username;
// ]
func PlayerFromBinary(p []byte) Player {
	log.Print("Attempting to parse player from byte array of length " + fmt.Sprint(len(p)))
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
		avatarUrl:   avatar,
		color:       color,
		displayName: displayName,
		id:          id,
		username:    username,
	}
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

	buffer := []byte{}

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

	buffer := []byte{}

	for _, player := range gameState.playerStates {
		buffer = append(buffer, player.ToBinary()...)
	}

	buffer = append(buffer, gameState.mapLayout.ToBinary()...)

	return buffer
}

func HandleBinaryMessage(p []byte, address string) error {
	log.Print("Attempting to parse binary message of length " + fmt.Sprint(len(p)))

	messageType := p[0]
	switch messageType {
	case ClientNewConnectionMessage:
		log.Print("Received new player join request")
		// ENCODING:
		// bytes[0:1] = message type
		// bytes[1:] = Player object
		player := PlayerFromBinary(p[1:])

		log.Print("Parsed player")
		log.Print(player)
		gameState.playerStates = append(gameState.playerStates, PlayerSnapshot{
			player:              player,
			position:            Vector2[float64]{0, 0},
			velocity:            Vector2[float64]{0, 0},
			isLeader:            false,
			snapshotTimestampMs: uint64(time.Now().UnixMilli()),
		})
		for _, connection := range activeConnections {
			if connection.address == address {
				connection.uuid = player.id
			}
		}
	case ClientUpdateRequestMessage:
		// ENCODING:
		// bytes[0:1] = message type
		// bytes[1:5] = Message length,
		// bytes[5:Message Length-32] = uuid,
		// bytes[Message Length-32: Message Length-16] = position,
		// bytes[Message Length-16: Message Length] = velocity
		messageLength := binary.BigEndian.Uint32(p[1:5])
		if (messageLength) != uint32(len(p)) {
			return errors.New("message in an invalid format")
		}

		uuid := string(p[5 : messageLength-32])
		position := Vector2[float64]{
			x: math.Float64frombits(binary.BigEndian.Uint64(p[messageLength-32 : messageLength-24])),
			y: math.Float64frombits(binary.BigEndian.Uint64(p[messageLength-24 : messageLength-16])),
		}
		velocity := Vector2[float64]{
			x: math.Float64frombits(binary.BigEndian.Uint64(p[messageLength-16 : messageLength-8])),
			y: math.Float64frombits(binary.BigEndian.Uint64(p[messageLength-8 : messageLength-0])),
		}

		log.Print("Attempting to find user with id " + uuid)
		var playerSnapshot *PlayerSnapshot
		for _, playerSnapshotItem := range gameState.playerStates {
			if strings.Trim(playerSnapshotItem.player.id, "\n") == strings.Trim(uuid, "\n") {
				log.Print("Found: " + playerSnapshotItem.player.id)
				playerSnapshot = &playerSnapshotItem
				break
			}
		}
		if playerSnapshot != nil {
			log.Print("Found user. id: " + playerSnapshot.player.id)
			playerSnapshot.position = position
			playerSnapshot.velocity = velocity

		} else {
			log.Print("Could not find user with id: " + uuid)
		}

	default:
		return errors.New("unknown request type received")
	}

	return nil
}

type Connection struct {
	address    string
	connection *websocket.Conn
	uuid       string
}

func CheckOrigin(request *http.Request) bool {
	//TODO: actually check origin properly
	return true
}

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
			if connection.address == conn.RemoteAddr().String() {
				// Replaces connection to remove with the rest of the list
				activeConnections[i] = activeConnections[len(activeConnections)-1]

				// Replaces array with slice from 0 to length-1
				activeConnections = activeConnections[:len(activeConnections)-1]
			}
		}
		log.Println("Active connections: " + strconv.Itoa(len(activeConnections)))
	}()

	connection := new(Connection)
	connection.address = conn.RemoteAddr().String()
	connection.connection = conn

	for {
		messageType, bytes, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}
		switch messageType {
		case websocket.BinaryMessage:
			defer func() {
				if r := recover(); r != nil {
					switch r := r.(type) {
					case runtime.Error:
						log.Print("Could not handle request properly. " + r.Error() + "\n")
					}
				}
			}()
			err := HandleBinaryMessage(bytes, conn.RemoteAddr().String())
			if err != nil {
				conn.WriteMessage(websocket.TextMessage, []byte("Received message in invalid format"))
				log.Print("Received message in invalid format")
				return
			}
			log.Print("Done processing message")

			for _, connection := range activeConnections {
				connection.connection.WriteMessage(websocket.BinaryMessage, gameState.ToBinary())
			}

		case websocket.TextMessage:
			log.Print("Received message in string format: " + string(bytes))
		}

	}
}

func main() {
	gameState.playerStates = append(gameState.playerStates, PlayerSnapshot{
		player: Player{
			id: "A",
		},
	})

	webSocketHandler := WebsocketHandler{
		upgrader: websocket.Upgrader{
			CheckOrigin: CheckOrigin,
		},
	}

	http.Handle("/", webSocketHandler)
	log.Println("Started server")

	log.Fatal(http.ListenAndServe("localhost:3001", nil))
}
