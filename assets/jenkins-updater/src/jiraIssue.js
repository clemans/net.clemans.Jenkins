import axios from "axios";
import {interpolation} from "interpolate-json"
import {Jira, Region} from "../meta/parameters.js"
import {GetSecretValueCommand, SecretsManagerClient} from "@aws-sdk/client-secrets-manager";

/**
 * @file Update helper functions for Atlassian Jira: `create-issue`.
 *       Uses the REST API to create a Jira Issue and output the issue number.
 * @author Brooks C. Clemans <brooks@clemans.net>
 * @see <a href="https://docs.atlassian.com/software/jira/docs/api/REST/1000.824.0/">JIRA Cloud REST API Reference</a>
 */

/**
 * Creates a new Atlassian Jira Issue
 * @param {object} jiraInfo - GitHub Repository Branch *(Config Options):*
 * @param {string} jiraInfo.auth -  AWS Secrets Manager ARN
 * @param {object} jiraInfo.data - Atlassian Jira Field Inputs *({@link https://developer.atlassian.com/server/jira/platform/rest-apis/ Jira REST API Documentation})*
 * @param {string} jiraInfo.user - Jira user's email address
 * @returns {Promise<any>} - Returns a new Jira Issue metadata object.
 * @public
 */
export async function createJiraIssue(jiraInfo) {
    try {
        let {auth, data, user} = jiraInfo
        const {baseURL, headers, method, url} = Jira
        const jiraAuth = await _getJiraAuth(user, auth)
        const jiraHeaders = interpolation.expand(headers, {jiraAuth})
        return (await axios({
            method,
            baseURL: baseURL,
            url,
            headers: jiraHeaders,
            data: data
        })).data
    } catch (err) {
        console.error(err.response)
    }
}

/**
 * Returns Jira API Base64 bearer token.
 * @param {String} user - Jira user's email address
 * @param {String} auth - AWS Secrets Manager ARN
 * @returns {Promise<string>} - Jira API bearer token in base64 string.
 * @private
 */
async function _getJiraAuth(user, auth) {
    try {
        const userHeader = user
        const authHeader = (await new SecretsManagerClient({
            region: Region
        }).send(new GetSecretValueCommand({
            SecretId: auth
        }))).SecretString
        return Buffer.from(String(userHeader).concat(":", authHeader)).toString("base64")
    } catch (err) {
        console.error(err)
    }
}