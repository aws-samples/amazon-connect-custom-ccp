// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

const yyyymmdd = (date) => {
  var mm = date.getMonth() + 1; // getMonth() is zero-based
  var dd = date.getDate();

  return [(dd > 9 ? "" : "0") + dd, (mm > 9 ? "" : "0") + mm, date.getFullYear()].join("/");
};

const tableName = process.env.AGENT_INFO_TABLE;

const updateEntry = async (agentName, date, itemsData) => {
  const params = {
    TableName: tableName,
    Key: {
      agentName: agentName,
      date: date,
    },
    // UpdateExpression: `set intents.${intent} = :new`,
    UpdateExpression: `set itemData = :new`,
    ExpressionAttributeValues: {
      ":new": itemsData,
    },
    ReturnValues: "UPDATED_NEW",
  };

  console.log("Updating the ite...");
  const updateResponse = await ddb.update(params).promise();
  console.log("UpdateItem succeeded:", JSON.stringify(updateResponse, null, 2));
  return "Success";
};

const createEntry = async (agentName, date, connectID) => {
  var params = {
    TableName: tableName,
    Item: {
      agentName: agentName,
      date: date,
      itemData: connectID ? [{ connectID }] : [],
    },
  };

  const updateResponse = await ddb.put(params).promise();
  console.log("UpdateItem succeeded:", JSON.stringify(updateResponse, null, 2));
};

const getEntry = async (agentName, date) => {
  const params = {
    TableName: tableName,
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

  return entry.Items[0];
};

exports.handler = async (event) => {
  const date = yyyymmdd(new Date());
  console.log("date", date);

  const agentName = event.queryStringParameters.agentName;
  console.log("agentName", agentName);

  const connectID = event.queryStringParameters.connectID;
  console.log("connectID", connectID);

  try {
    console.log("getEntry");
    const cur = await getEntry(agentName, date);
    console.log("cur", cur);
    if (typeof cur === "undefined") {
      console.log("creating new...");
      await createEntry(agentName, date, connectID);
    } else {
      const obj = cur.itemData;
      obj.push({ connectID });
      await updateEntry(agentName, date, obj);

      console.log("cur", cur);
    }
    const response = {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: "true" }),
    };
    return response;
  } catch (error) {
    console.log("error", error);
    const response = {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: error,
    };
    return response;
  }
};