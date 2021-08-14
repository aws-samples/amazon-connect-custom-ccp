// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import "amazon-connect-streams";
import React, {memo, useRef, useEffect} from "react";
import {CONNECT_NAME} from "../config"
import { genLogger } from "../lib";

const name = "ConnectCCP";
const { log, error } = genLogger(name);

const ConnectCCP = () => {
  const ref = useRef();

  useEffect(() => {
    try {
      log("init start");
      if (typeof window === "undefined") throw new Error("window missing");
      if (typeof window.connect === "undefined")
        throw new Error("global connect missing");
      window.connect.core.initCCP(ref.current, {
        ccpUrl: `https://${CONNECT_NAME}.my.connect.aws/connect/ccp-v2`,
        loginPopup: false,
        loginPopupAutoClose: true,
        pageOptions: {
          enableAudioDeviceSettings: true,
          enablePhoneTypeSettings: true,
        },
        softphone: { allowFramedSoftphone: true },
      });
      log("init end");
    } catch (e) {
      error(e);
    }
  }, [ref]);

  log("render");
  return (
    <div
      ref={ref}
      style={{ width: "100%", height: "100%", minHeight: 480, minWidth: 400 }}
      // style={{ minWidth: 400, minHeight: 480 }}
    />
  );
};

export default memo(ConnectCCP);
