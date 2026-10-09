import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // @monark/ui's site-header closes its mobile sheet with a setState in an
  // effect keyed on the pathname. The file is registry-owned (re-added with
  // `shadcn add --overwrite`), so the rule is relaxed here, not edited there.
  {
    files: ["src/components/ui/site-header.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
