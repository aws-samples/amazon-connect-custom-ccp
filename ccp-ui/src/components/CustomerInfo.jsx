// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import "amazon-connect-streams";
import React, {useCallback, useEffect, useState} from "react";
import Text from "aws-northstar/components/Text";
import Box from "aws-northstar/layouts/Box";
import Container from "aws-northstar/layouts/Container";
import ColumnLayout, { Column } from 'aws-northstar/layouts/ColumnLayout';
import Stack from 'aws-northstar/layouts/Stack';
import { useConnected, useDestroy } from "../hooks";
import { genLogger, valueToOption } from "../lib";
import ContactDispositionSection from "./ContactDispositionSection";
import TaggingModal from "./TaggingModal";
import ActionsSection from "./ActionsSection";
import {buildGetIntentsURL} from "../config";

const name = "CustomerInfo";
const { log, error } = genLogger(name);

const formatData = (attr = {}) => {
  attr.intent = attr.intent || {};
  attr.queueName = attr.queueName || {};
  attr.priority = attr.priority || {};
  attr.accountName = attr.accountName || {};
  attr.brokerCode = attr.brokerCode || {};

  const intent = attr.intent?.value;
  const queueName = attr.queueName.value;
  const priority = attr.priority.value;
  const accountName = attr.accountName.value;
  const brokerCode = attr.brokerCode.value;
  return {
    intent,
    queueName,
    priority,
    accountName,
    brokerCode,
  };
};

const keyNameMappings = {
  accountName: 'Broker Name',
  queueName: 'Queue Name',
  brokerCode: 'Broker Code'
};

const getIntents = (queueName) => {
  const intentUrl = buildGetIntentsURL(queueName);
  return fetch(intentUrl).then((res) => res.json());
};

const CustomerInfo = () => {
  const [initialIntent, setInitialIntent] = useState({});
  const [selectedIntent, setSelectedIntent] = useState({});
  const [callIntents, setCallIntents] = useState([]);
  const [data, setData] = useState({
    queueName: '-',
    priority: "false",
    accountName: '-',
    brokerCode: '-',
  });

  const onConnected = useCallback((c) => {
    try {
      const attr = c.getAttributes();
      log("attr: ", attr);
      if (attr === null) {
        throw new Error("attr was null");
      }

      log("formatting data");
      const d = formatData(attr);
      log("setting data if not empty");
      if (Object.keys(d).length > 0) {
        log("setting data...", d);
        setData(d);
        const { intent } = d;
        setInitialIntent(valueToOption(intent));
      }
    } catch (e) {
      error("couldn't set data", e);
    }
  }, []);
  useConnected(onConnected);

  const onDestroy = useCallback(() => {
    try {
      log("destroyed, emptying data");
      setData({
        queueName: '-',
        priority: "false",
        accountName: '-',
        brokerCode: '-',
      });
      setSelectedIntent({});
      setInitialIntent({});
    } catch (e) {
      error("couldn't empty data", e);
    }
  }, []);
  useDestroy(onDestroy);

  useEffect(() => {
    let isCancelled = false;
    const asyncFunc = async () => {
      try {
        if (data?.queueName && data?.queueName !== '-') {
          const intents = await getIntents(data?.queueName);
          const formattedIntents = intents
            .map(({ title }) => valueToOption(title))
            .sort((a, b) => a.label.localeCompare(b.label));

          setCallIntents(formattedIntents);
          console.log("intents: ", intents);
        }
      } catch (e) {
        if (!isCancelled) error(e);
      }
    };
    asyncFunc();
    return () => (isCancelled = true);
  }, [data]);

  return (
    <div>
      {
        data.priority === "true" ? (<Box
          bgcolor="#36741B"
          color="white"
          fontSize="28px"
          fontWeight="bold"
          textAlign="center"
          marginBottom="5px"
          height="60px"
          padding="20px"
        >
          Priority
        </Box>) : null
      }
      <div>
        <Box bgcolor="#414141" color="white" fontSize="18px" textAlign="center" height="35px" padding="8px" m={0}>
          Contact Attributes
        </Box>
        <Container>
          <ColumnLayout>
            <Column key="column1">
              <Stack>
                {
                  Object.keys(data).map((key, index) => {
                    if (key !== "intent" && key !== "priority") {
                      return  <Text color="primary" key={index}>{keyNameMappings[key]}</Text>;
                    }
                    return null;
                  })
                }
              </Stack>
            </Column>
            <Column key="column2">
              <Stack>
                {
                  Object.keys(data).map((key, index) => {
                    if (key !== "intent" && key !== "priority") {
                      return <Text color="primary" key={index}>{data[key] || "-"}</Text>;
                    }
                    return null;
                  })
                }
              </Stack>
            </Column>
          </ColumnLayout>
        </Container>
        <ContactDispositionSection
          initialIntent={initialIntent?.value}
          selectedIntent={selectedIntent?.value}
          setSelectedIntent={setSelectedIntent}
          callIntents={callIntents}
        />
        <ActionsSection queueName={data?.queueName}/>

        <TaggingModal
          initialIntent={initialIntent?.value}
          selectedIntent={selectedIntent?.value}
          setSelectedIntent={setSelectedIntent}
          callIntents={callIntents}
          queueName={data?.queueName}
        />
      </div>
    </div>
  );
};

export default CustomerInfo;
