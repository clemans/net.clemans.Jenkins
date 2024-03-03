export default {
    "roots": [
        "<rootDir>/test"
    ],
    testMatch: [ '**/*.test.ts', '**/*.spec.js' ],
    transform: {
        "^.+\\.jsx?$": "babel-jest"
    }
}