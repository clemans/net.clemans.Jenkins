"use strict";
const {execSync} = require("child_process")
const _defaultBranchNames = ["develop", "main", "master"];

/**
 * Creates a CloudFormation-compatible Stack Name from a base name + (feature branch).
 * Example: baseStackName = "my-new-service"
 *          branchName = "feature/jira-1234"
 *          returns "my-new-service-feature-jira-1234"
 * @param {string} baseStackName
 * @returns {string}
 * @throws {Error}
 * @public
 */
function buildStackName(baseStackName){
    if(!_isNotEmptyString(baseStackName)) {
        throw new Error("Expects a string parameter.");
    }
    const branchName = gitBranch();
    const stackName = isDefaultBranch(branchName) ? baseStackName : baseStackName + "-" + branchName.replace(/\//, "-");
    if(isCloudFormationStackNameSafe(stackName)){
        return stackName;
    } else {
        throw new Error(`"${stackName}" is not a valid CloudFormation Stack Name.`);
    }
}

/**
 * Returns the current git branch name of the checked out working copy.
 * If this is not a Git branch, returns an empty string.
 * @returns {string}
 * @throws {Error}
 * @public
 */
function gitBranch() {
    const gitCmd = "git branch --show-current";
    try {
        return execSync(gitCmd).toString().trim();
    } catch (err) {
        if (err.status === 128) {
            // Error 128, from `git branch` indicates that this is not a Git repo.
            console.error("This is not a Git working copy.");
            return '';
        }
        throw new Error(err);
    }
}

/**
 * Returns whether a passed in stackName is a valid CloudFormation Stack Name.
 * @param {string} stackName
 * @returns {boolean}
 * @private
 */
function isCloudFormationStackNameSafe(stackName){
    if(typeof stackName === "string" && stackName.length > 0 && stackName.length <= 128){
        return null !== stackName.match(/^[a-zA-Z0-9-]+$/im);
    }
    return false;
}

/**
 * Checks if the passed-in branch name matches the Default Branch Name.
 * @param {string} branchName
 * @returns {boolean}
 * @public
 */
function isDefaultBranch(branchName) {
    if (_isNotEmptyString(branchName)) {
        return _defaultBranchNames.indexOf(branchName) > -1;
    }
    return false
}

/**
 * Checks for a non-string Type, or empty value.
 * @param {*} val
 * @returns {boolean}
 * @private
 */
function _isNotEmptyString(val) {
    return (typeof val === "string" && val.length > 0);
}

module.exports.isDefaultBranch = isDefaultBranch;
module.exports.gitBranch = gitBranch;
module.exports.buildStackName = buildStackName;