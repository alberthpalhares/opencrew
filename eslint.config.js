import js from "@eslint/js";
import globals from "globals";

// The office page (E1) is the only code here that runs in the browser: it gets the browser
// globals instead of Node's, so a stray `process` or `require` in it fails the lint.
const OFFICE_PAGE = "templates/_opencrew/core/escritorio/**/*.js";

const rules = {
  "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  "no-undef": "error",
  "no-constant-binary-expression": "error",
  "no-duplicate-imports": "error",
};

const languageOptions = (names) => ({
  ecmaVersion: "latest",
  sourceType: "module",
  globals: { ...names },
});

export default [
  js.configs.recommended,
  { ignores: [OFFICE_PAGE], languageOptions: languageOptions(globals.node), rules },
  { files: [OFFICE_PAGE], languageOptions: languageOptions(globals.browser), rules },
];
