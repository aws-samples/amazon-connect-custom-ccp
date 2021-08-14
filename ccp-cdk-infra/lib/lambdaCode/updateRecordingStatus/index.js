
const aws = require("aws-sdk");
const connect = new aws.Connect();
const connectID = process.env.CONNECT_ID;
const sqs = new aws.SQS({ region: process.env.AWS_REGION });

const ctrQueueUrl = process.env.CTR_QUEUE_URL;

const addToQueue = async (message) => {
  const params = {
    MessageBody: JSON.stringify(message),
    QueueUrl: ctrQueueUrl,
  };
  console.log(`Sending SQS Message to : ${ctrQueueUrl}.`);
  try {
    await sqs.sendMessage(params).promise();
    console.log(`Sending SQS Message to : ${ctrQueueUrl}. Succeeded`);
  }catch (err) {
    console.error(`Sending message failed: ${err}.`);
  }
};

exports.handler = async (event) => {
  console.log("event", event);
  const { body = {} } = event;

  const details = JSON.parse(body);
  console.log("details", details);

  const {
    action,
    contactId,
    initialContactId,
  } = details;

  const params = {
    ContactId: contactId,
    InitialContactId: initialContactId,
    InstanceId: connectID,
  };

  const message = {
    contactId,
    initialContactId,
    Attributes: {},
  };

  try{
    console.log(`attempting to ${action} recording`);
    console.log(`with params`, params);
    const date = new Date().toLocaleString();

    let resp;

    if(action === 'START') {
      params.VoiceRecordingConfiguration = { VoiceRecordingTrack: "ALL" };
      resp = await connect.startContactRecording(params).promise();
      message.Attributes.recordingStarted = date;
      console.log("startContactRecording result: ", resp);

    } else if (action === 'STOP') {
      resp = await connect.stopContactRecording(params).promise();
      message.Attributes.recordingStopped = date;

      console.log("stopContactRecording result: ", resp);

    } else if (action === 'PAUSE') {
      resp = await connect.suspendContactRecording(params).promise();
      message.Attributes.recordingPaused = date;

      console.log("suspendContactRecording result: ", resp);

    } else if (action === 'RESUME') {
      resp = await connect.resumeContactRecording(params).promise();
      message.Attributes.recordingResumed = date;

      console.log("resumeContactRecording result: ", resp);

    } else {
      throw new Error(`Unsupported action: ${action}`);
    }

    console.log("adding message: ", message);
    await addToQueue(message);

    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: resp, action}),
    };
    return response;

  } catch(e) {
    console.log("error: ", e);

    const response = {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(e),
    };
    return response;
  }
};
