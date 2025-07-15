# Debugging Scatter Text Buffer Attribute Errors

## Problem
The ScatterText component is throwing "THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size" errors.

## Debug Setup

I've created a debug version of the component with the following improvements:

1. **ScatterTextDebug.tsx** - A debug-friendly version with:
   - Debug mode that disables auto-rendering
   - Comprehensive logging
   - Manual update controls
   - Memory validation
   - Fixed lifecycle management

2. **Test Page** - `/test-scatter` route with:
   - Debug controls UI
   - Manual frame updates
   - Real-time debug information
   - Console commands for testing

## How to Debug

1. **Run the development server:**
   ```bash
   bun dev
   ```

2. **Navigate to the test page:**
   ```
   http://localhost:3000/test-scatter
   ```

3. **Use Debug Controls:**
   - Enable "Debug Mode" to stop auto-rendering
   - Click "Update Frame" to manually advance animation
   - Use "Form" and "Scatter" buttons to change states
   - Watch the debug info panel for memory/buffer information

4. **Check Console:**
   - Open browser console to see detailed logs
   - Use console commands:
     ```javascript
     scatterTextDebug.updateFrame()
     scatterTextDebug.getMemoryInfo()
     scatterTextDebug.getParticleCount()
     ```

## Key Fixes Applied

1. **Fixed Component Lifecycle:**
   - WASM only initializes once
   - Text generation separated from WASM init
   - Proper cleanup on unmount

2. **Fixed Buffer Management:**
   - Buffers created once with fixed size (10,000 particles)
   - Using drawRange instead of resizing buffers
   - Proper bounds checking

3. **Added Memory Validation:**
   - Checks for WASM memory growth
   - Validates shared memory views
   - Error handling with detailed messages

## To Apply Fix to Original Component

Once the issue is identified, the fix can be applied to the original `ScatterText.tsx` by:

1. Separating WASM initialization from text generation
2. Creating geometry/buffers only once
3. Adding proper disposal in cleanup
4. Adding memory validation before updates

## Temporary Workaround

To use the debug version in production temporarily:

1. Import ScatterTextDebug instead of ScatterText
2. Set `debugMode={false}` to enable normal rendering
3. Remove `onDebugInfo` prop in production use