use wasm_bindgen::prelude::*;

// Module imports
mod batch_transfer;
mod bezier;
mod math;
mod memory;
mod physics_utils;
mod spatial;
mod star_field;

// Re-export public functions
pub use batch_transfer::*;
pub use bezier::*;
pub use math::*;
pub use memory::*;
pub use physics_utils::*;
pub use spatial::*;
pub use star_field::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[wasm_bindgen]
pub fn add(a: f32, b: f32) -> f32 {
    console_log!("WASM: Adding {} + {}", a, b);
    a + b
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello from Rust WASM, {}!", name)
}

#[wasm_bindgen(start)]
pub fn main() {
    console_log!("WASM module loaded successfully!");
    console_log!("Star field optimization ready!");
    console_log!("Spatial indexing ready!");
}
