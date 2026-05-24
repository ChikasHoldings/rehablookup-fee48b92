import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
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
      "unused-imports": unusedImports,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // An unused import is how the dead ProviderPerformanceAnalytics
      // component shipped. `no-unused-imports` is ERROR (and autofixable
      // — it removes the specifier, never touches side-effect
      // `import "x"` statements which have no binding to flag), so a
      // future dead import fails CI. The core no-unused-vars rule stays
      // off (the repo carries a large pre-existing unused-local-var
      // debt outside this cleanup's scope; surfacing it as 175 new
      // warnings would just be noise).
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
    },
  },
);
