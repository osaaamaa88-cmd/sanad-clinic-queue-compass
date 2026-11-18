import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Generated files are not linted: Lovable/Supabase regenerate them, so
  // formatting them would be overwritten churn. admin-access.tsx is out of
  // scope for this phase (separate registration-stats branch work); its
  // prettier/exhaustive-deps findings stay until that file is next touched.
  {
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      "src/integrations/supabase/**",
      "src/generated/**",
      "src/routes/admin-access.tsx",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // `_`-prefixed names are intentionally unused (same convention as
      // tsc's noUnusedLocals/noUnusedParameters, e.g. omitting keys via
      // rest destructuring in EmergencyVaultCard).
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  eslintPluginPrettier,
);
