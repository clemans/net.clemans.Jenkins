import {readdirSync, writeFileSync} from "fs"
import {Octokit} from "octokit";

/**
 * @file Update helper functions for jenkins-configuration-as-code: `Dockerfile`.
 * Retrieves the latest <a href="https://github.com/jenkinsci/jenkins/releases/latest">release</a>
 *       and updates the file.
 * @author Brooks C. Clemans <brooks@clemans.net>
 * @see <a href="https://hub.docker.com/r/jenkins/jenkins/">Jenkins CI/CD Server Docker Image</a>
 */

/**
 * Fetches the latest Docker container version of Jenkins and writes to a file.
 * @param {string} dockerFile - A Dockerfile in utf-8 String format.
 * @returns {Promise<void>} - Writes updated Dockerfile to file location: `/tmp/Dockerfile`
 * @public
 */
export async function writeLatestDockerfile(dockerFile) {
    try {
        const outFile = "/tmp/Dockerfile"
        const updated = await _updateImage(dockerFile)
        writeFileSync(outFile, updated)
        console.log(readdirSync("/tmp/"))
    } catch (err) {
        console.error(err)
    }
}

/**
 * Returns an updated version of the provided Jenkins Dockerfile.
 * @param {string} dockerFile - A valid Dockerfile in utf-8 String format.
 * @returns {Promise<string>} - Latest version of Dockerfile in utf-8 String format.
 * @private
 */
async function _updateImage(dockerFile) {
    const latest = await _fetchLatestVersion()
    const current = (dockerFile.match(/(^.*)/) || [])[1].split(":")[1]
    return dockerFile.replace(current, latest)
}

/**
 * Returns the latest Dockerfile version for Jenkins.
 * @returns {Promise<String>} - Version number in string format (e.g. "3.123")
 * @private
 */
async function _fetchLatestVersion() {
    const octokit = new Octokit()
    const latestRelease = (await octokit.rest.repos.getLatestRelease({
        repo: "jenkins",
        owner: "jenkinsci"
    })).data.name
    return latestRelease
}