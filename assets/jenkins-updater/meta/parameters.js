"use strict";

/**
 * The AWS AccountId for your CloudFormation Stack
 * @type {string}
 */
const awsAccountId = "000123456789" // Change me

/**
 * The region of where to retrieve AWS Secret Manager secrets
 * @type {string}
 */
export const Region = "eu-central-2" // Change me

/**
 * The Jira parameters to create an Atlassian Jira issue
 * @type {{headers: {Authorization: string, Accept: string, "Content-Type": string}, baseURL: string, method: string, url: string}}
 */
export const Jira = {
    "auth": `arn:aws:secretsmanager:${Region}:${awsAccountId}:secret:jira-password`,
    "baseURL": "https://company.atlassian.net/rest/api/2/", // Change me
    "data": {
        "update": {},
        "fields": {
            "summary": "[CI/CD] Jenkins Weekly Update",
            "issuetype": {
                "id": "3" // Change me
            },
            "project": {
                "id": "12345" // Change me
            },
            "description": "* An automated new branch is created for Jenkins, automatic version updates made, and PR sent to team for review.\n",
            "reporter": {
                "id": "1aa2b3c4d5f12da3bc4d5efa1" // Change me
            },
            "priority": {
                "id": "1" // Change me
            },
            "labels": [
                "ci/cd",
                "jenkins",
                "updates"
            ],
            "assignee": {
                "id": "1aa2b3c4d5f12da3bc4d5efa1" // Change me
            }
        }
    },
    "headers": {
        "Authorization": "Basic ${jiraAuth}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    },
    "method": "post",
    "url": "/issue/",
    "user": "devops@company.com" // Change me
}

/**
 * The GitHub parameters to create and update a feature branch and pull request
 * @type {{owner: string, baseRefName: string, issue: string, auth: string, repo: string, GraphQL: {UpdatePullRequest: {query: string, branchName: string}, CreatePullRequest: {query: string}}, repositoryId: string, title: string, body: string, headRefName: string}}
 */
export const GitHub = {
    "auth": `arn:aws:secretsmanager:${Region}:${awsAccountId}:secret:github-api-token`,
    "baseRefName": "main",
    "headRefName": "feature/${issue}",
    "issue": "", // this is fine to leave blank
    "title": "${issue}: Weekly Update",
    "body": "## Description of Changes\n* Updates all plugins to latest\n* Updates Jenkins to latest\n\n## Jira Ticket(s)\n[${issue}](https://company.atlassian.net/browse/${issue})",
    "owner": "OrganizationName",
    "repo": "aws-cdk-jenkins",
    "repositoryId": "NFEd5rHlcG9zaDVzxnkzNoT9NWKyNTc=", // Change me (Pain in the ass value. See here on how to retrieve: https://github.com/github/docs/issues/6631)
    "GraphQL": {
        CreatePullRequest: {
            "query": "mutation ($input: CreatePullRequestInput!) {\n  createPullRequest(input: $input) {\n    pullRequest {\n      url\n    }\n  }\n}"
        },
        UpdatePullRequest: {
            "branchName": "feature/${issue}",
            "query": "mutation ($input: CreateCommitOnBranchInput!) {\n  createCommitOnBranch(input: $input) {\n    commit {\n      url\n    }\n  }\n}"
        }
    }
}