use wasm_bindgen::prelude::*;

// Module imports
mod math;
mod star_field;
mod bezier;
mod memory;
mod particles;
mod particle_pool;
mod physics_utils;
mod batch_transfer;
mod nebula_system;
mod spatial;

// Re-export public functions
pub use math::*;
pub use star_field::*;
pub use bezier::*;
pub use memory::*;
pub use particles::*;
pub use particle_pool::*;
pub use physics_utils::*;
pub use batch_transfer::*;
pub use nebula_system::*;
pub use spatial::*;

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
    console_log!("Meteor particle system ready!");
    console_log!("Unified particle manager ready!");
    console_log!("Spatial indexing ready!");
}