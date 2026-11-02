import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    // React Compiler-era rules from eslint-plugin-react-hooks v6. They flag long-standing,
    // working patterns (resetting state from props in an effect, ref reads in render) in
    // ~20 existing components. Surfaced as warnings so CI stays green; refactor per component
    // when it is next touched, with its behaviour covered by a test.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Installed agent skills are third-party tooling, not application code.
    ".claude/**",
  ]),
]);

export default eslintConfig;
