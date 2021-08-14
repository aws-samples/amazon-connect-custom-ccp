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

import { useEffect, useState } from "react";
import { genLogger } from "./lib";

export const useInterval = (ms) => {
  const [date, setDate] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setDate(new Date()), ms);
    return () => clearInterval(interval);
  }, [ms]);
  return date;
};

const checkCallbackIsFunc = (fn) => {
  if (typeof fn !== "function") throw new Error("Callback not a function");
};

const useContactPrivate = (logger, callback) => {
  checkCallbackIsFunc(callback);
  useEffect(() => {
    let isCancelled = false;
    const { log } = logger;
    // Don't destructure sub
    const sub = window.connect.contact((c) => {
      log("contacted");
      try {
        if (isCancelled === false) {
          callback(c);
        } else {
          log("was canceled, not calling callback");
        }
      } catch (e) {
        logger.error("connect error", e);
      }
    });
    return () => {
      isCancelled = true;
      log("unsubscribing");
      sub.unsubscribe();
    };
  }, [logger, callback]);
};

export const useContact = (callback) => {
  checkCallbackIsFunc(callback);
  const logger = genLogger("useContact");
  useContactPrivate(logger, callback);
};

export const useConnected = (callback) => {
  checkCallbackIsFunc(callback);
  const logger = genLogger("useConnected");
  logger.log("init");

  useContactPrivate(logger, (c) => {
    c.onConnected(() => {
      logger.log("connected");
      try {
        callback(c);
      } catch (e) {
        logger.error("connect error", e);
      }
    });
  });
};

export const useDestroy = (callback) => {
  checkCallbackIsFunc(callback);
  const logger = genLogger("useDestroy");
  useContactPrivate(logger, (c) => {
    c.onDestroy(() => {
      logger.log("destroyed");
      try {
        callback(c);
      } catch (e) {
        logger.error("connect error", e);
      }
    });
  });
};

export const useCallCompleted = (callback) => {
  checkCallbackIsFunc(callback);
  const logger = genLogger("useCallCompleted");
  useContactPrivate(logger, (c) => {
    let wasOnCall = false;
    c.onConnected(() => {
      logger.log("call initiated");
      wasOnCall = true;
    });
    c.onACW(() => {
      logger.log("ACW initiated");
      if (wasOnCall) {
        logger.log("ACW after on call");
        try {
          callback(c);
        } catch (e) {
          logger.error("connect error", e);
        }
      } else {
        logger.log("ACW without being on call");
      }
    });
  });
};
