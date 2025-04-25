/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
  // 👇 Aquí necesitas incluir también la carpeta `tests` para que Jest vea los tests ahí
  roots: ["<rootDir>/src", "<rootDir>/src/tests"],

  moduleNameMapper: {
    "^@app(.*)$": "<rootDir>/src/application$1",
    "^@routes(.*)$": "<rootDir>/src/routes$1",
    "^@controllers(.*)$": "<rootDir>/src/controllers$1",
    "^@services(.*)$": "<rootDir>/src/services$1",
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@validations(.*)$": "<rootDir>/src/validations$1",
    "^@config(.*)$": "<rootDir>/src/config$1"
  },
};
