// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require("aws-sdk");
const ssm = new AWS.SSM();
const ddb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

const addIntents = async (Item, TableName) => {
  const params = {
    TableName,
    Item,
  };

  ddb.put(params, (err, data) => {
    if (err) {
      console.error(`Unable to add ${Item.queueName}. Error JSON:`, JSON.stringify(err, null, 2));
    }
  });
};

// Change queue names and intents here
const AQueuesIntents = [
  "IntentA1",
  "IntentA2",
  "IntentA3",
];

const BQueuesIntents = [
  "IntentB1",
  "IntentB2",
  "IntentB3",
];

const outboundCallIntents = [
  "outboundCallIntent1",
  "outboundCallIntent2",
  "outboundCallIntent3",
];

const AQueuesData = [
  {
    intents: AQueuesIntents,
    queueName: "QueueA1",
  },
  {
    intents: AQueuesIntents,
    queueName: "QueueA2",
  },
];

const BQueuesData = [
  {
    intents: BQueuesIntents,
    queueName: "QueueB1",
  },
  {
    intents: BQueuesIntents,
    queueName: "QueueB2",
  },
];

const outboundCallData = [
  {
    intents: outboundCallIntents,
    queueName: "OutboundCall",
  }
];

const callIntentsData = [
  ...AQueuesData,
  ...BQueuesData,
  ...outboundCallData,
];

const handler = async () => {
  console.log("starting update...");
  const ssmParams = {
    Name: "/custom-ccp/phone-channel/ccp/dynamodb/ccpCallIntentsTableName",
  };

  let request = await ssm.getParameter(ssmParams).promise();
  const tableName = request.Parameter.Value;
  console.log("tableCallIntents", tableName);

  const handleRejection = (p) => p.catch((error) => ({ error }));

  const addCallIntentsPromises = callIntentsData.map((t) => {
    return addIntents(t, tableName);
  });

  await Promise.all(addCallIntentsPromises.map(handleRejection));
};

handler().then(() => console.log("Intent DB updated successfully"));
