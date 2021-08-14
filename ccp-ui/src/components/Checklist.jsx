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

import React, { useEffect, useState } from "react";
import Container from "aws-northstar/layouts/Container";
import Checkbox from "aws-northstar/components/Checkbox";
import LoadingIndicator from "aws-northstar/components/LoadingIndicator";
import StatusIndicator from "aws-northstar/components/StatusIndicator";
import { genLogger, LAMBDA_PREFIX } from "../lib";

const name = "Checklist";
const { log, error } = genLogger(name);

const List = ({ tasks }) => (
  <ul style={{ listStyle: "none", paddingLeft: "20px" }}>
    {tasks
      .filter((v) => v && v)
      .map((v, k) => (
        <li key={k}>
          <Checkbox>{v}</Checkbox>
        </li>
      ))}
  </ul>
);

const renderList = (tasks) => {
  if (Array.isArray(tasks))
    return tasks.length > 0 ? (
      <List tasks={tasks} />
    ) : (
      <StatusIndicator statusType="info">No tasks required</StatusIndicator>
    );
  if (tasks instanceof Error || typeof tasks === "undefined")
    return (
      <StatusIndicator statusType="negative">
        Error loading tasks
      </StatusIndicator>
    );

  return <LoadingIndicator label="Loading" />;
};

const getChecklist = (intent) => {
  const url = `https://${LAMBDA_PREFIX}.execute-api.us-east-1.amazonaws.com/prod/getchecklist?intent=${intent}`;
  return intent === ""
    ? new Promise(() => [])
    : fetch(url).then((res) => res.json());
};

const Checklist = ({ intent }) => {
  const [tasks, setTasks] = useState(null);

  useEffect(() => {
    let isCancelled = false;
    setTasks(null);
    const asyncFunc = async () => {
      try {
        log("getting tags for intent");
        if (typeof intent !== "string") throw new Error("intent not a string");
        if (intent.trim() === "") throw new Error("intent empty");
        const newTasks = await getChecklist(intent);
        if (!isCancelled) {
          log("setting tags");
          setTasks(newTasks);
        }
      } catch (e) {
        if (!isCancelled) error(e);
      }
    };
    if (typeof intent === "string") asyncFunc();
    return () => (isCancelled = true);
  }, [intent]);

  return intent ? (
    <Container headingVariant="h4" title={`${intent} todo list`}>
      {renderList(tasks)}
    </Container>
  ) : (
    <></>
  );
};

export default Checklist;
