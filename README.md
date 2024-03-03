# net.clemans.Jenkins
<!-- PROJECT SHIELDS -->
<!-- [![Build Status][build-shield]][build-url] -->
A fully-loaded, feature enriched Jenkins Configuration as Code (JCasC) AWS CDK stack project.

## Infrastructure

![CloudFormation Stack][cfn-stack-img]

## Usage

Update the following files to best serve your own unique company configuration:

* AWS Resource Parameters: ./meta/[parameters.json]
* Jenkins Build: ./[assets]/[jenkins]/[Dockerfile]
* Jenkins System Configuration: ./[assets]/[jenkins]/[jenkins.yaml]
* GitHub Organization Repo Import: ./[assets]/[jenkins]/[jobs.yaml]
* Jenkins Plug-ins: ./[assets]/[jenkins]/[plugins.txt]
* Automated Jenkins Updater Parameters: ./[assets]/[jenkins-updater]/[parameters.js]

## What's in this project?

## ★ Jenkins Configuration-as-Code (JCasC)

All Jenkins related system configurations are found in this directory.

### ↳ [assets]/[jenkins]

* ↳ [Dockerfile]
  * Docker assembly image that from which the Jenkins environment deploys.
* ↳ [jenkins.yaml]
  * Configuration as code file from where to capture environment configurations for
the Jenkins host.
* ↳ [jobs.yaml]
  * Configuration as code file from where to capture job, trait, and behavior configurations
for the Jenkins host.

```typescript
/**
 
 jobs.yaml is a bit confusing (at least to me) so I wrote down a bit more information about its configuration as seen below.
 
 "Traits" or "Behaviors" help to create multi-branching in the GUI that are NOT "declarative-compatible".
 
 See this issue for more information: https://issues.jenkins.io/browse/JENKINS-45504
 
 
 ↳ Discover Branches
    strategyId:
     1 (Exclude branches that are also filed as PRs)
     2 (Only branches that are also filed as PRs)
     3 (All branches)

 ↳ Filter by Name
    includes:
     * (wildcard regular expression)

 ↳ Discover Pull Requests
    strategyId:
     1 (Merging the pull request with the current target branch revision)
     2 (The current pull request revision)
     3 (Both the current PR revision & PR merged w/ current target branch revision)

 **/

    traits << 'org.jenkinsci.plugins.github__branch__source.BranchDiscoveryTrait' {
        strategyId('3')
    }
    
    traits << 'jenkins.scm.impl.trait.WildcardSCMSourceFilterTrait' {
        includes('*')
    }

    traits << 'org.jenkinsci.plugins.github__branch__source.ForkPullRequestDiscoveryTrait' {
        strategyId('1')
        trust(class: 'org.jenkinsci.plugins.github_branch_source.ForkPullRequestDiscoveryTrait$TrustContributors')
    }
    
    traits << 'jenkins.scm.impl.trait.RegexSCMHeadFilterTrait' {
        regex('^(?!(review|master|main)).*')
    }
```

* ↳ [plugins.txt]
  * Configuration as code file from where to add, remove, or update Jenkins controller plug-ins.

## ★ Automated Jenkins Updates

An AWS Node.js lambda that automatically fetches updates for the Jenkins docker container and its plug-ins.

### ↳ [assets]/[jenkins-updater]

* ↳ [bin]/[index.js]
  * The AWS Lambda handler entrypoint.

* ↳ [meta]/[parameters.js]
  * All AWS, GitHub, and Jira metadata necessary to power the update lambda function.

* ↳ [src]/[dockerFileUpdater.js]
  * Helper functions that fetches the latest Dockerfile version for [Dockerfile].
  
* ↳ [src]/[githubBranch.js]
  * Helper functions that create GitHub branches and pull requests.
  
* ↳ [src]/[jiraIssue.js]
  * Helper functions that creates a Jira Issue to track Jenkins updated work done.
  
* ↳ [src]/[pluginsFileUpdater.js]
  * Helper functions that fetches the latest Jenkins plug-ins versions for [plugins.txt].
  
## Resources

| Type                                          | Logical ID                                                           |
|-----------------------------------------------|----------------------------------------------------------------------|
|  AWS::AutoScaling::AutoScalingGroup           |  JenkinsASGASG3F72D33E                                                                                                                                                            |
|  AWS::AutoScaling::LaunchConfiguration        |  JenkinsASGLaunchConfig01D75B5C                                                                                                                                                   |
|  AWS::AutoScaling::LifecycleHook              |  JenkinsASGLifecycleHookDrainHookA0A8F22C                                                                                                                                         |
|  AWS::Backup::BackupPlan                      |  JenkinsEFSBackupPlan9E0B3387                                                                                                                                                                  |
|  AWS::Backup::BackupSelection                 |  JenkinsEFSBackupPlanJenkinsBackupResourceC3A292E4                                                                                                                        |
|  AWS::Backup::BackupVault                     |  JenkinsBackupVault7E2F2A74                                                                                                                                                                    |
|  AWS::CDK::Metadata                           |  CDKMetadata                                                                                                                                                                                                        |
|  AWS::CloudFormation::CustomResource          |  JenkinsCertificateCertificateRequestorResourceDB918B2B                                                                                                                                        |
|  AWS::EC2::SecurityGroupEgress                |  JenkinsAlbEc2ServiceLBSecurityGrouptoJenkinsAlbEc2ServiceSGF5E8A17350000E221DEE6                         |
|  AWS::EC2::SecurityGroupEgress                |  JenkinsAlbEc2ServiceLBSecurityGrouptoJenkinsAlbEc2ServiceSGF5E8A1738080C0D83C7C                          |
|  AWS::EC2::SecurityGroupEgress                |  JenkinsJnlpSGtoJenkinsAlbEc2ServiceSGF5E8A173500006DFF5F82                                    |
|  AWS::EC2::SecurityGroupEgress                |  JenkinsJnlpSGtoJenkinsAlbEc2ServiceSGF5E8A173808026654CFC                                     |
|  AWS::EC2::SecurityGroupIngress               |  JenkinsAlbEc2ServiceSGfromJenkinsAlbEc2ServiceLBSecurityGroup87B64B0C500001309201E                       |
|  AWS::EC2::SecurityGroupIngress               |  JenkinsAlbEc2ServiceSGfromJenkinsAlbEc2ServiceLBSecurityGroup87B64B0C80804688CC28                        |
|  AWS::EC2::SecurityGroupIngress               |  JenkinsAlbEc2ServiceSGfromJenkinsJnlpSGBAAAE6A65000003D5AC37                                  |
|  AWS::EC2::SecurityGroupIngress               |  JenkinsAlbEc2ServiceSGfromJenkinsJnlpSGBAAAE6A68080AAF5CFF2                                   |
|  AWS::EC2::SecurityGroup                      |  JenkinsAlbEc2ServiceLBSecurityGroupC90BFC87                                                                                                                                                   |
|  AWS::EC2::SecurityGroup                      |  JenkinsAlbEc2ServiceSG0DA3881B                                                                                                                                              |
|  AWS::EC2::SecurityGroup                      |  JenkinsASGInstanceSecurityGroup563929F6                                                                                                                                          |
|  AWS::EC2::SecurityGroup                      |  JenkinsEfsSecurityGroup935232CA                                                                                                                                                               |
|  AWS::EC2::SecurityGroup                      |  JenkinsJnlpSG2E613CA1                                                                                                                                                              |
|  AWS::ECS::CapacityProvider                   |  JenkinsAsgCapacityProviderD8892E56                                                                                                                                                            |
|  AWS::ECS::ClusterCapacityProviderAssociations|  JenkinsEcsCluster4825DB6D                                                                                                                                                                     |
|  AWS::ECS::Cluster                            |  JenkinsEcsClusterFE6DEC3F                                                                                                                                                                     |
|  AWS::ECS::Service                            |  JenkinsAlbEc2ServiceCAC225C7                                                                                                                                                           |
|  AWS::ECS::TaskDefinition                     |  JenkinsTaskDefinition3B233132                                                                                                                                                                 |
|  AWS::EFS::AccessPoint                        |  efsAccessPoint70FE6015                                                                                                                                                                            |
|  AWS::EFS::FileSystem                         |  JenkinsElasticFileSystem09BBE532                                                                                                                                                              |
|  AWS::EFS::MountTarget                        |  JenkinsElasticFileSystemEfsMountTarget121C9999B                                                                                                                                               |
|  AWS::EFS::MountTarget                        |  JenkinsElasticFileSystemEfsMountTarget26B751C0E                                                                                                                                               |
|  AWS::ElasticLoadBalancingV2::Listener        |  JenkinsAlbEc2ServiceLBjnlpListener7753645B                                                                                                                                   |
|  AWS::ElasticLoadBalancingV2::Listener        |  JenkinsAlbEc2ServiceLBPublicListener378A7CCF                                                                                                                                                  |
|  AWS::ElasticLoadBalancingV2::Listener        |  JenkinsAlbEc2ServiceLBPublicRedirectListener789593C5                                                                                                                                          |
|  AWS::ElasticLoadBalancingV2::LoadBalancer    |  JenkinsAlbEc2ServiceLB235172E1                                                                                                                                                                |
|  AWS::ElasticLoadBalancingV2::TargetGroup     |  JenkinsAlbEc2ServiceLBPublicListenerECSGroup5BC1289C                                                                                                                                          |
|  AWS::ElasticLoadBalancingV2::TargetGroup     |  jnlpTargetGroup10859031                                                                                                                                                                           |
|  AWS::Events::Rule                            |  JenkinsUpdateCronEvent9916D40A                                                                                                                                                                                     |
|  AWS::IAM::InstanceProfile                    |  JenkinsASGInstanceProfileBAD5B7A2                                                                                                                                                |
|  AWS::IAM::Policy                             |  JenkinsASGDrainECSHookFunctionServiceRoleDefaultPolicy21EADBF6                                                                                                                   |
|  AWS::IAM::Policy                             |  JenkinsASGLifecycleHookDrainHookRoleDefaultPolicyCC12A564                                                                                                                        |
|  AWS::IAM::Policy                             |  JenkinsCertificateCertificateRequestorFunctionServiceRoleDefaultPolicyE110D909                                                                                                                |
|  AWS::IAM::Policy                             |  JenkinsEcsInlinePolicy37427388                                                                                                                                                                |
|  AWS::IAM::Policy                             |  JenkinsSessionManagerRoleDefaultPolicyDC2CE81C                                                                                                                                                |
|  AWS::IAM::Policy                             |  JenkinsTaskDefinitionExecutionRoleDefaultPolicy607C8FF6                                                                                                                                       |
|  AWS::IAM::Policy                             |  LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8aServiceRoleDefaultPolicyADDA7DEB                                                                                                                                       |
|  AWS::IAM::Role                               |  JenkinsASGDrainECSHookFunctionServiceRoleF2A3D651                                                                                                                                |
|  AWS::IAM::Role                               |  JenkinsASGLifecycleHookDrainHookRole57FC3E54                                                                                                                                     |
|  AWS::IAM::Role                               |  JenkinsCertificateCertificateRequestorFunctionServiceRole9FC04861                                                                                                                             |
|  AWS::IAM::Role                               |  JenkinsEcsBackendTaskRoleDB74F346                                                                                                                                                             |
|  AWS::IAM::Role                               |  JenkinsSessionManagerRoleF3A25009                                                                                                                                                             |
|  AWS::IAM::Role                               |  JenkinsTaskDefinitionExecutionRole6D98070E                                                                                                                                                    |
|  AWS::IAM::Role                               |  JenkinsUpdateLambdaRoleB1D2406C                                                                                                                                                                                    |
|  AWS::IAM::Role                               |  LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8aServiceRole9741ECFB                                                                                                                                                    |
|  AWS::IAM::Role                               |  JenkinsEFSBackupPlanJenkinsBackupResourceRole44E3A6C2                                                                                                                    |
|  AWS::Lambda::Function                        |  JenkinsASGDrainECSHookFunctionFABF4AD3                                                                                                                                           |
|  AWS::Lambda::Function                        |  JenkinsCertificateCertificateRequestorFunctionAFBA0BDF                                                                                                                                        |
|  AWS::Lambda::Function                        |  JenkinsUpdateLambdaD6EB6104                                                                                                                                                                                        |
|  AWS::Lambda::Function                        |  LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8aFD4BFC8A                                                                                                                                                               |
|  AWS::Lambda::Permission                      |  JenkinsASGDrainECSHookFunctionAllowInvokeJenkinsASGLifecycleHookDrainHookTopic7E705E8270FB72F7   |
|  AWS::Lambda::Permission                      |  JenkinsUpdateCronEventAllowEventRuleJenkinsUpdateLambda520A2B46E6B2859C                                                                                              |
|  AWS::Logs::LogGroup                          |  JenkinsAgentLogGroup24D0F8B9                                                                                                                                                                  |
|  AWS::Route53::RecordSet                      |  JenkinsAlbEc2ServiceDNS5D9F5FE3                                                                                                                                                               |
|  AWS::ServiceDiscovery::PrivateDnsNamespace   |  JenkinsEcsClusterDefaultServiceDiscoveryNamespaceCE0D9B3E                                                                                                                                     |
|  AWS::ServiceDiscovery::Service               |  JenkinsAlbEc2ServiceCloudmapServiceCE1E699F                                                                                                                                            |
|  AWS::SNS::Subscription                       |  JenkinsASGDrainECSHookFunctionTopic06FF8B6A                                                                                                                                      |
|  AWS::SNS::Topic                              |  JenkinsASGLifecycleHookDrainHookTopicEC5988FF                                                                                                                                    |
|  Custom::LogRetention                         |  JenkinsUpdateLambdaLogRetention63FED890                                                                                                                                                                            |

<!-- ROADMAP -->
## Roadmap

* [ ] Add Unit Testing
* [ ] Create README.md for ./[assets]/[jenkins-updater]/[meta]/[parameters.js]
* [ ] Consolidate parameters between ./meta/[parameters.json] & ./[assets]/[jenkins-updater]/[meta]/[parameters.js]

<!-- MARKDOWN LINKS & IMAGES -->
[cfn-stack-img]: ./docs/cfn-stack.png

[parameters.json]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/meta/parameters.json

[assets]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets
[jenkins]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins
[Dockerfile]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins/Dockerfile
[jenkins.yaml]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins/jenkins.yaml
[jobs.yaml]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins/jobs.yaml
[plugins.txt]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins/plugins.txt

[jenkins-updater]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins-updater
[bin]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins-updater/bin
[index.js]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins-updater/bin/index.js
[meta]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins-updater/meta
[parameters.js]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins-updater/meta/parameters.js
[src]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins-updater/src
[dockerFileUpdater.js]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins-updater/src/dockerFileUpdater.js
[githubBranch.js]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins-updater/src/githubBranch.js
[jiraIssue.js]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins-updater/src/jiraIssue.js
[pluginsFileUpdater.js]: https://github.com/clemans/net.clemans.Jenkins/-/blob/main/assets/jenkins-updater/src/pluginsFileUpdater.js
