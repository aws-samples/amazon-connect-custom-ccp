// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
const tableCallIntents = process.env.CALL_INTENTS_TABLE;

exports.handler = async (event, context) => {
  let body;
  let statusCode = 200;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };
  console.log("handler event", event);
  console.log("Route path: ",event.path);
  const queueName = event.pathParameters.proxy;
  console.log("Queue Name: ", queueName);
  try {
    console.log("trying");
    if(event.httpMethod == "GET" && event.resource == "/getCallIntents/{proxy+}"){
      body = await ddb
        .get({
          TableName: tableCallIntents,
          Key: {
            queueName: queueName
          }
        })
        .promise();
      console.log("body:", body)
    } else {
      throw new Error(`Unsupported route: "${event.httpMethod} ${event.resource}"`);
    }
  } catch (err) {
    statusCode = 400;
    body = err.message;
  } finally {
    const resp = body.Item.intents.map((i) => {
      return { title: i }
    });
    body = JSON.stringify(resp);
  }

  console.log("Body: ", body);

  return {
    statusCode,
    body,
    headers
  };
};
