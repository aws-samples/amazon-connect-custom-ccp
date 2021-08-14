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

import React, { useCallback, useState} from "react";
import "@awsui/global-styles/index.css"
import SpaceBetween from "@awsui/components-react/space-between";
import { UPDATE_RECORDING_STATUS_URL } from "../config";
import { genLogger } from "../lib";
import { useCallCompleted, useConnected } from "../hooks";

const name = "RecordingActions";
const { log, error } = genLogger(name);

const styles = {
  cursor: "pointer",
  minWidth: "190px",
  padding: "13px",
  fontSize: "18px",
  textAlign: "center",
  color: "white",
  height: "45px"
};

const connectRecordingState = {
  on: "on",
  off: "off",
  blocked: "blocked",
};

const ccpRecordingStatus = {
  started: "started",
  paused: "paused",
  stopped: "stopped",
  resumed: "resumed",
  blocked: "blocked",
  noStatus: "-"
};

const recordingActions = {
  start: "START",
  stop: "STOP",
  pause: "PAUSE",
  resume: "RESUME",
};

const RecordingActions = () => {
  const [recordingStatus, setRecordingStatus] = useState(ccpRecordingStatus.noStatus);
  const [activeAction, setActiveAction] = useState("");
  const [callRecording, setCallRecording] = useState(false);
  const [recordingDisabled, setRecordingDisabled] = useState(true);
  const [contactId, setContactId] = useState("");
  const [initialContactId, setInitialContactId] = useState("");

  const onConnected = useCallback((c) => {
    try {
      const attr = c.getAttributes();
      const { initialRecordingState = {} } = attr;

      console.log("initialContactId", c.getInitialContactId());
      setInitialContactId(c.getInitialContactId());
      console.log("contactId", c.getContactId());
      setContactId(c.getContactId());

      if (initialRecordingState?.value === connectRecordingState.on) {
        setCallRecording(true);
        setRecordingStatus(ccpRecordingStatus.started);
        setActiveAction(recordingActions.start);
        setRecordingDisabled(false);
      } else if (initialRecordingState?.value === connectRecordingState.blocked) {
        setRecordingDisabled(true);
        setRecordingStatus(ccpRecordingStatus.blocked)
      } else {
        setRecordingDisabled(false);
      }

    } catch (e) {
      error("couldn't update recording info", e);
    }
  }, [setInitialContactId, setContactId, setCallRecording]);
  useConnected(onConnected);

  const onCallCompleted = useCallback(() => {
    try {
      setInitialContactId("");
      setContactId("");
      setCallRecording(false);
      setRecordingDisabled(true);
      setRecordingStatus(ccpRecordingStatus.noStatus);
      setActiveAction("")

    } catch (e) {
      error("couldn't empty recording info", e);
    }
  }, [setCallRecording, setContactId, setInitialContactId]);
  useCallCompleted(onCallCompleted);

  const actionClickHandler = (action) => {
    if (!enabled(action)) return;

    let params = {
      action,
      contactId,
      initialContactId,
    };

    const resp = fetch(UPDATE_RECORDING_STATUS_URL, { method: "post", body: JSON.stringify(params) })
      .then((res) => res.json());

    log("actionClickHandler resp", resp);

    if (resp.statusCode === 500 || resp.statusCode === 400) {
      return;
    }

    if (action === recordingActions.start) {
      setRecordingStatus(ccpRecordingStatus.started);
      setCallRecording(true);
      setRecordingDisabled(false);
      setActiveAction(recordingActions.start)

    } else if (action === recordingActions.stop) {
      setRecordingStatus(ccpRecordingStatus.stopped);
      setActiveAction(recordingActions.stop);
      setRecordingDisabled(true);

    } else if (action === recordingActions.pause) {
      setRecordingStatus(ccpRecordingStatus.paused);
      setActiveAction(recordingActions.pause);

    } else if (action === recordingActions.resume) {
      setRecordingStatus(ccpRecordingStatus.resumed);
      setActiveAction(recordingActions.resume);
    }

    return null;
  };

  const enabled = (action) => {
    if (recordingDisabled) return false;

    if(action === recordingActions.start) {
      return !callRecording && (activeAction !== action)

    } else if(action === recordingActions.resume) {
      return callRecording && (activeAction !== action) && (recordingStatus !== ccpRecordingStatus.started)
    } else {
      return callRecording && (activeAction !== action)
    }
  };

  return (
    <div style={{ marginTop: "35px"}}>
      <div style={{ marginBottom: "5px"}}>
        {`Recording status: ${recordingStatus}`}
      </div>
      <SpaceBetween direction="horizontal" size="l">
        <div
          onClick={() => actionClickHandler(recordingActions.start)}
          style={{ ...styles, backgroundColor: enabled(recordingActions.start) ? "green" : "#76797b"}}> Start </div>
        <div
          onClick={() => actionClickHandler(recordingActions.stop)}
          style={{ ...styles, backgroundColor: enabled(recordingActions.stop) ? "#EB2D0D" : "#76797b"}}> Stop </div>
        <div
          onClick={() => actionClickHandler(recordingActions.pause)}
          style={{ ...styles, backgroundColor: enabled(recordingActions.pause) ? "#F0C935" : "#76797b"}}> Pause </div>
        <div
          onClick={() => actionClickHandler(recordingActions.resume)}
          style={{ ...styles, backgroundColor: enabled(recordingActions.resume) ? "#3BD942" : "#76797b"}}> Resume </div>
      </SpaceBetween>
    </div>
  );
};

export default RecordingActions;
