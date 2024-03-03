# | meta 
The majority of all resource parameters and metadata for the Jenkins configuration-as-code environment.

## ↳ parameters.json
There are some values you may not wish to use and if so may require you to reflect on the resources in `lib/jenkinsStack.js`
and/or the `assets/` that help power this project.

###  AccountId *(required)*
Specify the account identifier that you wish this AWS-CDK stack to deploy
```json
  "AccountId": "000012340001"
```

### VpcId *(required)*
Specify the virtual private cloud identifier from where the EC2 resources should deploy
```json
  "VpcId": "vpc-012ab34567c8de"
```

### DeploymentType *(required)*
This object has two resource parameter types based on development (`feature`) or production (`main`).
````json
  "DeploymentType": {
    "main": {...},
    "feature": {...}
  }
````

*(Optional)* `Agents` is an array of on-premise workstation parameters. This example is a node that is at the 
provided public IP address, City and State. 

* (Note) This an extremely unique use-case and chances are may not be required.
If this feature is not necessary, I would recommend commenting out the code in `lib/JenkinsStack.js`.
```json
    "Agents": [
      {
        "IP": "1.16.32.64/32",
        "Location": {
           "City": "New_York",
           "State": "NY"
         },
        "Name": "Mac_Agent_01"
      }
    ]
```

*(Required)* `Domain` is a string value of the root domain hosted in AWS Route53
```json
  "Domain": "company.com"
```

*(Required)* `ECS` is an object that outlines the necessary elastic container service parameters. I recommend keeping these settings as they are. I've had problems where anything lower causes `cdk deploy` to hang.
```json
  "ECS": {
    "cpu": 2048,
    "instanceType": "r6g.large",
    "memoryLimitMiB": 8192
  }
```

*(Required|Optional)* `EFS` is an object for the elastic file system identifier. It is best the filesystem is created manually prior to deployment for your main branch.
This way you are confident you know your data is going into the correct static EFS volume. Otherwise, this is an optional
parameter for feature/beta branches as the EFS volume gets created with a `DESTROY` removal policy. 
```json
  "EFS": {
          "fileSystemId": "fs-0123ab1a2"
  }
```

*(Required)* `Hostname` is the name of the host you will be accessing via browser. 
For example, if `jenkins` is the host name then you will access the webserver at `
https://jenkins.company.com`.
```json
  "Hostname": "jenkins"
```

*(Required)* `HostZoneId` represents the host zone of where your root domain resides.
```json
  "HostedZoneId": "Z012345000A123BC01D0"
```

### `Regions` *(Required)*
An array of regions where you want this stack deployed.
```json
  "Region": ["eu-central-2"]
```

### Secrets *(Required)*
An array of secrets that get injected into the Jenkins container as environment variables
that Jenkins then uses as credentials for various API integration. 

See `asset/jenkins/*.yaml` for configuration inputs that may need to be curated or changed based on your own use cases.
```json
  "Secrets": [
    {
      "environment": "GITHUB_APPLICATION_IDENTIFIER",
      "secretArn": "arn:aws:secretsmanager:<region>:<account-id>:secret:GitHubApplicationIdentifier-KDsUqe"
    }, 
     ...
  ]
```
### Security *(Required)* 
Specifies the IAM role path for your IAM role(s). Leave blank if you don't need.
```json
  "Security": {
    "ProtectedIamPath": ""
  }
```

##  ↳ tags.json
A simple array of key/value tags that can be added to your CloudFormation Stack resources for better accountability.
```json
  {
    "key": "app",
    "value": "jenkins"
  },
  {
    "key": "aws-cdk",
    "value": "true"
  },
  {
    "key": "env",
    "value": "prod"
  },
  {
    "key": "owner",
    "value": "devops@company.com"
  },
  {
    "key": "version",
    "value": "1.0.0"
  }
```