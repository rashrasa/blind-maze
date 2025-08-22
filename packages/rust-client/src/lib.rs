use std::f64::consts::PI;

use log::{Level, debug, error, info, log_enabled, warn};
use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement, Window, js_sys::Function};

struct Player {
    uuid: String,
    display_name: String,
    /// RGBA
    color: (u8, u8, u8, f32),
    avatar_url: String,
}

struct PlayerState {
    player: Player,
    position: (f64, f64),
    velocity: (f32, f32),
}

enum Tiles {
    EMPTY,
    BLOCKED,
}

struct GameState {
    player_states: Vec<PlayerState>,
    map: Vec<Vec<Tiles>>,
}

static CLIENT_CANVAS_ID: &str = "rust_canvas_client_wasm";

#[wasm_bindgen]
extern "C" {}

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
pub fn get_canvas_id() -> String {
    return CLIENT_CANVAS_ID.to_string();
}

#[wasm_bindgen(start)]
/// Will run on page load
pub async fn main() {
    wasm_logger::init(wasm_logger::Config::default());
}

fn render(state: GameState) {
    let canvas = get_canvas();
    let ctx = canvas
        .get_context("2d")
        .unwrap()
        .unwrap()
        .dyn_into::<CanvasRenderingContext2d>()
        .unwrap();

    let center_pos: (f64, f64) = state.player_states.get(0).unwrap().position;

    for player_state in state.player_states {
        ctx.set_fill_style_str(
            format!(
                "RGBA({},{},{},{})",
                player_state.player.color.0,
                player_state.player.color.1,
                player_state.player.color.2,
                player_state.player.color.3
            )
            .as_str(),
        );
        ctx.arc(center_pos.0, center_pos.1, 10.0, 0.0, 2.0 * PI)
            .unwrap();
        ctx.fill();
    }
}

#[wasm_bindgen]
/// Game client entry point. On a successful connection, the render loop will start immediately
pub async fn connect_to_server(host_ip: &str, port: i16) -> Result<(), String> {
    // Attempt to connect to server
    let connection_successful = true;

    if connection_successful {
        // If success, show client and start render loop

        // Attach key listeners
        //canvas.add_event_listener_with_callback("on_key_down", || on_key_down.);

        //
        render(GameState {
            player_states: vec![PlayerState {
                player: Player {
                    uuid: "893245897239".to_string(),
                    display_name: "name".to_string(),
                    color: (255, 0, 255, 1.0),
                    avatar_url: "".to_string(),
                },
                position: (15.0, 15.0),
                velocity: (0.0, 0.0),
            }],
            map: vec![vec![Tiles::BLOCKED]],
        });
        Ok(())
    } else {
        error!("Could not connect to server.");
        return Err("Could not connect to server.".to_string());
    }
}

fn on_key_down(key_name: &str) {}

fn on_key_up(key_name: &str) {}
