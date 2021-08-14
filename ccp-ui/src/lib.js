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

export const spacesToCamel = (s) =>
  s
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (w, i) =>
      i === 0 ? w.toLowerCase() : w.toUpperCase()
    )
    .replace(/\s+/g, "");

export const valueToOption = (value) => ({ value, label: value });

export const genLogger = (name) => ({
  trace: (...args) => console.trace(name, "-", ...args),
  error: (...args) => console.error(name, "-", ...args),
  warn: (...args) => console.warn(name, "-", ...args),
  log: (...args) => console.log(name, "-", ...args),
  info: (...args) => console.info(name, "-", ...args),
});
