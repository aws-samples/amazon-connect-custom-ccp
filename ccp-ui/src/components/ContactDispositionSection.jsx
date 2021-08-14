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

import "amazon-connect-streams";

import React, { useCallback, useState } from "react";
import Container from "@awsui/components-react/container";
import Autosuggest from "@awsui/components-react/autosuggest"
import { genLogger } from "../lib";
import { useConnected, useDestroy } from "../hooks";

const name = "ContactDispositionSection";
const { log, error } = genLogger(name);

const ContactDispositionSection = ({ initialIntent, setSelectedIntent, selectedIntent, callIntents }) => {
  const [displayIntents, setDisplayIntents] = useState(false);

  const onConnected = useCallback((c) => {
    try {
      setDisplayIntents(true);
    } catch (e) {
      error("couldn't set data", e);
    }
  }, [setDisplayIntents]);
  useConnected(onConnected);

  const onDestroy = useCallback(() => {
    try {
      log("destroyed, emptying data");
      setDisplayIntents(false);
      setSelectedIntent({});
    } catch (e) {
      error("couldn't empty data", e);
    }
  }, [setDisplayIntents, setSelectedIntent]);
  useDestroy(onDestroy);

  const onIntentSelectChange = ({ detail }) => {
    setSelectedIntent(detail);
  };

  return (
    <>
      <div style={{marginBottom: "20px"}}>
        <div style={{backgroundColor: "#414141", color: "white", fontSize: "18px", textAlign: "center", height: "35px", padding: "8px", margin: "0" }}>
          Contact Disposition
        </div>
        <Container>
          <Autosuggest
            options={displayIntents ? callIntents : []}
            placeholder="Select an intent during call"
            filteringType="auto"
            controlId="formFieldId1"
            ariaDescribedby="intent selector"
            onChange={onIntentSelectChange}
            enteredTextLabel={value => `Use: "${value}"`}
            empty="No intents found"
            value={selectedIntent || initialIntent || ""}
            errorText="Unable to fetch intents"
          />
        </Container>
      </div>
    </>
  )
};

export default ContactDispositionSection;
