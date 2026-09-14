/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  transform: {},
  roots: ["<rootDir>/backend"],
  testMatch: ["**/__tests__/**/*.test.js"],
  clearMocks: true,
  verbose: true,
};

export default config;
