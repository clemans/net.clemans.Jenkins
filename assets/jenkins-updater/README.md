# AWS Lambda: Jenkins Updater

## Overview

### [jenkins-updater] → An AWS Lambda that automates the following workflow

- Updates [Dockerfile][dockerfile] to the latest version
- Updates [plugins.txt][plugins] to their latest version
- Create an Atlassian Jira Issue (DEVOPS-####)
- Create a GitHub branch using the Jira issue number
- Commits [Dockerfile][dockerfile] & [plugins.txt][plugins] to the GitHub branch
- Creates a new GitHub pull request

### Diagram

![Jenkins Updater Workflow Diagram][workflow-img]

[jenkins-updater]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins-updater
[dockerfile]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins/Dockerfile
[plugins]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins/plugins.txt
[workflow-img]: ./docs/lambda-workflow.png
