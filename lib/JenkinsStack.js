"use strict"
const {AutoScalingGroup} = require("aws-cdk-lib/aws-autoscaling");
const {DnsValidatedCertificate, ValidationMethod} = require("aws-cdk-lib/aws-certificatemanager");
const {CfnOutput, Duration: {hours, minutes, seconds}, RemovalPolicy, Stack, Tags, Duration} = require("aws-cdk-lib");
const {InstanceType, Peer, Port, SecurityGroup, UserData, Vpc} = require("aws-cdk-lib/aws-ec2");
const {
    AmiHardwareType,
    AsgCapacityProvider,
    AwsLogDriver,
    Cluster,
    ContainerImage: {fromAsset},
    Ec2TaskDefinition,
    EcsOptimizedImage: {amazonLinux2},
    NetworkMode,
    Secret: {fromSecretsManager}
} = require("aws-cdk-lib/aws-ecs");
const {ApplicationLoadBalancedEc2Service} = require("aws-cdk-lib/aws-ecs-patterns");
const {AccessPoint, CfnMountTarget, FileSystem} = require("aws-cdk-lib/aws-efs");
const {BackupPlan, BackupPlanRule, BackupResource, BackupVault} = require("aws-cdk-lib/aws-backup");
const {LogGroup, RetentionDays} = require("aws-cdk-lib/aws-logs");
const {
    Policy,
    PolicyDocument,
    Role,
    ServicePrincipal,
    ManagedPolicy: {fromAwsManagedPolicyName},
    PolicyStatement,
    Effect
} = require("aws-cdk-lib/aws-iam");
const parameters = require("../meta/parameters.json");
const path = require("path");
const {DnsRecordType} = require("aws-cdk-lib/aws-servicediscovery");
const {StringParameter} = require("aws-cdk-lib/aws-ssm");
const tags = require("../meta/tags");
const {Secret} = require("aws-cdk-lib/aws-secretsmanager");
const {
    ApplicationProtocol,
    ApplicationProtocolVersion,
    ApplicationTargetGroup,
    Protocol
} = require("aws-cdk-lib/aws-elasticloadbalancingv2");
const {NodejsFunction} = require("aws-cdk-lib/aws-lambda-nodejs");
const {Architecture} = require("aws-cdk-lib/aws-lambda");
const {Rule, Schedule} = require("aws-cdk-lib/aws-events");
const {LambdaFunction} = require("aws-cdk-lib/aws-events-targets");
const {Asset} = require("aws-cdk-lib/aws-s3-assets")

class JenkinsStack extends Stack {
    constructor(scope, id, props) {
        super(scope, id, props)

        /* GITHUB BRANCH VARIABLES */
        const isFeatureBranch = props.env.isFeatureBranch;
        const featureSuffix = isFeatureBranch ? props.env.featureSuffix : "";
        const featurePrefix = isFeatureBranch ? `${featureSuffix.replace('-', "")}.` : "";
        const deployParameters = parameters.DeploymentType;
        const parameterType = isFeatureBranch ? "feature" : "main";

        /* AWS VPC */
        const vpcId = props.env.vpcId;
        const vpc = Vpc.fromLookup(this, "Vpc", {vpcId});

        /* ACM DNS CERTIFICATE */
        const domainRoot = deployParameters.main.Domain;
        const hostname = deployParameters.main.Hostname;
        const dnsHostname = `${featurePrefix}${hostname}`;
        const fqdn = `${dnsHostname}.${domainRoot}`;
        const hostedZoneId = deployParameters.main.HostedZoneId;
        const certificate = new DnsValidatedCertificate(this, `JenkinsCertificate${featureSuffix}`, {
            domainName: fqdn,
            hostedZone: {
                zoneName: domainRoot,
                hostedZoneId
            },
            validation: {
                method: ValidationMethod.DNS
            }
        });

        /* CLOUDWATCH LOG */
        const agentLogGroup = new LogGroup(this, `JenkinsAgentLogGroup${featureSuffix}`, {
            logGroupName: `/jenkins${featureSuffix}/`,
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.THREE_DAYS
        });

        /* ECS EC2 CLUSTER */
        const clusterName = `${props.env.serviceName}${featureSuffix}`;
        const {cpu, instanceType, memoryLimitMiB} = deployParameters[parameterType]["ECS"];
        const cluster = new Cluster(this, `JenkinsEcsCluster${featureSuffix}`, {
            clusterName,
            containerInsights: true,
            defaultCloudMapNamespace: {name: fqdn},
            vpc
        });

        /* SECRET(S) */
        const secretResources = [];
        parameters.Secrets.forEach((key) => {
            const resource = key.secretArn
            secretResources.push(resource)
        });
        const secrets = {};
        parameters.Secrets.forEach((key, index) => {
            const secret = Secret.fromSecretCompleteArn(this, `Secret[${index}]`, key.secretArn)
            secrets[key.environment] = fromSecretsManager(secret)
        });

        /* SESSION IAM ROLE */
        const sessionRole = new Role(this, `JenkinsSessionManagerRole${featureSuffix}`, {
            assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
            managedPolicies: [
                fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
                fromAwsManagedPolicyName("service-role/AmazonEC2ContainerServiceforEC2Role")
            ]
        });

        /* ECS TASK IAM ROLE */
        const ecsRole = new Role(this, `JenkinsEcsBackendTaskRole${featureSuffix}`, {
            roleName: `BackendECSTaskRole${featureSuffix}`,
            assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
            managedPolicies: [
                fromAwsManagedPolicyName(
                    "service-role/AmazonECSTaskExecutionRolePolicy"
                ),
                fromAwsManagedPolicyName(
                    "service-role/AmazonEC2ContainerServiceforEC2Role"
                )
            ]
        });
        ecsRole.attachInlinePolicy(new Policy(this, `JenkinsEcsInlinePolicy${featureSuffix}`, {
            policyName: `EcsGetSecretManagerSecretValueInlinePolicy${featureSuffix}`,
            document: new PolicyDocument({
                statements: [
                    new PolicyStatement({
                        actions: ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
                        effect: Effect.ALLOW,
                        resources: secretResources
                    })
                ]
            })
        }));

        /* LAMBDA ROLE */
        const jenkinsUpdateLambdaRole = new Role(this, "JenkinsUpdateLambdaRole", {
            assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
            description: "Allows a Lambda Function to access CloudWatch logs.",
            path: parameters.Security.ProtectedIamPath,
            inlinePolicies: [
                new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            actions: [
                                "logs:Create*",
                                "logs:Put*",
                                "xray:Put*",
                                "s3:ListAllMyBuckets",
                                "s3:GetObject",
                                "secretsmanager:GetSecretValue",
                                "secretsmanager:DescribeSecret"
                            ],
                            effect: Effect.ALLOW,
                            resources: "*"
                        })
                    ]
                })
            ]
        });

        /* SECURITY GROUP(S) */
        const efsSG = new SecurityGroup(this, `JenkinsEfsSecurityGroup${featureSuffix}`, {
            description: "Allows the Jenkins Controller Access to Elastic Filesystem.",
            vpc: vpc
        });
        efsSG.addIngressRule(
            Peer.ipv4(vpc.vpcCidrBlock),
            new Port({
                protocol: Protocol.TCP,
                fromPort: 2049,
                toPort: 2049
            }), `Allows ${vpc.vpcId} private subnets to access the EFS`
        );
        const jnlpSG = new SecurityGroup(this, `JenkinsJnlpSecurityGroup${featureSuffix}`, {
            description: "Allows the Jenkins JNLP agent(s) network access to the Jenkins host.",
            allowAllOutbound: false,
            vpc: vpc
        });

        const onPremiseAgent = deployParameters.main.Agents[0].IP;
        jnlpSG.addIngressRule(
            Peer.ipv4(onPremiseAgent),
            new Port({
                protocol: Protocol.TCP,
                fromPort: 50000,
                toPort: 50000
            }), "Allows Jenkins agents located at NY office network access."
        );

        /* EFS FILESYSTEM */
        let fileSystem = {};
        const {fileSystemId} = deployParameters[parameterType]["EFS"];

        if (isFeatureBranch) {
            fileSystem = new FileSystem(this, `JenkinsElasticFileSystem${featureSuffix}`, {
                fileSystemName: `efs-${clusterName}`,
                removalPolicy: RemovalPolicy.DESTROY,
                vpcSubnets: vpc.privateSubnets,
                vpc: vpc,
                securityGroup: efsSG
            });
        } else {
            fileSystem = FileSystem.fromFileSystemAttributes(this, "JenkinsElasticFileSystem", {
                fileSystemId: fileSystemId,
                securityGroup: efsSG
            });
            cluster.vpc.privateSubnets.forEach((subnet, index) => {
                new CfnMountTarget(this, `efsMount[${index}]${featureSuffix}`, {
                    fileSystemId: fileSystem.fileSystemId,
                    subnetId: subnet.subnetId,
                    securityGroups: [efsSG.securityGroupId]
                });
            });
        }

        const efsBackupPlan = new BackupPlan(this, `JenkinsEFSBackupPlan${featureSuffix}`, {
            backupPlanRules: [
                new BackupPlanRule({
                    backupVault: new BackupVault(this, `JenkinsBackupVault${featureSuffix}`, {
                        removalPolicy: isFeatureBranch ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN
                    }),
                    completionWindow: Duration.hours(2),
                    deleteAfter: Duration.days(7),
                    scheduleExpression: Schedule.cron({
                        hour: "3",
                        minute: "30",
                        weekDay: "MON-FRI"
                    }),
                    startWindow: Duration.hours(1)
                })
            ]
        });
        efsBackupPlan.addSelection(`JenkinsBackupResource${featureSuffix}`, {
            resources: [
                BackupResource.fromEfsFileSystem(fileSystem)
            ],
            allowRestores: true
        });

        const accessPoint = new AccessPoint(this, `efsAccessPoint${featureSuffix}`, {
            path: '/efs',
            fileSystem: fileSystem,
            posixUser: {
                gid: '1000',
                uid: '1000'
            },
            createAcl: {
                ownerGid: '1000',
                ownerUid: '1000',
                permissions: '0755'
            }
        });

        /* EC2 AUTOSCALING GROUP */
        const userData = UserData.forLinux();
        userData.addCommands(
            'sudo usermod --uid 1010 ec2-user && sudo groupmod --gid 1010 ec2-user',
            'sudo groupadd --gid 1000 --system jenkins',
            'sudo useradd -r -M -u 1000 -c "Jenkins Service Account" -s /sbin/nologin -g jenkins -G docker jenkins',
            'sudo mkdir -p /mnt/efs && sudo chown -R jenkins:jenkins /mnt/efs',
            `sudo mount -t efs -o tls,accesspoint=${accessPoint.accessPointId} ${fileSystem.fileSystemId}:/ /mnt/efs`
        );

        const jenkinsAsgCapacityProvider = new AsgCapacityProvider(this, `JenkinsAsgCapacityProvider${featureSuffix}`, {
            autoScalingGroup: new AutoScalingGroup(this, `JenkinsAutoScalingGroup${featureSuffix}`, {
                newInstancesProtectedFromScaleIn: !isFeatureBranch,
                instanceType: new InstanceType(instanceType),
                machineImage: amazonLinux2(AmiHardwareType.ARM),
                role: sessionRole,
                userData: userData,
                vpc: vpc,
            }),
            enableManagedTerminationProtection: false
        });
        cluster.addAsgCapacityProvider(jenkinsAsgCapacityProvider);

        /* ECS TASK DEFINITION(S) */
        const jenkinsTaskDefinition = new Ec2TaskDefinition(this, `JenkinsTaskDefinition${featureSuffix}`, {
            taskRole: ecsRole,
            instanceType: new InstanceType(instanceType),
            networkMode: NetworkMode.AWS_VPC,
            volumes: [{name: `efs_mount${featureSuffix}`, host: {sourcePath: "/mnt/efs"}}]
        });

        jenkinsTaskDefinition.addContainer(`JenkinsContainer${featureSuffix}`, {
            environment: {JENKINS_HOST: fqdn},
            healthCheck: {
                retries: 10,
                command: ["CMD-SHELL", "curl -f http://localhost:8080/login?from=%2F || exit 1"],
                interval: seconds(30),
                timeout: seconds(60)
            },
            image: fromAsset(path.resolve(__dirname, "../assets/jenkins")),
            logging: new AwsLogDriver({
                logGroup: agentLogGroup,
                streamPrefix: "/JenkinsContainer"
            }),
            memoryLimitMiB: memoryLimitMiB,
            portMappings: [{containerPort: 8080}, {containerPort: 50000}],
            secrets: secrets,
            user: "jenkins"
        }).addMountPoints({
            containerPath: "/var/jenkins_home",
            sourceVolume: `efs_mount${featureSuffix}`,
            readOnly: false
        });

        /* ECS ALB SERVICE(S) */
        const albEc2Service = new ApplicationLoadBalancedEc2Service(this, `JenkinsAlbEc2Service${featureSuffix}`, {
            certificate: certificate,
            // circuitBreaker: {rollback: !isFeatureBranch}, //May need to toggle for breaking changes.
            cloudMapOptions: {
                name: `cloudMap-${clusterName}`,
                dnsRecordType: DnsRecordType.SRV
            },
            cluster: cluster,
            cpu: cpu,
            desiredCount: 1,
            domainName: fqdn,
            domainZone: {
                zoneName: domainRoot,
                hostedZoneId: hostedZoneId
            },
            enableECSManagedTags: true,
            healthCheckGracePeriod: minutes(15),
            listenerPort: 443,
            maxHealthyPercent: 100,
            minHealthyPercent: 0,
            redirectHTTP: true,
            taskDefinition: jenkinsTaskDefinition
        });
        albEc2Service.targetGroup.configureHealthCheck({
            healthyHttpCodes: "200",
            interval: seconds(300),
            timeout: seconds(60),
            port: "8080",
            protocol: Protocol.HTTP,
            path: '/login?from=%2F'
        });

        /* TASK DEFINITION(S) */
        const jnlpContainerPort = jenkinsTaskDefinition.defaultContainer.portMappings[1].containerPort;
        const jnlpContainerTarget = jenkinsTaskDefinition.defaultContainer.containerName;
        const jnlpTargetProtocol = jenkinsTaskDefinition.defaultContainer.portMappings[1].protocol;
        albEc2Service.loadBalancer.addListener(`jnlpListener${featureSuffix}`, {
            defaultTargetGroups: [
                new ApplicationTargetGroup(this, `jnlpTargetGroup${featureSuffix}`, {
                    healthCheck: {
                        healthyHttpCodes: "200",
                        interval: seconds(300),
                        path: "/",
                        port: "50000",
                        protocol: Protocol.HTTP,
                        timeout: seconds(60)
                    },
                    port: 50000,
                    protocol: ApplicationProtocol.HTTP,
                    protocolVersion: ApplicationProtocolVersion.HTTP1,
                    stickinessCookieDuration: hours(3),
                    targets: [
                        albEc2Service.service.loadBalancerTarget({
                            containerPort: jnlpContainerPort,
                            containerName: jnlpContainerTarget,
                            protocol: jnlpTargetProtocol
                        })
                    ],
                    vpc
                })
            ],
            certificates: [certificate],
            open: false,
            port: jnlpContainerPort,
            protocol: Protocol.HTTPS
        });
        albEc2Service.loadBalancer.addSecurityGroup(jnlpSG);

        /* S3 ASSETS */
        const dockerFile = new Asset(this, 'DockerfileAsset', {
            path: "./assets/jenkins/Dockerfile"
        });
        const dockerPlugins = new Asset(this, 'DockerPluginsAsset', {
            path: "./assets/jenkins/plugins.txt"
        });

        /* LAMBDAS */
        const jenkinsUpdateLambda = new NodejsFunction(this, "JenkinsUpdateLambda", {
            awsSdkConnectionReuse: true,
            architecture: Architecture.ARM_64,
            description: "Updates the Jenkins host and its plug-ins to latest version.",
            entry: path.join(__dirname, "../assets/jenkins-updater/bin/index.js"),
            environment: {
                DOCKERFILE_BUCKET: dockerFile.s3BucketName,
                DOCKERFILE_KEY: dockerFile.s3ObjectKey,
                PLUGINS_BUCKET: dockerPlugins.s3BucketName,
                PLUGINS_KEY: dockerPlugins.s3ObjectKey
            },
            logRetention: Duration.days(15),
            memorySize: 2048,
            role: jenkinsUpdateLambdaRole,
            timeout: Duration.seconds(30)
        });

        /* EVENT RULE(S) */
        const jenkinsUpdateCronEvent = new Rule(this, "JenkinsUpdateCronEvent", {
            enabled: true,
            schedule: Schedule.cron({weekDay: "monday", hour: "14", minute: "0"}),
            targets: [new LambdaFunction(jenkinsUpdateLambda)]
        });

        /* CLOUDFORMATION EXPORTS */
        new CfnOutput(this, `LoadBalancerDnsName${featureSuffix}`, {
            description: "The application load balancer DNS A record for the Jenkins host.",
            exportName: `LoadBalancerDnsName`,
            value: albEc2Service.loadBalancer.loadBalancerDnsName
        });
        new CfnOutput(this, `Route53FQDN${featureSuffix}`, {
            description: "The Route 53 alias record for the Jenkins host.",
            exportName: `Route53FQDN${featureSuffix}`,
            value: fqdn
        });
        new CfnOutput(this, "S3BucketName", {
            value: dockerFile.s3BucketName
        });
        new CfnOutput(this, "JenkinsDockerfile", {
            value: dockerFile.s3ObjectUrl
        });
        new CfnOutput(this, "JenkinsDockerPlugins", {
            value: dockerPlugins.s3ObjectUrl
        });
        new StringParameter(this, `JenkinsWebsite${featureSuffix}`, {
            parameterName: `JenkinsWebsite`,
            stringValue: fqdn
        });

        /* TAGS */
        tags.forEach(tag => {
            Tags.of(this).add(tag.key, tag.value)
        });
    }
}

exports.JenkinsStack = JenkinsStack;