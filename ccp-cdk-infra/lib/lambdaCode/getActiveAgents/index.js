// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const aws = require("aws-sdk");
const connect = new aws.Connect();

const connectID = process.env.CONNECT_ID;

const getMetricData = async (queueIDs) => {
  console.log("getMetricData: ");
  const params = {
    CurrentMetrics: [
      {
        Name: "AGENTS_ONLINE",
        Unit: "COUNT",
      },
    ],
    Filters: {
      Channels: ["VOICE"],
      Queues: queueIDs,
    },
    InstanceId: connectID,
  };

  const result = await connect.getCurrentMetricData(params).promise();
  console.log(result);
  const body = result.MetricResults[0].Collections[0].Value;
  console.log("getMetricData body: ", body);
  console.log("MetricResults: ", result.MetricResults);
  console.log("MetricResults 1: ", result.MetricResults[0]);
  console.log("MetricResults 1 Collections: ", result.MetricResults[0].Collections);

  return body;
};

exports.handler = async (event) => {
  const queueId = event.queryStringParameters.queueId;
  console.log("event : ", queueId);

  try {
    const body = await getMetricData([queueId]);

    console.log(body);
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
