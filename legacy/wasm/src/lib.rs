// Legacy Rust WASM modules - moved from active codebase
// These modules are preserved for reference but not compiled in active build

use wasm_bindgen::prelude::*;

// Legacy module imports
mod batch_transfer;
mod bezier;
mod memory;
mod physics_utils;
mod spatial;

// Re-export legacy functions
pub use batch_transfer::*;
pub use bezier::*;
pub use memory::*;
pub use physics_utils::*;
pub use spatial::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

// Legacy functions that were removed from active codebase
// These were related to:
// - Bezier path calculations (meteor system)
// - Physics utilities (meteor system)
// - Spatial indexing (nebula system)
// - Memory management (unused)
// - Batch transfer (unused)