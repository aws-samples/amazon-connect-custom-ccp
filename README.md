## Amazon Connect Custom CCP


## Introduction

`amazon-connect-custom-ccp` provides a way to build a custom ccp dashboard for your Amazon Connect contact center. These instructions focus on how to use the software to create a ccp dashboard. This dashboard will display: 

- A banner to indicate if a call is priority. This is set by a field in the API response when an agent connects to a call.
- A section with the queue name, broker code and account name. This can be changed to suit the needs of your project
- A section that will contain a drop down to list the possible intents for a call based on a queue
- Start/Stop/Pause/Resume functionality. (Using this functionality will add fields with timestamps for these actions on the contact trace record on Amazon connect)
- A button that will open a stats modal. 
- Stats modal displays daily call intent selections for the agent and daily queue stats (active agents, number of missed calls, number of customers in queue, longest wait time and average time in queue)
- Cold transfer functionality (transfer to queue, quick connect or external number)
- Update intent and secondary intent modal. At the end of a call, when an agent selects an intent and a secondary intent. This information is added to the agent table in Dynamo DB and is updated on the contact trace record on Amazon Connect.

First, you will need an Amazon Connect instance up and running. Next, you will need to deploy the CDK which will build the Lambda functions, DynamoDB table, API Gateway, S3 bucket, Cloudfront distribution and SQS queue components for you.

The DynamoDB table holds data that will be displayed on the dashboard such as, a list of possible call intents, and intents selected by the agent during the call). You can also collect historical and real-time data from multiple Connect instances. If you wish to collect agent events from multiple Connect instances you will need to configure Kinesis to deliver the events to Lambda manually (which will be processed by the agent event handler). 
The S3 bucket contains the React build and will be served from CloudFront.

## Architecture
<img width="681" alt="Screen Shot 2021-10-30 at 6 00 28 PM" src="https://user-images.githubusercontent.com/7748458/139562557-443a6c64-ff8d-42e0-8b8e-a79fb5f186c7.png">


## AWS CDK stack to deploy Amazon connect CCP

 Run `npm install` before running the commands below

| Command             | Description                                          |
| :------------------ | ---------------------------------------------------- |
| `npm run bootstrap` | Bootstrap CDK                                        |
| `npm run deploy`    | Deploy this stack to your default AWS account/region |
| `npm run diff`      | Compare deployed stack with current state            |
| `npm run synth`     | Emits the synthesized CloudFormation template        |

## Building
Before building the project, you need to set the AWS_REGION and AWS_PROFILE environment variables.

```
# set the aws region and the aws profile (profile is set in ~/.aws/credentials)
export AWS_REGION=<AWS REGION>
export AWS_PROFILE=<YOUR IAM USER PROFILE NAME>
```

### Deployment

- Update queue names and intents in: `ccp-cdk-infra/lib/lambdaCode/populateDB`

- Change the "company" value in the `project-config.json`

- Add the Amazon connect instance ID as an SSM param in the correct region before running `npm run deploy`. This can be found on the edit queue page of the Amazon connect instance's dashboard, under additional queue information. The Amazon connect instance ID is a part of the ARN: arn:aws:connect:us-east-1:571591394325:instance/<instance_id>/queue/<queue_id>

```
$ cd ccp-cdk-infra
$ npm run bootstrap
$ npm run deploy
```



### Local Development

To run the ccp locally first make these config changes
- Update default values for CONNECT_NAME, API_GATEWAY_ID and CF_DISTRIBUTION_URL in `ccp-ui/src/config.js`

```
$ cd ccp-ui
$ npm install
$ npm run build
$ npm start
```

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

