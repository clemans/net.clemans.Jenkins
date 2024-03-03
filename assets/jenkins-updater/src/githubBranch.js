import {Octokit} from "octokit";
import {interpolation} from "interpolate-json"
import {GitHub, Region} from "../meta/parameters.js";
import {readFileSync} from "fs";
import {GetSecretValueCommand, SecretsManagerClient} from "@aws-sdk/client-secrets-manager";

/**
 * @file Update helper functions for GitHub: `create-branch` & `pull-request`.
 * Uses the GraphQL & REST API to create, read, and pull github branch.
 * @author Brooks C. Clemans <brooks@clemans.net>
 * @see <a href="https://docs.github.com/en/graphql/reference/">GitHub GraphQL</a> &
 *      <a href="https://docs.github.com/en/rest">GitHub REST API</a>
 */

/**
 * Creates a new GitHub branch and returns branch metadata.
 * @param {object} branchData - GitHub Repository Branch *(Config Options):*
 * @param {string} branchData.auth - AWS Secrets Manager ARN
 * @param {string} branchData.owner - Private Repository Owner
 * @param {string} branchData.repo - Private Repository Name
 * @param {string} branchData.issue - Jira Issue
 * @param {string} [branchData.sha] - Existing Branch SHA-1 Hash *(defaults to 'main')*
 * @returns {Promise<any>} - Returns an Octokit GraphQL Response. See {@link Octokit.graphql}
 */
export async function createBranch(branchData) {
    let {auth, owner, repo, issue, sha} = branchData
    const {headRefName} = interpolation.expand(GitHub, {issue})
    const branch = headRefName
    const ref = `refs/heads/${branch}`
    auth = await _getAuthToken(auth)
    sha = sha ? sha : (await readBranch(branchData)).commit.sha

    const octokit = new Octokit({auth});
    return (await octokit.request("POST /repos/{owner}/{repo}/git/refs", {
        accept: "application/vnd.github.v3+json",
        owner,
        repo,
        ref,
        sha
    })).data
}

/**
 * Updates an existing GitHub branch and returns commit metadata.
 * @param {object} branchData - GitHub Repository Branch *(Config Options):*
 * @param {string} branchData.auth - AWS Secrets Manager ARN
 * @param {string} branchData.owner  - Private Repository Owner
 * @param {string} branchData.repo - Private Repository Name
 * @param {string} branchData.issue - Jira Issue
 * @returns {Promise<any>} - Returns a commit metadata object. See {@link Octokit.graphql}
 * @public
 */
export async function updateBranch(branchData) {
    /* GitHub Variables */
    let {auth, owner, repo, issue} = branchData
    const {headRefName, body, title, GraphQL: {UpdatePullRequest: {query}}} = interpolation.expand(GitHub, {issue})

    const sha = (await readBranch(branchData)).commit.sha // by default, retrieves "main" ref sha
    auth = await _getAuthToken(auth)
    /* GraphQL Variables */
    const input = {
        branch: {
            branchName: headRefName,
            repositoryNameWithOwner: `${owner}/${repo}`
        },
        message: {
            headline: title,
            body: body,
            fileChanges: {
                additions: [
                    {
                        path: "assets/jenkins/Dockerfile",
                        contents: readFileSync("/tmp/Dockerfile", {encoding: "base64"})
                    },
                    {
                        path: "assets/jenkins/plugins.txt",
                        contents: readFileSync("/tmp/plugins.txt", {encoding: "base64"})
                    }
                ]
            },
            expectedHeadOid: sha
        }
    }
    const octokit = new Octokit({auth});
    return await octokit.graphql(query, {input: input})
}

/**
 * Creates a GitHub pull request.
 * @param {object} branchData - GitHub Repository Branch *(Config Options):*
 * @param {string} branchData.auth - AWS Secrets Manager ARN
 * @param {string} branchData.issue - Jira Issue
 * @param {string} branchData.repositoryId - The GitHub repository's Unique Id (See:
 * @returns {Promise<Octokit.graphql>} - Returns a pull request metadata object. See: {@link Octokit.graphql}
 * @public
 */
export async function pullRequest(branchData) {
    let {auth, issue, repositoryId} = branchData
    const {baseRefName, headRefName, body, title, GraphQL: {CreatePullRequest: {query}}} = interpolation.expand(GitHub, {issue})
    auth = await _getAuthToken(auth)
    const input = {
        baseRefName,
        body,
        draft: false,
        headRefName,
        repositoryId,
        title
    }
    const octokit = new Octokit({auth});
    return await octokit.graphql(query, {input: input})
}

/**
 * Returns a GitHub branch.
 * @param {object} branchData - GitHub Repository Branch *(Config Options):*
 * @param {string} branchData.auth - AWS Secrets Manager ARN
 * @param {string} branchData.owner - Private Repository Owner
 * @param {string} branchData.repo - Private Repository Name
 * @param {string} [branchData.branch] - Private Repository Branch Name
 * @returns {Promise<*>} - GitHub branch metadata object. See: {@link Octokit.graphql}
 */
async function readBranch(branchData) {
    let {auth, owner, repo, branch} = branchData
    branch = branch ? branch : "main"
    auth = await _getAuthToken(auth)
    const octokit = new Octokit({auth});
    return ((await octokit.request("GET /repos/{owner}/{repo}/branches", {
        accept: "application/vnd.github.v3+json",
        owner,
        repo
    })).data.filter(branches => branches.name === branch))[0]
}

/**
 * Returns GitHub Personal Access Token.
 * @param {string} auth - The AWS Secrets Manager ARN to retrieve.
 * @returns {Promise<string>} - GitHub authentication token string.
 * @private
 */
async function _getAuthToken(auth) {
    try {
        return (await new SecretsManagerClient({
            region: Region
        })
            .send(
                new GetSecretValueCommand({
                    SecretId: auth
                })))
            .SecretString
    } catch (err) {
        console.log(err)
    }
}