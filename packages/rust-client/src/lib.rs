use std::{cell::RefCell, rc::Rc};

use log::{debug, info};
// TODO: Replace all unwrap calls with better error handling
use wasm_bindgen::prelude::*;
use web_sys::{
    HtmlCanvasElement, KeyboardEvent, WebGl2RenderingContext, WebSocket, Window, js_sys::Function,
};

mod communication;
mod input;
mod map;
mod player;

static CLIENT_CANVAS_ID: &str = "rust_canvas_client_wasm";

#[wasm_bindgen]
pub fn get_canvas_id() -> String {
    return String::from(CLIENT_CANVAS_ID);
}

#[wasm_bindgen]
extern "C" {}

#[wasm_bindgen(start)]
/// Will run on page load
pub async fn main() {
    wasm_logger::init(wasm_logger::Config::default());
    info!("Successfully initialized rust-client.");
}

struct GameState {
    player_states: Vec<player::PlayerState>,
    map: map::Map,
}

impl GameState {
    pub fn tick(&mut self, ms: f64) {
        for player_state in self.player_states.iter_mut() {
            player_state.tick(ms)
        }
    }
}

struct Render {
    closure: Closure<dyn FnMut()>,
    handle: i32,
}

impl Render {
    pub fn new<F: 'static>(f: F) -> Self
    where
        F: FnMut(),
    {
        let closure = Closure::new(f);

        let handle = get_window()
            .request_animation_frame(closure.as_ref().unchecked_ref())
            .unwrap();

        return Render {
            closure: closure,
            handle: handle,
        };
    }
}

impl Drop for Render {
    fn drop(&mut self) {
        get_window().cancel_animation_frame(self.handle).unwrap();
    }
}

fn get_window() -> Window {
    return web_sys::window().unwrap();
}

fn get_canvas() -> HtmlCanvasElement {
    return get_window()
        .document()
        .unwrap()
        .get_element_by_id(CLIENT_CANVAS_ID)
        .unwrap()
        .dyn_into::<web_sys::HtmlCanvasElement>()
        .unwrap();
}

#[wasm_bindgen]
pub async fn connect_to_server_and_start_client(
    host_ip: &str,
    port: i16,
) -> Result<String, String> {
    // Attempt to connect to server
    debug!("Attempting to connect to WebSocket server.");
    let connection: WebSocket =
        match WebSocket::new(format!("ws://{ip}:{port}", ip = host_ip, port = port).as_str()) {
            Ok(ws) => ws,
            Err(e) => {
                return Err(format!(
                    "Could not connect to server at ws://{ip}:{port}. Error: {error}",
                    ip = host_ip,
                    port = port,
                    error = e.as_string().unwrap()
                ));
            }
        };
    debug!(
        "Successfully connected to WebSocket server at ws://{}:{}.",
        host_ip, port
    );

    debug!("Attempting to send message over WebSocket connection.");

    connection
        .send_with_str(String::from("Test websocket connection").as_str())
        .unwrap();

    debug!("Successfully sent message.");

    debug!(
        "Attempting to create client and bind to existing canvas with id {}",
        get_canvas_id()
    );

    // Create client
    let mut client = GameClient {
        connection: connection,
        context: get_canvas()
            .get_context("webgl2")
            .unwrap()
            .unwrap()
            .dyn_into::<WebGl2RenderingContext>()
            .unwrap(),
        input: input::InputState::default(),
        this_player_uuid: String::from("34534534534534"),
        state: GameState {
            player_states: vec![player::PlayerState::new(
                player::Player::new(
                    String::from("34534534534534"),
                    String::from("Name"),
                    (255, 255, 0, 1.0),
                    String::from(""),
                ),
                (10.0, 10.0),
                (0.0, 0.0),
            )],
            map: map::Map::new(map::MapStructure::SquareMap(vec![vec![map::Tile::BLOCKED]]))
                .unwrap(),
        },
    };
    let render_object = Render::new(move || {
        client.render();
    });

    return Ok(String::from(
        "Successfully connected to server and started client.",
    ));
}

pub struct GameClient {
    connection: WebSocket,
    context: WebGl2RenderingContext,
    input: input::InputState,
    this_player_uuid: String,
    state: GameState,
}

impl GameClient {
    fn tick(&mut self, ms: f64) {
        self.handle_input_state();
        self.state.tick(ms)
    }

    fn render(&mut self) {
        let center_pos: &(f64, f64) = self
            .state
            .player_states
            .iter()
            .find(|p| {
                return p.get_player().get_id() == self.this_player_uuid;
            })
            .unwrap()
            .get_pos();

        for player_state in self.state.player_states.iter() {}

        info!("Successfully made a render call.");
    }

    fn handle_input_state(&mut self) {
        todo!();
    }

    fn on_key_down(&mut self, event: KeyboardEvent) {
        let key_name = event.code();
        match key_name.as_str() {
            "ArrowUp" => {
                event.prevent_default();
                self.input.up = true;
            }
            "ArrowDown" => {
                event.prevent_default();
                self.input.down = true;
            }
            "ArrowLeft" => {
                event.prevent_default();
                self.input.left = true;
            }
            "ArrowRight" => {
                event.prevent_default();
                self.input.right = true;
            }
            _ => {}
        }
    }

    fn on_key_up(&mut self, event: KeyboardEvent) {
        let key_name = event.code();
        match key_name.as_str() {
            "ArrowUp" => {
                event.prevent_default();
                self.input.up = true;
            }
            "ArrowDown" => {
                event.prevent_default();
                self.input.down = true;
            }
            "ArrowLeft" => {
                event.prevent_default();
                self.input.left = true;
            }
            "ArrowRight" => {
                event.prevent_default();
                self.input.right = true;
            }
            _ => {}
        }
    }
}
