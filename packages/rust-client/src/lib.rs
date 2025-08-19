use std::sync::Once;

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
