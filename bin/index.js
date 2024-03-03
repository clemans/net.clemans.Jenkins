"use strict"
const {App} = require("aws-cdk-lib");
const app = new App();
const {buildStackName, gitBranch, isDefaultBranch} = require("../src/helpers");
const packageConf = require("../package.json");
const parameters = require("../meta/parameters");
const {JenkinsStack} = require("../lib/JenkinsStack");

try {
    (async () => {
        const serviceName = packageConf.name,
            branchName = gitBranch(),
            featureSuffix = isDefaultBranch(branchName) ? '' : `-${branchName.replace(/\//g, "-")}`;

        const props = {
            stackName: `${buildStackName(serviceName)}`,
            env: {
                account: parameters.AccountId,
                region: parameters.Regions[0],
                serviceName,
                featureSuffix,
                isFeatureBranch: featureSuffix.length > 0,
                vpcId: parameters.VpcId
            },
            description: packageConf.description,
            terminationProtection: isDefaultBranch(branchName)
        };

        new JenkinsStack(app, props.stackName, props);
        app.synth();
    })()
} catch (e) {
    console.error(e.message);
    process.exit(1);
}