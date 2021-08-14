// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const aws = require("aws-sdk");
const connect = new aws.Connect({ region: process.env.AWS_REGION });
const connectID = process.env.CONNECT_ID;

exports.handler = async (event) => {
  console.log("event" , event);
  const message = JSON.parse(event.Records[0].body);
  const contactId = message.contactId;
  const additionalTags = message.Attributes.additionalTags || [];
  const Attributes = message.Attributes;
  console.log("attributes", Attributes);

  const params = {
    Attributes,
    InitialContactId: contactId,
    InstanceId: connectID,
  };

  if (additionalTags.length > 0) {
    additionalTags.map(({ name, value }) => {
      if(Attributes.intent !== value) {
        params.Attributes[name] = value
      }
    });
  }

  if (params.Attributes.additionalTags) {
    delete params.Attributes.additionalTags
  }
  console.log("Updating CTR with: ", params);
  await connect.updateContactAttributes(params).promise();

  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify({
      success: "true",
    }),
  };
  console.log("response: ", response);
  return response;
};