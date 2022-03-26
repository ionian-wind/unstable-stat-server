import { URL } from "url";
import https from "https";
import http from "http";

export const HTTP_METHOD = {
  GET: "get",
  POST: "post",
};

class RequestGenericError extends Error {
  /**
   *
   * @param [message]
   */
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
export class RequestTimeoutError extends RequestGenericError {}
export class RequestFailedError extends RequestGenericError {}

/**
 *
 * @param {string} url
 * @param {string} method
 * @param {string|object} body
 * @param {number} [timeout]
 * @returns {Promise<{ time: BigInt, result: string }>}
 */
export default (url, method, body, timeout = null) =>
  new Promise((resolve, reject) => {
    const requestMethod = HTTP_METHOD[method.toUpperCase()];

    if (!requestMethod) {
      return reject(new Error("unknown HTTP method"));
    }

    let requestBody = body;
    const urlObj = new URL(url);
    const options = { method };

    if (typeof body === "object") {
      options.headers = { "Content-Type": "application/json" };
      requestBody = JSON.stringify(requestBody);
    }

    const httpModule = urlObj.protocol === "https:" ? https : http;

    const date = Date.now();

    const req = httpModule
      .request(urlObj, options, async (res) => {
        res.setEncoding("utf-8");

        if (res.statusCode < 200 || res.statusCode > 399) {
          return reject(new RequestFailedError());
        }

        // Date object is based on system time, and can be affected by datetime changes
        // e.g. during DST clocks advancing, so let's use process.hrtime
        const startTime = process.hrtime.bigint();
        const latency = Math.ceil(
          Number(process.hrtime.bigint() - startTime) / 1000000
        );

        try {
          const content = [];

          for await (const chunk of res) {
            content.push(chunk);
          }

          resolve({ result: content.join(""), latency, date });
        } catch (error) {
          reject(error);
        }
      })
      .on("error", () => reject(new RequestFailedError()))
      .on("timeout", () => reject(new RequestTimeoutError()));

    if (timeout) {
      req.setTimeout(timeout);
    }

    if (requestMethod === HTTP_METHOD.POST) {
      req.write(requestBody);
    }

    req.end();
  });
