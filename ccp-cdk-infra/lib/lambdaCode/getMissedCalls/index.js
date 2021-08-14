// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const aws = require("aws-sdk");
const connect = new aws.Connect();

const connectID = process.env.CONNECT_ID;

const getMetricData = async (queueIDs) => {
  console.log("getMetricData: ");
  const coeff = 1000 * 60 * 5;

  const today = new Date();
  console.log("today", today.toISOString());

  const roundedToday = new Date(Math.round(today.getTime() / coeff) * coeff);
  console.log("todayRound", roundedToday.toISOString());

  const yesterday = new Date(roundedToday - 85800000);
  console.log("yesterday", yesterday.toISOString());

  const params = {
    InstanceId: connectID,
    StartTime: yesterday.toISOString(),
    EndTime: roundedToday.toISOString(),
    Filters: {
      Queues: queueIDs,
      Channels: ["VOICE"],
    },
    Groupings: ["QUEUE", "CHANNEL"],
    HistoricalMetrics: [
      {
        Name: "CONTACTS_ABANDONED",
        Unit: "COUNT",
        Statistic: "SUM",
      },
    ],
  };

  const result = await connect.getMetricData(params).promise();
  console.log(result);

  let body;

  if (result.MetricResults.length == 0) {
    body = 0;
  } else {
    body = result.MetricResults[0].Collections[0].Value;
    console.log("MetricResults: ", result.MetricResults);
    console.log("MetricResults 1: ", result.MetricResults[0]);
    console.log("MetricResults 1 Collections 1: ", result.MetricResults[0].Collections[0]);
  }

  console.log("body: ", body);

  return body;
};

exports.handler = async (event) => {
  const queueId = event.queryStringParameters.queueId;
  console.log("event : ", queueId);

  try {
    const body = await getMetricData([queueId]);

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
