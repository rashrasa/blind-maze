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

	buffer = binary.BigEndian.AppendUint32(buffer, layout.width)
	buffer = binary.BigEndian.AppendUint32(buffer, layout.height)

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
		avatarUrl:   avatar,
		color:       color,
		displayName: displayName,
		id:          id,
		username:    username,
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

	buffer = binary.BigEndian.AppendUint64(buffer, positionXBytes)
	buffer = binary.BigEndian.AppendUint64(buffer, positionYBytes)
	buffer = binary.BigEndian.AppendUint64(buffer, velocityXBytes)
	buffer = binary.BigEndian.AppendUint64(buffer, velocityYBytes)

	buffer = binary.BigEndian.AppendUint64(buffer, playerSnapshot.snapshotTimestampMs)

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
		isLeader:            isLeader,
		player:              player,
		position:            Vector2[float64]{posX, posY},
		velocity:            Vector2[float64]{velX, velY},
		snapshotTimestampMs: timestamp,
	}, nil
}

// ENCODING:
// [
// u32 numPlayers;	PlayerSnapshot[];
// MapLayout;
// ]
func (gameState GameState) ToBinary() []byte {

	buffer := []byte{}
	var numPlayers uint32 = uint32(len(gameState.playerStates))
	buffer = binary.BigEndian.AppendUint32(buffer, numPlayers)

	for _, playerState := range gameState.playerStates {
		buffer = append(buffer, playerState.ToBinary()...)
	}

	buffer = append(buffer, gameState.mapLayout.ToBinary()...)

	return buffer
}

func HandleBinaryMessage(p []byte, address string) error {
	log.Print("Received message. Message size: " + fmt.Sprint(len(p)) + " bytes")

	messageType := p[0]
	switch messageType {
	case ClientNewConnectionMessage:
		log.Print("Received new player join request")
		// ENCODING:
		// bytes[0:1] = message type
		// bytes[1:] = Player object
		player, _ := PlayerFromBinary(p[1:])

		log.Print("Parsed player")
		log.Print(player)
		gameState.playerStates = append(gameState.playerStates, PlayerSnapshot{
			player:              player,
			position:            Vector2[float64]{0, 0},
			velocity:            Vector2[float64]{0, 0},
			isLeader:            false,
			snapshotTimestampMs: uint64(time.Now().UnixMilli()),
		})
		c := 0
		for _, connection := range activeConnections {
			if connection.address == address {
				connection.uuid = player.id
			}
			message := gameState.ToBinary()
			connection.connection.WriteMessage(websocket.BinaryMessage, message)
			c++
			log.Print("Sent message to client. Size: " + fmt.Sprint(len(message)) + " bytes.")
		}

		log.Print("Sent back game state to " + fmt.Sprint(c) + " connections. Active connections: " + fmt.Sprint(len(activeConnections)))
		log.Print(gameState)
	case ClientUpdateRequestMessage:
		// ENCODING:
		// bytes[0:1] = message type
		// bytes[1:] = playerSnapshot,

		newPlayerSnapshot, err := PlayerSnapshotFromBinary(p[1:])
		if err != nil {
			log.Print("Could not parse player snapshot from message. " + err.Error())
			return err
		}

		log.Print("Attempting to find user with id " + newPlayerSnapshot.player.id)
		for i, playerSnapshotItem := range gameState.playerStates {
			if strings.Trim(playerSnapshotItem.player.id, "\n") == strings.Trim(newPlayerSnapshot.player.id, "\n") {
				log.Print("Found: " + playerSnapshotItem.player.id)
				gameState.playerStates[i] = newPlayerSnapshot
				break
			}
		}
		for _, connection := range activeConnections {
			message := gameState.ToBinary()
			connection.connection.WriteMessage(websocket.BinaryMessage, message)
			log.Print("Sent message to client. Size: " + fmt.Sprint(len(message)) + " bytes.")
			log.Print(message)
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

	activeConnections = append(activeConnections, connection)

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
				log.Print("Received message in invalid format. Error: " + err.Error())
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

// Global variables for now

var gameState = new(GameState)
var activeConnections []*Connection

func main() {
	gameState.mapLayout.width = 9
	gameState.mapLayout.height = 4
	gameState.mapLayout.tiles = append(gameState.mapLayout.tiles, 0b1111_1111, 0b1_100_0000, 0b0110_0000, 0b0011_1111, 0b1111_0000)

	webSocketHandler := WebsocketHandler{
		upgrader: websocket.Upgrader{
			CheckOrigin: CheckOrigin,
		},
	}

	http.Handle("/", webSocketHandler)
	log.Println("Started server")

	log.Fatal(http.ListenAndServe("localhost:3001", nil))
}
