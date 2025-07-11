// Global debug configuration for performance-sensitive components
interface DebugConfig {
  enableConsoleLogs: boolean
  enableStarFieldLogs: boolean
  enableNebulaLogs: boolean
}

class DebugConfigManager {
  private static instance: DebugConfigManager
  private config: DebugConfig = {
    enableConsoleLogs: false,
    enableStarFieldLogs: false,
    enableNebulaLogs: false,
  }

  private constructor() {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('debug-config')
      if (saved) {
        try {
          this.config = { ...this.config, ...JSON.parse(saved) }
        } catch (e) {
          console.warn('Failed to load debug config:', e)
        }
      }
    }
  }

  static getInstance(): DebugConfigManager {
    if (!DebugConfigManager.instance) {
      DebugConfigManager.instance = new DebugConfigManager()
    }
    return DebugConfigManager.instance
  }

  getConfig(): DebugConfig {
    return { ...this.config }
  }

  setConfig(updates: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...updates }

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('debug-config', JSON.stringify(this.config))
    }

    // Dispatch event for components to react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('debugConfigChanged', {
          detail: this.config,
        })
      )
    }
  }

  isEnabled(key: keyof DebugConfig): boolean {
    return this.config[key]
  }

  // Convenience methods
  toggleConsoleLogs(): void {
    this.setConfig({ enableConsoleLogs: !this.config.enableConsoleLogs })
  }
}

export { DebugConfigManager }
export type { DebugConfig }
