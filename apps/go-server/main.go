package main

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

type WebsocketHandler struct {
	upgrader websocket.Upgrader
}

func (wsh WebsocketHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := wsh.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	log.Println("New connection from " + r.RemoteAddr)
	for {
		messageType, bytes, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}
		log.Println("Received message: " + string(bytes))
		conn.WriteMessage(messageType, []byte("Hello, World"))
	}
}

func main() {
	webSocketHandler := WebsocketHandler{
		upgrader: websocket.Upgrader{},
	}
	http.Handle("/", webSocketHandler)
	log.Println("Starting server...")

	log.Fatal(http.ListenAndServe("localhost:3001", nil))
}
