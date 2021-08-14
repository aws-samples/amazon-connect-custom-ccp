// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const aws = require("aws-sdk");
const connect = new aws.Connect();

const connectID = process.env.CONNECT_ID;

exports.handler = async (event) => {
  const queueId = event.queryStringParameters.queueId;
  console.log("event : ", queueId);
  const params = {
    CurrentMetrics: [
      {
        Name: "OLDEST_CONTACT_AGE",
        Unit: "SECONDS",
      },
    ],
    Filters: {
      Channels: ["VOICE"],
      Queues: [queueId],
    },
    InstanceId: connectID,
  };

  try {
    const result = await connect.getCurrentMetricData(params).promise();
    const body = (result.MetricResults[0].Collections[0].Value / 1200).toFixed(0);
    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body,
    };
    return response;
  } catch (error) {
    const response = {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(error),
    };
    return response;
  }
};
