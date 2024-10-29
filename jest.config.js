/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@app(.*)$": "<rootDir>/src/application$1",
    "^@routes(.*)$": "<rootDir>/src/routes$1",
    "^@controllers(.*)$": "<rootDir>/src/controllers$1",
    "^@services(.*)$": "<rootDir>/src/services$1",
  },
};
