package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const ClientNewConnectionMessage uint8 = 0
const ClientUpdateRequestMessage uint8 = 1

// Types
type WebsocketHandler struct {
	upgrader websocket.Upgrader
}

type Connection struct {
	address     string
	_connection *websocket.Conn
	uuid        string
	_lock       *sync.RWMutex
}

func (c Connection) WriteMessage(messageType int, data []byte) {
	c._lock.Lock()
	defer c._lock.Unlock()

	c._connection.WriteMessage(messageType, data)
}

func HandleBinaryMessage(p []byte, address string) error {
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
			position:            Vector2[float64]{1.8, 1.8},
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
			connection.WriteMessage(websocket.BinaryMessage, message)
			c++
			log.Print("Sent new player message to client. Size: " + fmt.Sprint(len(message)) + " bytes.")
			log.Print("Active connections: ")
			for _, connection := range activeConnections {
				log.Print(connection)
			}

		}

	case ClientUpdateRequestMessage:
		// ENCODING:
		// bytes[0:1] = message type
		// bytes[1:] = playerSnapshot,

		newPlayerSnapshot, err := PlayerSnapshotFromBinary(p[1:])
		if err != nil {
			log.Print("Could not parse player snapshot from message. " + err.Error())
			return err
		}

		for i, playerSnapshotItem := range gameState.playerStates {
			if strings.Trim(playerSnapshotItem.player.id, "\n") == strings.Trim(newPlayerSnapshot.player.id, "\n") {
				gameState.playerStates[i] = newPlayerSnapshot
				break
			}
		}
		for _, connection := range activeConnections {
			message := gameState.ToBinary()
			connection.WriteMessage(websocket.BinaryMessage, message)
		}

	default:
		return errors.New("unknown request type received")
	}

	return nil
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
		if r := recover(); r != nil {
			switch r := r.(type) {
			case runtime.Error:
				log.Print("Server panicked. Error: " + r.Error() + "\n")
			default:
				log.Print(r)
			}
		}
		log.Print("Disconnected: " + conn.RemoteAddr().String())
		for i, connection := range activeConnections {
			if connection.address == conn.RemoteAddr().String() {
				// Removes item i
				activeConnections = append(activeConnections[:i], activeConnections[i+1:]...)
			}
			for j, player := range gameState.playerStates {
				if player.player.id == connection.uuid {
					// Removes item j
					gameState.playerStates = append(gameState.playerStates[:j], gameState.playerStates[j+1:]...)
				}
			}
		}

		log.Print("Active connections: ")
		for _, connection := range activeConnections {
			log.Print(connection)
		}
	}()

	connection := new(Connection)
	connection.address = conn.RemoteAddr().String()
	connection._lock = new(sync.RWMutex)
	// Direct access only for assignment
	connection._connection = conn

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
					default:
						log.Print(r)
					}
				}
			}()
			err := HandleBinaryMessage(bytes, conn.RemoteAddr().String())
			if err != nil {
				conn.WriteMessage(websocket.TextMessage, []byte("Received message in invalid format"))
				log.Print("Received message in invalid format. Error: " + err.Error())
				return
			}

			for _, connection := range activeConnections {
				connection.WriteMessage(websocket.BinaryMessage, gameState.ToBinary())
			}

		case websocket.TextMessage:
			log.Print("Received message in string format: " + string(bytes))
		}

	}
}

// Global variables

var gameState *GameState = new(GameState)
var activeConnections []*Connection

func main() {
	gameState.mapLayout.width = 32
	gameState.mapLayout.height = 90
	gameState.mapLayout.tiles = append(gameState.mapLayout.tiles,
		0b1111_1111, 0b1111_1111, 0b1111_1111, 0b1111_1111,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0001, 0b1000_0000, 0b0000_0000, 0b0000_0001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_0011, 0b1111_0011, 0b1111_1111, 0b1111_1001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_0011, 0b1111_1111, 0b1111_1111, 0b1111_1111,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0001, 0b1000_0000, 0b0000_0000, 0b0000_0001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_0011, 0b1001_0011, 0b1111_1111, 0b1111_1001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_1111, 0b1001_1111, 0b1111_1111, 0b1111_1111,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0001, 0b1000_0000, 0b0000_0000, 0b0000_0001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_0011, 0b1111_0011, 0b1111_1111, 0b1111_1001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_1111, 0b1111_0001, 0b1111_1111, 0b1111_1111,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0001, 0b1000_0000, 0b0000_0000, 0b0000_0001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_0011, 0b1111_0011, 0b1111_1111, 0b1111_1001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_0011, 0b1001_1111, 0b1111_1111, 0b1111_1111,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0001, 0b1000_0000, 0b0000_0000, 0b0000_0001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_0011, 0b1111_0011, 0b1111_1111, 0b1111_1001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_0011, 0b1111_1111, 0b1111_1111, 0b1111_0001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0001, 0b1000_0000, 0b0000_0000, 0b0000_0001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_0011, 0b1001_0011, 0b1111_0011, 0b1111_1001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_0011, 0b1001_0011, 0b1111_0011, 0b1111_1001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0001, 0b1000_0000, 0b0000_0000, 0b0000_0001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_0011, 0b1111_0011, 0b1111_1111, 0b1111_1001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_0011, 0b1001_0011, 0b1111_0011, 0b1111_1001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0001, 0b1000_0000, 0b0000_0000, 0b0000_0001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_0011, 0b1111_0011, 0b1111_1111, 0b1111_1001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_0011, 0b1001_0011, 0b1111_0011, 0b1111_1001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0001, 0b1000_0000, 0b0000_0000, 0b0000_0001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0110, 0b0000_0001, 0b1000_0000, 0b0000_0001,
		0b1111_0011, 0b1111_0011, 0b1111_1111, 0b1111_1001,
		0b1000_0000, 0b0000_0001, 0b1000_0001, 0b1000_0001,
		0b1000_0000, 0b0110_0001, 0b1000_0001, 0b1000_0001,
		0b1111_1111, 0b1111_1111, 0b1111_1111, 0b1111_1111,
	)

	webSocketHandler := WebsocketHandler{
		upgrader: websocket.Upgrader{
			CheckOrigin: CheckOrigin,
		},
	}

	http.Handle("/", webSocketHandler)
	log.Println("Started server")

	log.Fatal(http.ListenAndServe("localhost:3001", nil))
}
