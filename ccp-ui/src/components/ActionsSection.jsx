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
import React, {useCallback, useEffect, useState} from "react";
import "amazon-connect-streams";
import "@awsui/global-styles/index.css"
import Container from "@awsui/components-react/container";
import ButtonDropdown from "@awsui/components-react/button-dropdown";
import Button from "@awsui/components-react/button";
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import ColumnLayout from "@awsui/components-react/column-layout";
import Autosuggest from "@awsui/components-react/autosuggest";
import SpaceBetween from "@awsui/components-react/space-between";
import Alert from "@awsui/components-react/alert";
import { genLogger } from "../lib";
import {useDestroy} from "../hooks";
import StatisticsModal from "./StatisticsModal";
import RecordingActions from "./RecordingActions";

const name = "ActionsSection";
const { log, error } = genLogger(name);

const COLD_TRANSFER_OPTIONS = {
  outbound: { text: "Outbound call", id: "outbound" },
  queue: { text: "Quick connect", id: "queue" },
};

const ActionsSection = ({ queueName }) => {
  const [outboundNumber, setOutboundNumber] = useState("");
  const [coldTransferOption, setColdTransferOption] = useState(COLD_TRANSFER_OPTIONS.outbound);
  const [inputValid, setInputValid] = useState(true);
  const [callConnected, setCallConnected] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [quickConnects, setQuickConnects] = useState([]);
  const [quickConnectNameLookUp, setQuickConnectNameLookUp] = useState({});
  const [selectedQuickConnect, setSelectedQuickConnect] = useState({});

  useEffect(() => {
    window.connect.agent((agent) => {
      const queueARNs = agent.getAllQueueARNs();
      agent.getEndpoints(
        queueARNs,
        {
          success: (data) => {
            log("Get quick connects successful", data.endpoints);
            const d = data.endpoints.map((ep) => {
              quickConnectNameLookUp[ep.endpointId] = ep;
              return { value: ep.endpointId, label: ep.name }
            });
            setQuickConnects(d);
          },
          failure:(e) => log("Failed to get quick Connects", e)})
    });
    if (queueName === "-") {
      setCallConnected(false);
    } else {
      setCallConnected(true);
    }
  }, [setCallConnected, queueName, setQuickConnects, quickConnectNameLookUp]);

  const validateInput = useCallback((value) => {
    log("validateInput");
    if (value.length > 0 && value.length < 11) {
      setInputValid(false);
      setAlertVisible(true);
      return false;
    } else {
      setInputValid(true);
      setAlertVisible(false);
      return true;
    }
  }, [setInputValid, setAlertVisible]);

  const transferOutbound = useCallback((event) => {
    validateInput(outboundNumber);
    if(!inputValid) {
      log("transferOutbound: number invalid");
      return null;
    }
    try {
      const endpoint = window.connect.Endpoint.byPhoneNumber(`+${outboundNumber}`);
      console.log("outboundNumber", outboundNumber);
      window.connect.agent((agent) => {
        const contactType = window.connect.ContactType.VOICE;

        agent.getContacts(contactType)[0].addConnection(endpoint, {
          success: (data) => {
            console.log("success");
            let contact = agent.getContacts(contactType)[0];
            contact.getAgentConnection().destroy();
          },
          failure: (e) => {
            console.log("failure: transfer failed due to: ", e);
          }
        });
      });

    } catch (e) {
      error("couldn't connect outbound call", e);
    }
  }, [outboundNumber, inputValid, validateInput]);

  const onDestroy = useCallback(() => {
    try {
      log("destroyed, emptying data");
      setOutboundNumber("");
      setSelectedQuickConnect({});
      setColdTransferOption(COLD_TRANSFER_OPTIONS.outbound);
      setCallConnected(false);
    } catch (e) {
      error("couldn't empty data", e);
    }
  }, [setOutboundNumber]);
  useDestroy(onDestroy);

  const onInputChange = useCallback(({ detail }) => {
    const endpoint = quickConnectNameLookUp[detail.value];
    const { name } = endpoint;
    console.log("quickConnectName", name);
    console.log("quickConnectId", detail.value);
    setSelectedQuickConnect({value: detail.value, label: name});

    window.connect.agent((agent) => {
      const contactType = window.connect.ContactType.VOICE;
      const contact = agent.getContacts(contactType)[0];

      agent.getContacts(contactType)[0].addConnection(endpoint, {
        success: (data) => {
          log("transfer success: ", data);
          contact.getAgentConnection().destroy();
        },
        failure: (e) => {
          console.log("failure: transfer failed due to: ", e);
        }
      });
    });
  }, [quickConnectNameLookUp, setSelectedQuickConnect]);

  return (
    <div>
      <div style={{backgroundColor: "#414141", color: "white", fontSize: "18px", textAlign: "center", height: "35px", padding: "8px", margin: "0" }}>
        Actions
      </div>
      <Container>
        <div style={{marginBottom: "15px"}}>
          <Alert
            visible={alertVisible}
            type="error"
          >
            The phone number you have entered is not valid. Please enter a valid 10 digit number.
          </Alert>
        </div>
        <ColumnLayout columns={2}>
          <ButtonDropdown
            disabled={!callConnected}
            onItemClick={({ detail }) => setColdTransferOption(COLD_TRANSFER_OPTIONS[detail.id])}
            items={Object.values(COLD_TRANSFER_OPTIONS)}
          >
            Cold Transfer Options
          </ButtonDropdown>
            { coldTransferOption.id === "outbound" ? (
              <SpaceBetween direction="horizontal" size="xl">
                <PhoneInput
                  country={'ca'}
                  onlyCountries={["ca"]}
                  placeholder="Enter phone number"
                  value={outboundNumber}
                  onChange={(phone) => setOutboundNumber(phone)}
                  isValid={inputValid}
                />
                <Button iconName="call" iconAlign="right" onClick={transferOutbound} disabled={!callConnected}>call</Button>
              </SpaceBetween>
            ) : (
              <Autosuggest
                onChange={onInputChange}
                value={selectedQuickConnect?.label || ""}
                options={quickConnects}
                enteredTextLabel={value => `Use: "${value}"`}
                placeholder="Select a Quick Connect"
                empty="No Quick connects found"
              />
            )}
        </ColumnLayout>
        <RecordingActions/>
        <StatisticsModal />
      </Container>
    </div>
  );
};

export default ActionsSection;
