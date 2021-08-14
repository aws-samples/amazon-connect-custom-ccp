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

import React, {useState, useEffect, useCallback} from "react";
import Modal from "aws-northstar/components/Modal";
import LoadingIndicator from "aws-northstar/components/LoadingIndicator";
import Grid from "aws-northstar/layouts/Grid";
import Inline from "aws-northstar/layouts/Inline";
import Icon from "aws-northstar/components/Icon";
import Autosuggest from "@awsui/components-react/autosuggest";
import StatusIndicator from "aws-northstar/components/StatusIndicator";
import PieChart, {
  Pie,
  Cell,
  NORTHSTAR_COLORS,
  Legend,
  LabelList,
} from "aws-northstar/charts/PieChart";
import { genLogger } from "../lib";
import { buildIntentsForAgentURL, API_HOST } from "../config";
import { useInterval } from "../hooks";

const name = "StatisticsModal";
const { error } = genLogger(name);

// Most visible NorthStar colors
const COLORS_ARRAY = [
  NORTHSTAR_COLORS.BLUE_DARK,
  NORTHSTAR_COLORS.GREEN_DARK,
  NORTHSTAR_COLORS.RED_DARK,
  NORTHSTAR_COLORS.ORANGE_DARK,
  NORTHSTAR_COLORS.ORANGE_LIGHT,
  NORTHSTAR_COLORS.CHARCOAL_DARK,
  "#003F63",
  "#F2E638",
  "#7D6B7D",
  "#BDCC94",
  "#9ACFDD"
];

const buildUrl = (method, queueId) => `${API_HOST}/${method}?&queueId=${queueId}`;

const transformDataForPie = (data) => {
  if (data.length > 0) {
    const intents = data
      .filter((obj) => obj.intent !== undefined)
      .map(({ intent }) => intent);
    const keys = [...new Set(intents)];
    const newObjects = keys.map((name) => ({ name, value: 0 }));

    intents.forEach((i) => newObjects.find(({ name }) => name === i).value++);
    return newObjects;
  }
};

const getPieChartData = (agentName) => {
  const url = buildIntentsForAgentURL(agentName);
  return fetch(url)
    .then((res) => res.json())
    .then(transformDataForPie);
};

const getStatData = (method, queueId) =>
  fetch(buildUrl(method, queueId)).then((res) => res.json());

const StatItem = ({ text, icon, method, queueId }) => {
  const [data, setData] = useState(null);
  // fetch updates every 15 seconds
  const date = useInterval(15000);

  useEffect(() => {
    let isCancelled = false;
    const asyncFunc = async () => {
      try {
        if (!isCancelled) {
          const data = await getStatData(method, queueId);
          setData(data);
        }
      } catch (e) {
        if (!isCancelled) error(e);
      }
    };
    asyncFunc();
    return () => (isCancelled = true);
  }, [date, method, queueId]);

  return (
    <div style={{ fontSize: "15px", textAlign: "left" }}>
      <b>
        <Inline spacing="xs">
          {icon && <Icon name={icon} />}
          {data === null ? (
            <LoadingIndicator />
          ) : data instanceof Error || data === "Error" ? (
            <StatusIndicator statusType="negative">Error</StatusIndicator>
          ) : (
            <span>{JSON.stringify(data)}</span>
          )}
        </Inline>
      </b>
      <span>{text}</span>
    </div>
  );
};

const StatisticsModal = () => {
  const [visible, setVisible] = useState(false);
  const [pieData, setPieData] = useState([]);
  const [routingProfileQueues, setRoutingProfileQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState({});
  const [agentName, setAgentName] = useState({});
  const [queueNameLookUp, setQueueNameLookUp] = useState({});
  // fetch updates every 15 seconds
  const date = useInterval(15000);

  useEffect(() => {
    let isCancelled = false;
    const asyncFunc = async () => {
      try {
        window.connect.agent(async (agent) => {
          const { username, routingProfile } = agent.getConfiguration();
          const { queues } = routingProfile;
          setAgentName(username);

          const filteredQueues = queues
            .filter((q) => q.name !== null)
            .map((q) => {
              queueNameLookUp[q.queueId] = q.name;
              return { label: q.name, value: q.queueId };
            })
            .sort((a, b) => a.label.localeCompare(b.label));

          setRoutingProfileQueues(filteredQueues);
          console.log("routingProfile: ", routingProfile);
          const d = await getPieChartData(username);

          if (Array.isArray(d)) {
            const newD = d.filter((obj) => obj.name !== "undefined");
            if (!isCancelled) {
              setPieData(newD);
            } else {
              throw new Error("pie chart data not an array");
            }
          }
        });

      } catch (e) {
        if (!isCancelled) error(e);
      }
    };
    asyncFunc();
    return () => (isCancelled = true);
  }, [date, queueNameLookUp]);

  const onInputChange = useCallback(({ detail }) => {
    const name = queueNameLookUp[detail.value];
    console.log("queueName", name);

    setSelectedQueue({value: detail.value, label: name});
    setVisible(true);
  }, [setSelectedQueue, setVisible, queueNameLookUp]);

  const onModalClose =  useCallback(() => {
    setVisible(false);
    setSelectedQueue({});
  }, [setSelectedQueue, setVisible]);

  return (
    <>
      <Modal
        title={
          <>
            <Icon name="BarChart" />
            Contact Center Stats for Queue: { selectedQueue?.label || "-" }
          </>
        }
        visible={visible}
        onClose={onModalClose}
        width="90%"
      >
        <div style={{ padding: "20px" }}>
          {visible && (
            <Grid container spacing={1} justify="center" alignItems="center">
              <Grid item xs={5} style={{ height: "100%" }} align="center">
                <Grid
                  container
                  spacing={3}
                  justify="center"
                  alignItems="center"
                >
                  <Grid align="center" item xs={4}>
                    <StatItem
                      text="agents available"
                      method="avalAgents"
                      icon="HeadsetMic"
                      queueId={selectedQueue?.value}
                    />
                  </Grid>
                  <Grid align="center" item xs={4}>
                    <StatItem
                      text="customers in queue"
                      method="inQueue"
                      icon="People"
                      queueId={selectedQueue?.value}
                    />
                  </Grid>
                  <Grid align="center" item xs={4}>
                    <StatItem
                      text="avg seconds for queue"
                      method="avgQueueTime"
                      queueId={selectedQueue?.value}
                    />
                  </Grid>
                  <Grid align="center" item xs={4}>
                    <StatItem
                      text="calls missed"
                      method="missedCalls"
                      icon="CallMissed"
                      queueId={selectedQueue?.value}
                    />
                  </Grid>
                  <Grid align="center" item xs={4}>
                    <StatItem
                      text="avg seconds before abandonment"
                      method="avgMissedWaitTime"
                      queueId={selectedQueue?.value}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <StatItem
                      text="current longest wait time"
                      method="getLongestWaitTime"
                      queueId={selectedQueue?.value}
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={7} align="center">
                <PieChart title={`Daily call intents for ${agentName}`} width={500} height={350}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    fill={NORTHSTAR_COLORS.BLUE}
                    stroke={NORTHSTAR_COLORS.WHITE}
                    label
                  >
                    {pieData.length > 0 &&
                      pieData
                        .filter((obj) => obj.name !== "undefined")
                        .map((_, i) => (
                          <Cell
                            key={i}
                            fill={COLORS_ARRAY[i % COLORS_ARRAY.length]}
                          />
                        ))}
                  </Pie>
                  <LabelList />
                  <Legend />
                </PieChart>
              </Grid>
            </Grid>
          )}
        </div>
      </Modal>
      <div style={{ marginTop: "35px" }}>
        <div>
          <Icon name="BarChart"/>
          Stats
        </div>
        <Autosuggest
          options={routingProfileQueues}
          filteringType="manual"
          placeholder="Select a queue"
          enteredTextLabel={value => `Use: "${value}"`}
          ariaDescribedby="additional intent selector"
          onChange={onInputChange}
          value={selectedQueue?.label}
          finishedText="End of results"
          errorText="Unable to fetch queues"
          empty="No queues found"
        />
      </div>
    </>
  );
};

export default StatisticsModal;
