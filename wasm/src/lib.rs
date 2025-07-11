#![cfg_attr(feature = "simd", feature(portable_simd))]
use wasm_bindgen::prelude::*;

// Module imports - active modules only
mod math;
mod star_field;

// Re-export public functions
pub use math::*;
pub use star_field::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);
}

#[macro_export]
macro_rules! console_log {
    ($($t:tt)*) => (crate::log(&format_args!($($t)*).to_string()))
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

// SIMD detection and reporting functions
#[wasm_bindgen]
pub fn is_simd_enabled() -> bool {
    #[cfg(feature = "simd")]
    {
        true
    }
    #[cfg(not(feature = "simd"))]
    {
        false
    }
}

#[wasm_bindgen]
pub fn get_simd_info() -> String {
    #[cfg(feature = "simd")]
    {
        format!("SIMD enabled: packed_simd with f32x4/f32x8 support")
    }
    #[cfg(not(feature = "simd"))]
    {
        format!("SIMD disabled: using scalar fallbacks")
    }
}

#[wasm_bindgen(start)]
pub fn main() {
    console_log!("WASM module loaded successfully!");
    console_log!("Star field optimization ready!");
    console_log!("Spatial indexing ready!");
    
    // Report SIMD status
    #[cfg(feature = "simd")]
    console_log!("SIMD: ENABLED - Using packed_simd with f32x4/f32x8");
    #[cfg(not(feature = "simd"))]
    console_log!("SIMD: DISABLED - Using scalar fallbacks");
}
