"use strict";
const {execSync} = require('child_process');

module.exports = {
    checkBinary: function (binary) {
        if (binary.length < 1) {
            throw new Error('Expected an array of Strings or Objects.');
        }
        const cl = `which ${binary} || where ${binary}`
        try {
            execSync(cl);
        } catch (err) {
            console.error(`⊗ Required "${binary}" not installed.`);
            return false;
        }
        return true;
    }
}