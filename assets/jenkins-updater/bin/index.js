import {writeLatestDockerfile} from "../src/dockerFileUpdater.js";
import {writeLatestPlugins} from "../src/pluginsFileUpdater.js";
import {createJiraIssue} from "../src/jiraIssue.js";
import {createBranch, pullRequest, updateBranch} from "../src/githubBranch.js";
import {GitHub, Jira, Region} from "../meta/parameters.js";
import {S3, GetObjectCommand} from "@aws-sdk/client-s3";
const client = new S3({region: Region});

/**
 * @file `jenkins-updater` entrypoint of the AWS Lambda handler function.
 * @author Brooks C. Clemans <brooks@clemans.net>
 * @see <a href="https://www.jenkins.io/projects/jcasc/">Jenkins Configuration as Code</a>
 */

/**
 * An AWS Lambda handler function that executes the automation of updating Jenkins Dockerfile & plugins.txt.
 * @returns {Promise<void>}
 */
export const handler = async () => {
    try {
        /** Update Dockerfile **/
        const dockerfile = {
            Bucket: process.env.DOCKERFILE_BUCKET,
            Key: process.env.PLUGINS_KEY
        }
        const dockerFileData = await client.send(new GetObjectCommand(dockerfile));
        const dockerFileBody = await _streamToString(dockerFileData.Body);
        await writeLatestDockerfile(dockerFileBody)

        /** Update plugins.txt **/
        const plugins = {
            Bucket: process.env.PLUGINS_BUCKET,
            Key: process.env.PLUGINS_KEY
        }
        const dockerPlugInData = await client.send(new GetObjectCommand(plugins));
        const dockerPluginBody = await _streamToString(dockerPlugInData.Body)
        await writeLatestPlugins(dockerPluginBody)

        /** Create Jira Issue **/
        let {data, user} = Jira
        const jiraAuth = Jira.auth
        const jiraIssue = await createJiraIssue({auth: jiraAuth, data, user})

        /** Create Branch, Update Changes & Push Pull Request **/
        let {owner, repo, repositoryId} = GitHub
        const githubAuth = GitHub.auth
        const issue = jiraIssue.key
        await createBranch({auth: githubAuth, owner, repo, issue})
        await updateBranch({auth: githubAuth, owner, repo, issue})
        await pullRequest({auth: githubAuth, issue, repositoryId})

    } catch (err) {
        console.log("AWS Lambda Handler Error:\n", err);
    }
}

/**
 * Private helper function to convert a ReadableStream to String.
 * @param stream - AWS SDK Data stream object
 * @returns {Promise<String>} Returns a <string>.
 * @private
 */
const _streamToString = (stream) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });