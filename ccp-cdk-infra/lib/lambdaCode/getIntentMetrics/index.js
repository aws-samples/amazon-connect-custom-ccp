// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

const tableNameAgentInfo = process.env.AGENT_INFO_TABLE;

const yyyymmdd = (date) => {
  var mm = date.getMonth() + 1;
  var dd = date.getDate();

  return [(dd > 9 ? "" : "0") + dd, (mm > 9 ? "" : "0") + mm, date.getFullYear()].join("/");
};

const createEntry = async (agentName, date) => {
  var params = {
    TableName: tableNameAgentInfo,
    Item: {
      agentName: agentName,
      date: date,
      itemData: [],
    },
  };

  const updateResponse = await ddb.put(params).promise();
  console.log("UpdateItem succeeded:", JSON.stringify(updateResponse, null, 2));
};

const getEntry = async (agentName, date) => {
  const params = {
    TableName: tableNameAgentInfo,
    // ProjectionExpression: `data, agentName`,
    KeyConditionExpression: "#agentName = :agentName and #date = :date",
    ExpressionAttributeNames: {
      "#agentName": "agentName",
      "#date": "date",
    },
    ExpressionAttributeValues: {
      ":agentName": agentName,
      ":date": date,
    },
  };

  const entry = await ddb.query(params).promise();
  console.log("entry", JSON.stringify(entry));
  const result = entry.Items.length == 0 ? undefined : entry.Items[0].itemData;
  console.log("result ENTRY", result);
  return result;
};

exports.handler = async (event) => {
  const date = yyyymmdd(new Date());
  console.log("date", date);
  const agentName = event.queryStringParameters.agentName;
  console.log("agentName", agentName);

  try {
    const result = await getEntry(agentName, date);
    console.log("result", result);

    if (typeof result === "undefined") {
      console.log("creating new...");
      await createEntry(agentName, date);
    }

    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(result) || "{}",
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
