// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const apigateway = require("@aws-cdk/aws-apigateway");
const iam = require("@aws-cdk/aws-iam");
const lambda = require("@aws-cdk/aws-lambda");
const dynamodb = require("@aws-cdk/aws-dynamodb");
const cdk = require("@aws-cdk/core");
const cloudfront = require("@aws-cdk/aws-cloudfront");
const s3 = require("@aws-cdk/aws-s3");
const sqs = require("@aws-cdk/aws-sqs");
const ssm = require("@aws-cdk/aws-ssm");
const eventSources = require("@aws-cdk/aws-lambda-event-sources");
const path = require("path");
const { readdirSync } = require("fs");

const getDirectories = (source) =>
  readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

const stringInArray = (str, arr) => arr.indexOf(str) >= 0;
const lambdaNameMatches = stringInArray;

const dependsOnCallIntentsTable = ["populateDB", "getCallIntents", "updateIntentTable"];

const dependsOnAgentInfoTable = ["newConnectId", "updateIntentTable", "getIntentMetrics"];

const dependsOnConnectPolicy = [
  "getLongestWaitTime",
  "getActiveAgents",
  "getAvrAbandTime",
  "getAvrQueueTime",
  "getCustomersInQueue",
  "getMissedCalls",
  "updateContactTraceRecord",
  "updateRecordingStatus",
];

class ccpStack extends cdk.Stack {
  /*
   * @param {cdk.App} scope
   * @param {string} id
   * @param {cdk.StackProps} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);
    const { prefix, ssmRoot, stage} = props;
    console.log("Prefix: ", prefix);
    console.log("SSMRoot: ", ssmRoot);
    console.log("Stage: ", stage);

    // read the connect id from ssm
    const connectID = ssm.StringParameter.valueForStringParameter(this,`${ssmRoot}/connect/connect-id`);
    new cdk.CfnOutput(this, "ccpConnectIdCfnOutput", { value: connectID});

    const AgentInfo_Table = new dynamodb.Table(this, "AgentInfo", {
      tableName: "AgentInfo",
      partitionKey: { name: "agentName", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "date", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const CallIntents_Table = new dynamodb.Table(this, "CallIntents", {
      tableName: "CallIntents",
      partitionKey: { name: "queueName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new ssm.StringParameter(this, 'ccpCallIntentsTableNameParam', {
      description: 'Name of the call intents table',
      parameterName: `${props.ssmRoot}/dynamodb/ccpCallIntentsTableName`,
      stringValue: CallIntents_Table.tableName,
    });

    const ConnectPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: ["connect:*"],
    });

    // Create a deployment bucket
    const ccpDeploymentBucket = new s3.Bucket(this, 'ccpDeploymentBucket', {
      bucketName: `${prefix}-custom-cpp-${stage}`,
      versioned: false,
      websiteIndexDocument: 'index.html',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    new ssm.StringParameter(this, 'ccpDeploymentBucketNameParam', {
      description: 'Name of the custom ccp deployment Bucket',
      parameterName: `${props.ssmRoot}/bucket/ccpDeploymentBucketName`,
      stringValue: ccpDeploymentBucket.bucketName
    });
    new cdk.CfnOutput(this, "ccpDeploymentBucketNameCfnOutput", { value: ccpDeploymentBucket.bucketName});

    // create an origin access identity for the archifacts bucket
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, "ccpDeploymentBucketOAI", {
      comment: "CICD-CCP-DeploymentBucket-OAI"
    });
    ccpDeploymentBucket.grantRead(originAccessIdentity);

    new ssm.StringParameter(this, 'ccpDeploymentBucketOaiNameParam', {
      description: 'Name of the custom ccp deployment Bucket Origin Access Identity',
      parameterName: `${props.ssmRoot}/cloudfront/ccpDeploymentBucketOaiName`,
      stringValue: originAccessIdentity.originAccessIdentityName
    });
    new cdk.CfnOutput(this, "ccpDeploymentBucketOaiNameCfnOutput", { value: originAccessIdentity.originAccessIdentityName});

    // DistributionForCCPBucket
    const ccpDistribution = new cloudfront.CloudFrontWebDistribution(this, "DistributionForCCPPage", {
      originConfigs: [
        {
          s3OriginSource: {
            id: `${prefix}-build`,
            s3BucketSource: ccpDeploymentBucket,
            originAccessIdentity: originAccessIdentity,
            originPath: "/build" },
          behaviors: [
            { isDefaultBehavior: true }
          ],
        }
      ],
      comment: "CICD - custom CCP"
    });
    new cdk.CfnOutput(this, "cloudFrontUrl", { value: `https://${ccpDistribution.distributionDomainName}`});
    new cdk.CfnOutput(this, "cloudFrontDistributionId", { value: ccpDistribution.distributionId});
    //set a parameter for the cloudfron url
    new ssm.StringParameter(this, 'CustomCCPCloudFrontURL', {
      description: 'Custom CCP CloudFront url',
      parameterName: `${ssmRoot}/cloudfront/ccp-url`,
      stringValue: `https://${ccpDistribution.distributionDomainName}`
    });
    //set a parameter for the cloudfron destribution id
    new ssm.StringParameter(this, 'CustomCCPCloudFrontDistributionId', {
      description: 'Custom CCP CloudFront  Distribution ID',
      parameterName: `${ssmRoot}/cloudfront/ccp-distributioin-id`,
      stringValue: ccpDistribution.distributionId
    });
    // set an environment variable for the cloudfron destribution id
    process.env['CCP_DISTRIBUTION_ID'] = ccpDistribution.distributionId;

    const lambdaDirectory = "lib/lambdaCode/";

    const allLambdas = getDirectories(lambdaDirectory);
    const allLambdasObj = {};

    const CTRUpdateQueue = new sqs.Queue(this, "CTRUpdateQueue", {
      queueName: "CTRUpdateQueue",
      visibilityTimeout: cdk.Duration.seconds(900),
    });

    allLambdas.forEach((lambdaFunction) => {
      allLambdasObj[lambdaFunction] = new lambda.Function(this, lambdaFunction, {
        runtime: lambda.Runtime.NODEJS_14_X,
        functionName: lambdaFunction,
        handler: "index.handler",
        code: new lambda.AssetCode(path.join(lambdaDirectory, lambdaFunction)),
        environment: {
          AGENT_INFO_TABLE: AgentInfo_Table.tableName,
          CALL_INTENTS_TABLE: CallIntents_Table.tableName,
          CONNECT_ID: connectID,
          CTR_QUEUE_URL: CTRUpdateQueue.queueUrl,
        },
      });

      if (lambdaNameMatches(lambdaFunction, dependsOnCallIntentsTable))
        CallIntents_Table.grantFullAccess(allLambdasObj[lambdaFunction]);

      if (lambdaNameMatches(lambdaFunction, dependsOnAgentInfoTable))
        AgentInfo_Table.grantReadWriteData(allLambdasObj[lambdaFunction]);

      if (lambdaNameMatches(lambdaFunction, dependsOnConnectPolicy))
        allLambdasObj[lambdaFunction].role.addToPolicy(ConnectPolicy);
    });

    allLambdasObj["updateContactTraceRecord"].addEventSource(new eventSources.SqsEventSource(CTRUpdateQueue, { batchSize: 1 }));

    CTRUpdateQueue.grantConsumeMessages(allLambdasObj["updateContactTraceRecord"]);
    CTRUpdateQueue.grantSendMessages(allLambdasObj["updateIntentTable"]);
    CTRUpdateQueue.grantSendMessages(allLambdasObj["updateRecordingStatus"]);

    const allresources = [
      { Type: "GET", Name: "avalAgents", Lambda: "getActiveAgents" },
      { Type: "GET", Name: "avgMissedWaitTime", Lambda: "getAvrAbandTime" },
      { Type: "GET", Name: "avgQueueTime", Lambda: "getCustomersInQueue" },
      { Type: "GET", Name: "getIntentsForAgent", Lambda: "getIntentMetrics" },
      { Type: "GET", Name: "getLongestWaitTime", Lambda: "getLongestWaitTime" },
      { Type: "GET", Name: "inQueue", Lambda: "getCustomersInQueue" },
      { Type: "GET", Name: "getCallIntents", Lambda: "getCallIntents" },
      { Type: "GET", Name: "missedCalls", Lambda: "getMissedCalls" },
      { Type: "POST", Name: "postNewCallIntent", Lambda: "updateIntentTable" },
      { Type: "POST", Name: "postNewContactId", Lambda: "newConnectId" },
      { Type: "POST", Name: "updateRecordingStatus", Lambda: "updateRecordingStatus" },
    ];

    const api = new apigateway.RestApi(this, "connectDashboardMetrics");

    allresources.forEach(({ Name, Lambda, Type }) => {
      const resource = api.root.addResource(Name);
      const integration = new apigateway.LambdaIntegration(allLambdasObj[Lambda]);
      if(Name === "getCallIntents") {
        const proxy = resource.addProxy({
          anyMethod: false,
        });
        proxy.addMethod(Type, integration);
      } else {
        resource.addMethod(Type, integration);
      }
    });

    new cdk.CfnOutput(this, "apiGatewayID", { value: api.restApiId });
    //set a parameter for the api gateway id
    new ssm.StringParameter(this, 'CustomCCPApiGatewayId', {
      description: 'Custom CCP API Gateway ID',
      parameterName: `${ssmRoot}/apigateway/ccp-apigateway-id`,
      stringValue: api.restApiId
    });
  }
}

module.exports = { ccpStack };
