/*
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: MIT-0
*
* Permission is hereby granted, free of charge, to any person obtaining a copy of this
* software and associated documentation files (the "Software"), to deal in the Software
* without restriction, including without limitation the rights to use, copy, modify,
* merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
* permit persons to whom the Software is furnished to do so.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
* INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
* PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
* HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
* OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
* SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


let connectName = "<CONNECT_NAME>";
let apiGatewayID = "<API_GATEWAY_ID>";
let cfDistributionUrl = "<CF_DISTRIBUTION_URL>";


// set default values for dev
export const CONNECT_NAME = connectName.includes("<") ? "company-name-connect-dev" : connectName;
export const API_GATEWAY_ID = apiGatewayID.includes("<") ? "<<API_GATEWAY_ID>>" : apiGatewayID;
export const CF_DISTRIBUTION_URL = cfDistributionUrl.includes("<") ? "<<CF_DISTRIBUTION_URL>>" : cfDistributionUrl;

export const API_HOST = `https://${API_GATEWAY_ID}.execute-api.us-west-2.amazonaws.com/prod`;
export const POST_CALL_INTENT_URL = `${API_HOST}/postNewCallIntent`;
export const buildIntentsForAgentURL = (agentName) => {
  return `${API_HOST}/getIntentsForAgent?agentName=${agentName}`
};
export const UPDATE_RECORDING_STATUS_URL = `${API_HOST}/updateRecordingStatus`;

export const buildGetIntentsURL = (queueName) => `${API_HOST}/getCallIntents/${queueName}`;
export const POST_NEW_CONTACT_ID_URL = ({ agentName, id }) => `${API_HOST}/postNewContactId?agentName=${agentName}&connectID=${id}`;

