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

import React, { useCallback, useEffect, useState } from "react";
import Button from "aws-northstar/components/Button";
import Modal from "@awsui/components-react/modal";
import Multiselect from "@awsui/components-react/multiselect"
import Form from "aws-northstar/components/Form";
import FormField from "aws-northstar/components/FormField";
import Autosuggest from "@awsui/components-react/autosuggest"
import Badge from "aws-northstar/components/Badge";
import {useCallCompleted, useDestroy} from "../hooks";
import {
  POST_CALL_INTENT_URL,
  POST_NEW_CONTACT_ID_URL,
} from "../config";
import {
  genLogger,
  valueToOption,
  spacesToCamel,
} from "../lib";

const name = "TaggingModal";
const { log, warn } = genLogger(name);

const sendCallTags = ({ intent, contactId, dropdownValues, queueName, agentName }) => {
  const url = new URL(
    POST_CALL_INTENT_URL
  );

  const additionalTags = dropdownValues.map((value, index) => {
    return { name: `tag_${index + 1}`, value}
  });

  const params = {
    agentName: agentName,
    intent,
    queueName,
    connectID: contactId || "unknown",
    additionalTags,
  };

  log("sendCallTags params", params);

  return fetch(url, { method: "post", body: JSON.stringify(params)});
};

const updateDBwithNewCallID = (id, agentName) => {
  log("update db", id);
  log("update agentName", agentName);
  const url = POST_NEW_CONTACT_ID_URL({ agentName: agentName, id});
  fetch(
    url,
    { method: "post" }
  ).then((res) => res.json());
};

const TaggingModal = ({ initialIntent, selectedIntent, setSelectedIntent, callIntents, queueName }) => {
  const [visible, setVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [data, setData] = useState(null);
  const [mainTag, setMainTag] = useState({});
  const [tags, setTags] = useState([]);
  const [agent, setAgent] = useState("");

  useEffect(() => {
    if (callIntents.length > 0) setTags(callIntents);
    if (typeof selectedIntent === "string") setMainTag(valueToOption(selectedIntent));
  }, [selectedIntent, callIntents]);

  const onCallCompleted = useCallback((c) => {
    const contactId = c.getContactId();
    const attr = c.getAttributes();
    let agentUsername;
    const { lastAgentUsername = {} } = attr;
    const { value: agentName } = lastAgentUsername;
    agentUsername = agentName;
    const intent = spacesToCamel(selectedIntent?.value || attr.intent?.value || '');

    if (!agentUsername) {
      window.connect.agent((agent) => {
        const { username } = agent.getConfiguration();
        agentUsername = username;
      });
    }

    setAgent(agentUsername);
    updateDBwithNewCallID(contactId, agentUsername);
    setSelectedTags([]);
    setData({
      queueName,
      agentName,
      contactId,
      intent,
      dropdownValues: [],
    });
    setVisible(true);

  }, [selectedIntent, queueName, setAgent]);
  useCallCompleted(onCallCompleted);

  const onInputChange = useCallback(({detail}) => {
    setSelectedIntent(detail);
    setMainTag(detail);
  }, [setSelectedIntent, setMainTag]);

  const onMultiselectChange = useCallback(({ detail }) => {
    const arr = detail.selectedOptions;
    const dropdownValues = arr.map(({ value }) => value);
    setSelectedTags(arr);
    setData((pd) => ({ ...pd, dropdownValues }));
  }, [setSelectedTags, setData]);

  const submitModal = () => {
    log("submit!", mainTag.value);
    closeModal();
  };

  const closeModal = () => {
    if (typeof mainTag?.value === "string") {
      if (mainTag?.value.trim() !== "") data.intent = mainTag?.value;
    }
    if (data !== null && queueName !== undefined && mainTag?.value) {
      data.queueName = queueName;
      data.agentName = agent;
      log("data to send", data);
      sendCallTags(data);
    } else {
      warn("did not submit intent");
      log("data was: ", data);
      log("queueName was: ", queueName);
      log("mainTag was: ", mainTag?.value);
    }
    setData(null);
    setVisible(false);
    setMainTag({});
    setSelectedIntent({});
    setTags([]);
  };

  const MainTagSelect = useCallback(
    () => (
      <Autosuggest
        options={tags}
        filteringType="manual"
        enteredTextLabel={value => `Use: "${value}"`}
        controlId="taggingModalFormMainTag"
        ariaDescribedby="additional intent selector"
        onChange={onInputChange}
        placeholder="Select additional intents"
        finishedText="End of results"
        errorText="Unable to fetch intents"
        value={mainTag?.value}
      />
    ),
    [mainTag, tags, onInputChange]
  );

  return (
    <Modal header="Tag This Call" visible={visible} onDismiss={closeModal} size="medium">
      <Form
        actions={
          <div>
            <Button variant="primary" onClick={submitModal} disabled={mainTag?.value ? false : true}>
              Submit
            </Button>
          </div>
        }
      >
        {
          initialIntent?.value ? (
            <FormField label="Original Tag">
              <Badge color="blue" content={initialIntent?.value} />
            </FormField>
          ) : null
        }
        <FormField
          label="Main Tag"
          controlId="taggingModalFormMainTag"
        >
          <MainTagSelect />
        </FormField>
        <FormField
          label="Additional Tags"
          controlId="taggingModalAdditionalTags"
        >
          <Multiselect
            selectedOptions={selectedTags}
            controlId="taggingModalAdditionalTags"
            options={tags}
            placeholder="Choose a tag"
            tokenLimit={10}
            onChange={onMultiselectChange}
            disabled={mainTag?.value ? false : true}
            filteringType="manual"
            empty="No intents found"
            errorText="Unable to fetch intents"
            finishedText="End of results"
          />
        </FormField>
      </Form>
    </Modal>
  );
};

export default TaggingModal;
