module.exports = {
  env: {
    node: true,
    es2021: true
  },
  extends: ["eslint:recommended", "plugin:import/recommended", "prettier"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  rules: {}
};
