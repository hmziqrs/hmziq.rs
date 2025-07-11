# Visual Quality Test Component

## Overview

Created `VisualQualityTest.tsx` - a comprehensive debugging and quality testing component for the optimized visual effects.

## Features

### 1. Real-time Performance Metrics

- **FPS Display**: Color-coded (red < 30, yellow < 50, green >= 50)
- **Frame Time**: Shows render time per frame
- **Quality Tier**: Current active quality setting

### 2. Element Counts

- Live star count based on quality tier
- Active meteor count
- Nebula cloud count
- Updates in real-time when quality changes

### 3. Gradient Cache Analytics

- **Hit Rate**: Percentage of cache hits vs misses
- **Total Hits**: Cumulative successful cache retrievals
- **Cache Size**: Current number of cached gradients
- Color-coded hit rate (green > 90%, yellow > 70%, red < 70%)

### 4. Interactive Quality Tests

- **Cycle Quality Tier**: Quickly switch between performance/balanced/ultra
- **Test Mouse Movement Boost**: Simulates rapid mouse movement
- **Test Click Boost**: Triggers click acceleration effect

## Implementation Details

### Gradient Cache Stats

- Updated `GradientCache` class to track hits and misses
- Added `getStats()` method returning cache metrics
- Made gradient caches globally accessible via `window.gradientCaches`

### Keyboard Shortcut

- **Ctrl+Shift+Q**: Toggle visibility of the test panel
- Non-intrusive - hidden by default

### Visual Design

- Semi-transparent dark background with backdrop blur
- Monospace font for metrics readability
- Organized sections with clear hierarchy
- High z-index (10000) to stay above all content

## Usage

1. Press `Ctrl+Shift+Q` to show the panel
2. Monitor real-time performance metrics
3. Test quality tier transitions
4. Verify gradient cache efficiency
5. Test interactive speed boosts

## Integration

- Added to root layout for global availability
- Client-side only rendering to avoid SSR issues
- Updates every 100ms for smooth metric display
