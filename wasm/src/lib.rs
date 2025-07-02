use wasm_bindgen::prelude::*;

// Module imports
mod math;
mod star_field;

// Re-export public functions
pub use math::*;
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
}