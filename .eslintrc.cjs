module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react-hooks"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  ignorePatterns: ["dist", "node_modules", "coverage"],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "off"
  }
};
