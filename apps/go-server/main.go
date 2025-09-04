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

	"go-server/generation"
	"go-server/types"
)

/*
	@blind-maze/go-server

	Hosts a single instance of Blind Maze

*/

const ClientNewConnectionMessage uint8 = 0
const ClientUpdateRequestMessage uint8 = 1
const ClientReleaseParticleMessage uint8 = 2

// Types
type WebsocketHandler struct {
	upgrader websocket.Upgrader
}

type Connection struct {
	address     string
	uuid        string
	_connection *websocket.Conn
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
		uuid, _ := types.DecodeString(p[1:])

		log.Print("Parsed player")
		log.Print(uuid)
		gameState.PlayerStates = append(gameState.PlayerStates, &types.PlayerSnapshot{
			Uuid:                uuid,
			Position:            types.Vector2[float64]{X: 1.8, Y: 1.8},
			Velocity:            types.Vector2[float64]{X: 0, Y: 0},
			IsLeader:            false,
			SnapshotTimestampMs: uint64(time.Now().UnixMilli()),
		})
		c := 0
		for _, connection := range activeConnections {
			if connection.address == address {
				connection.uuid = uuid
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

		newPlayerSnapshot, err := types.PlayerSnapshotFromBinary(p[1:])
		if err != nil {
			log.Print("Could not parse player snapshot from message. " + err.Error())
			return err
		}

		for i, playerSnapshotItem := range gameState.PlayerStates {
			if strings.Trim(playerSnapshotItem.Uuid, "\n") == strings.Trim(newPlayerSnapshot.Uuid, "\n") {
				gameState.PlayerStates[i] = &newPlayerSnapshot
				break
			}
		}
		for _, connection := range activeConnections {
			message := gameState.ToBinary()
			connection.WriteMessage(websocket.BinaryMessage, message)
		}
	case ClientReleaseParticleMessage:
		log.Print("Received particle released message.")
		particle := types.ParticleFromBinary(p[1:])
		log.Print(particle)
		gameState.Particles = append(gameState.Particles, &particle)
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
			for j, player := range gameState.PlayerStates {
				if player.Uuid == connection.uuid {
					// Removes item j
					gameState.PlayerStates = append(gameState.PlayerStates[:j], gameState.PlayerStates[j+1:]...)
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

		case websocket.TextMessage:
			log.Print("Received message in string format: " + string(bytes))
		}
		go updateAllClients()
	}
}

// Global variables
var gameState *types.GameState = new(types.GameState)
var activeConnections []*Connection

func updateAllClients() {
	for _, connection := range activeConnections {
		connection.WriteMessage(websocket.BinaryMessage, gameState.ToBinary())
	}
}

func startGlobalTickCycle() {
	startTimeMs := time.Now().UnixMilli()
	updates := int64(0)
	TICK_RATE := int64(60)

	for {
		for (time.Now().UnixMilli()-startTimeMs)/TICK_RATE > updates {
			gameState.Tick(1000.0 / float64(TICK_RATE))
			updates++
			if updates%60 == 0 {
				log.Print("Ticked " + fmt.Sprint(updates) + " times")
				log.Print(gameState.Particles)
			}
			updateAllClients()
		}
	}

}

func main() {
	gameState.MapLayout = generation.GenerateMap()

	webSocketHandler := WebsocketHandler{
		upgrader: websocket.Upgrader{
			CheckOrigin: CheckOrigin,
		},
	}

	go startGlobalTickCycle()

	http.Handle("/", webSocketHandler)
	log.Println("Started server")

	log.Fatal(http.ListenAndServe("localhost:3001", nil))
}
