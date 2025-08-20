use std::{sync::Once, thread::sleep, time::Duration};

use gloo_timers::future::TimeoutFuture;
use log::{Level, debug, error, info, log_enabled, warn};
use wasm_bindgen::prelude::*;

static INIT: Once = Once::new();

#[wasm_bindgen]
pub async fn hello_wasm() {
    INIT.call_once(|| {
        wasm_logger::init(wasm_logger::Config::default());
    });

    info!("Hello world! This was run through a web assembly module compiled from rust!");
}

#[wasm_bindgen]
pub async fn connect_to_server(host_ip: &str, port: i16) -> Result<String, String> {
    // Check if ip is in a valid format
    TimeoutFuture::new(3000).await;
    // Attempt to connect to server
    let connection_successful = false;

    if connection_successful {
        // If success, return simple message
        let message =
            (format!("Simulated successful connection to {}:{}.", host_ip, port)).to_string();
        return Ok(message);
    } else {
        error!("Could not connect to server.");
        // If failed, throw error
        return Err("Could not connect to server.".to_string());
    }
}

#[wasm_bindgen]
pub async fn set_visible() {}
