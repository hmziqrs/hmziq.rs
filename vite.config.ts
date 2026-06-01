import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

// Use VitePlus defineConfig so vp CLI reads fmt/lint/staged settings.
const { defineConfig } = await import("vite-plus");

export default defineConfig({
  // Git hooks for staged files
  staged: {
    "*": "vp fmt --no-error-on-unmatched-pattern",
  },

  // Oxfmt - https://oxc.rs/docs/guide/usage/formatter/config.html
  fmt: {
    tabWidth: 2,
    semi: false,
    printWidth: 100,
    singleQuote: true,
    endOfLine: "lf",
    trailingComma: "es5",
    sortImports: {},
    sortTailwindcss: {
      attributes: ["class", "className"],
      functions: ["clsx", "cn", "cva", "tw"],
    },
    sortPackageJson: true,
    ignorePatterns: [
      "bun.lock",
      "routeTree.gen.ts",
      ".tanstack-start/",
      ".tanstack/",
      ".output",
      "dist",
      "wasm/",
      "legacy/",
    ],
  },

  // Oxlint - https://oxc.rs/docs/guide/usage/linter/config
  lint: {
    plugins: ["typescript", "react", "react-perf", "jsx-a11y"],
    env: {
      builtin: true,
      node: true,
      browser: true,
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      { name: "react-hooks-js", specifier: "eslint-plugin-react-hooks" },
      {
        name: "eslint-tanstack-router",
        specifier: "@tanstack/eslint-plugin-router",
      },
      {
        name: "eslint-tanstack-query",
        specifier: "@tanstack/eslint-plugin-query",
      },
    ],
    rules: {
      "no-deprecated": "warn",
      "typescript/no-floating-promises": "off",
      "typescript/no-misused-spread": "off",

      "eslint-tanstack-router/create-route-property-order": "warn",

      "eslint-tanstack-query/exhaustive-deps": "warn",
      "eslint-tanstack-query/stable-query-client": "warn",
      "eslint-tanstack-query/no-rest-destructuring": "warn",
      "eslint-tanstack-query/no-unstable-deps": "warn",
      "eslint-tanstack-query/infinite-query-property-order": "warn",
      "eslint-tanstack-query/no-void-query-fn": "warn",
      "eslint-tanstack-query/mutation-property-order": "warn",

      "react-hooks-js/config": "error",
      "react-hooks-js/error-boundaries": "error",
      "react-hooks-js/gating": "error",
      "react-hooks-js/globals": "error",
      "react-hooks-js/immutability": "error",
      "react-hooks-js/incompatible-library": "warn",
      "react-hooks-js/preserve-manual-memoization": "error",
      "react-hooks-js/purity": "error",
      "react-hooks-js/refs": "error",
      "react-hooks-js/set-state-in-effect": "warn",
      "react-hooks-js/set-state-in-render": "error",
      "react-hooks-js/static-components": "error",
      "react-hooks-js/unsupported-syntax": "warn",
      "react-hooks-js/use-memo": "error",
      "react-hooks-js/void-use-memo": "error",
    },
    ignorePatterns: [
      "dist",
      ".output",
      "scripts/",
      "wasm/",
      "legacy/",
    ],
  },

  // Vite build config
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
  },
  plugins: [
    devtools(),
    tanstackStart(),
    nitro({
      preset: "static",
      traceDeps: ["react", "react-dom"],
    }),
    viteReact(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
  ],
});
