#! /bin/bash

set -e
set -u
set -o pipefail



# Running CDK Project

# Starting point is the root directory. Need to chdir
cd ${CODEBUILD_SRC_DIR}/ccp-cdk-infra

# Install CDK
echo "===> Installing AWS CDK..."
npm install -g aws-cdk

# Install Dependencies
echo "===> Building CDK project..."
npm install
npm run build

# Bootstraping
echo "===> Bootstraping account '${CROSS_ACCOUNT_ID}' and region '${TARGET_REGION}'"
cdk bootstrap aws://${CROSS_ACCOUNT_ID}/${TARGET_REGION}

# Deploy
echo "===> Deploying CDK project..."
cdk deploy --require-approval never

# Populate intent DB
echo "===> Populating intent DB..."
node ./lib/lambdaCode/populateDB

# Config
# get Amazon Connect name
CONNECT_NAME=`aws ssm get-parameters --with-decryption --names "/custom-ccp/phone-channel/ccp/connect/connect-name"  --query 'Parameters[*].Value' --output text`
# get API Gateway ID
API_GATEWAY_ID=`aws ssm get-parameters --with-decryption --names "/custom-ccp/phone-channel/ccp/apigateway/ccp-apigateway-id"  --query 'Parameters[*].Value' --output text`
# get cloud front distribution url
CF_DISTRIBUTION_URL=`aws ssm get-parameters --with-decryption --names "/custom-ccp/phone-channel/ccp/cloudfront/ccp-url"  --query 'Parameters[*].Value' --output text`

echo "===>Original Config:"
head -n 8 ${CODEBUILD_SRC_DIR}/ccp-ui/src/config.js

echo "===> Updating UI Project Config:"
# replace Connect Name in config.js
echo "===> Connect Name: ${CONNECT_NAME}"
sed -i "s|<CONNECT_NAME>|$CONNECT_NAME|g" ${CODEBUILD_SRC_DIR}/ccp-ui/src/config.js
# replace API Gateway ID in config.js
echo "===> API Gateway ID: ${API_GATEWAY_ID}"
sed -i "s|<API_GATEWAY_ID>|$API_GATEWAY_ID|g" ${CODEBUILD_SRC_DIR}/ccp-ui/src/config.js
# replace Cloud Front Distribution URL in config.js
echo "===> Cloud Front Distribution URL: ${CF_DISTRIBUTION_URL}"
sed -i "s|<CF_DISTRIBUTION_URL>|$CF_DISTRIBUTION_URL|g" ${CODEBUILD_SRC_DIR}/ccp-ui/src/config.js
echo "===>Updated Config:"
head -n 8 ${CODEBUILD_SRC_DIR}/ccp-ui/src/config.js

# Build the ui project
echo "===> Switching directroy to ${CODEBUILD_SRC_DIR}/ccp-ui"
cd ${CODEBUILD_SRC_DIR}/ccp-ui

echo "===> Installing UI App dependencies..."
npm install

echo "===> Building UI App..."
npm run build

echo "===> Building UI Project is done."

# get the deployment bucket name
CCP_DEPLOYMENT_BUCKET=`aws ssm get-parameters --with-decryption --names "/custom-ccp/phone-channel/ccp/bucket/ccpDeploymentBucketName"  --query 'Parameters[*].Value' --output text`

echo "===> Copying build archifacts to S3 bucket: ${CCP_DEPLOYMENT_BUCKET}..."
aws s3 sync ./build s3://${CCP_DEPLOYMENT_BUCKET}/build

# get cloud front distribution id
CCP_DISTRIBUTION_ID=`aws ssm get-parameters --with-decryption --names "/custom-ccp/phone-channel/ccp/cloudfront/ccp-distributioin-id"  --query 'Parameters[*].Value' --output text`
echo "===> Invalidating cloud formation distribution: ${CCP_DISTRIBUTION_ID}"
aws cloudfront create-invalidation \
    --distribution-id ${CCP_DISTRIBUTION_ID} \
    --paths "/*"

echo "===> Deployment is done."

