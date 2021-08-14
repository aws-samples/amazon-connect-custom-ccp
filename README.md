## Amazon Connect Custom CCP

# AWS CDK stack to deploy Amazon connect CCP
## Useful commands

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

