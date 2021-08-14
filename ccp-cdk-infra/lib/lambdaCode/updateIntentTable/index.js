// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });

const tableCallIntents = process.env.CALL_INTENTS_TABLE;
const tableNameAgentInfo = process.env.AGENT_INFO_TABLE;
const ctrQueueUrl = process.env.CTR_QUEUE_URL;

const yyyymmdd = (date) => {
  const mm = date.getMonth() + 1; // getMonth() is zero-based
  const dd = date.getDate();

  return [(dd > 9 ? "" : "0") + dd, (mm > 9 ? "" : "0") + mm, date.getFullYear()].join("/");
};

const getEntry = async (agentName, date) => {
  const params = {
    TableName: tableNameAgentInfo,
    // ProjectionExpression: `data, agentName`,
    KeyConditionExpression: "#agentName = :agentName and #date = :date",
    ExpressionAttributeNames: { "#agentName": "agentName", "#date": "date" },
    ExpressionAttributeValues: { ":agentName": agentName, ":date": date },
  };

  const entry = await ddb.query(params).promise();
  console.log("getEntry", JSON.stringify(entry));

  return entry.Items[0].itemData;
};

const updateEntry = async (agentName, date, itemsData) => {
  const params = {
    TableName: tableNameAgentInfo,
    Key: { agentName, date },
    // UpdateExpression: `set intents.${intent} = :new`,
    UpdateExpression: `set itemData = :new`,
    ExpressionAttributeValues: { ":new": itemsData },
    ReturnValues: "UPDATED_NEW",
  };

  console.log("Updating the item...");
  const updateResponse = await ddb.update(params).promise();
  console.log("UpdateItem succeeded:", JSON.stringify(updateResponse, null, 2));
  return "Success";
};

const getIntents = async (queueName, intent) => {
  const params = {
    TableName: tableCallIntents,
    Key: {
      queueName: queueName
    }
  };

  const entry = await ddb.get(params).promise();
  const decodedIntent = intent.replace(/\+/g, " ");
  console.log("intent", intent);
  console.log("decodedIntent", decodedIntent);
  console.log("entry", entry);
  console.log("intents", entry.Item.intents);
  const result = entry.Item.intents.some((i) => i === decodedIntent);
  console.log(result);
  return result;
};

const addToQueue = async (message, queueURL) => {
  const params = {
    MessageBody: JSON.stringify(message),
    QueueUrl: queueURL,
  };
  console.log(`Sending SQS Message to : ${queueURL}.`);
  try {
    await sqs.sendMessage(params).promise();
    console.log(`Sending SQS Message to : ${queueURL}. Succeeded`);
  }catch (err) {
    console.error(`Sending message failed: ${err}.`);
  }
};

exports.handler = async (event) => {
  console.log("event", event);
  const { body = {} } = event;
  const date = yyyymmdd(new Date());
  console.log("date", date);

  const details = JSON.parse(body);
  console.log("details", details);

  const {
    agentName,
    connectID,
    intent: qsIntent,
    queueName: queueName,
    additionalTags,
  } = details;
  console.log("agentName", agentName);
  console.log("connectID", connectID);
  console.log("queueName", queueName);
  console.log("additionalTags", additionalTags);

  const intent = qsIntent && qsIntent.trim() !== "" ? qsIntent.replace(/\+/g, " ") : "Other";
  console.log("intent", intent);

  try {
    const IntentExists = await getIntents(queueName, intent);
    if (!IntentExists) {
      console.log("Intent Does Not Exist", intent);
      throw new Error(`Unsupported intent: "${intent} for queue ${queueName}"`);
    }

    const intentValue = await getEntry(agentName, date);
    console.log("intentValue", intentValue);
    const index = intentValue.findIndex((intent) => intent.connectID === connectID);
    console.log("index: ", index);
    const object = intentValue[index];
    console.log("object: ", object);

    object.intent = intent;
    additionalTags.map(({ name, value }) =>  {
      object[name] = value
    });
    object.tagsAdded = "complete";

    intentValue[index] = object;

    console.log("intentValue2", intentValue);
    await updateEntry(agentName, date, intentValue);

    const message = {
      contactId: connectID,
      Attributes: {
        intent: qsIntent,
        additionalTags,
      }
    };
    console.log("adding message", message);
    await addToQueue(message, ctrQueueUrl);

    const response = {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: "true"
      })
    };
    return response;
  } catch (error) {
    console.log("error: ", error);
    const response = {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "true",
        message: error,
      }),
    };
    return response;
  }
};

