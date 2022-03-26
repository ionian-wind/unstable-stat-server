import httpRequest, {
  RequestTimeoutError,
  RequestFailedError,
} from "./lib/httpRequest.js";
import { HTTP_METHOD } from "./lib/constants.js";
import exponentialBackoff from "./lib/exponentialBackoff.js";
import processOnExit from "./lib/processOnExit.js";
import logger from "./lib/logger.js";

let PING_ID = 0;

const REQUEST_TIMEOUT = Number(process.env.REQUEST_TIMEOUT) || 10000;
const STAT_HOST = process.env.STAT_HOST || "localhost:8080";

const statistic = { ok: 0, error: 0, timeout: 0 };
const urlToPing = process.env.URL_TO_PING;

if (!urlToPing) {
  throw new Error("please set ping target in `URL_TO_PING` env var");
}

const handlePingSaveError = (pingId, error) => {
  if (error instanceof RequestTimeoutError) {
    statistic.timeout += 1;
    logger("[%s] ping result %s", pingId, "TIMEOUT");
  } else if (error instanceof RequestFailedError) {
    statistic.error += 1;
    logger("[%s] ping result %s", pingId, "FAIL");
  } else {
    logger("[%s] unknown error", pingId, error);
  }
};

const savePingResult = async (deliveryAttempt, pingId, responseTime, date) => {
  const message = {
    date,
    pingId,
    responseTime,
    deliveryAttempt,
  };
  logger("[%s] ping request %s", pingId, JSON.stringify(message));

  try {
    const { result } = await httpRequest(
      `http://${STAT_HOST}/data`,
      HTTP_METHOD.POST,
      message,
      REQUEST_TIMEOUT
    );
    logger("[%s] ping result %s", pingId, result);

    statistic.ok += 1;

    return true;
  } catch (error) {
    handlePingSaveError(pingId, error);

    return false;
  }
};

const sendPingRequest = async (url) => {
  // Increment ping counter and save result value as ping identifier
  const pingId = (PING_ID += 1);

  try {
    const { latency, date } = await httpRequest(
      url,
      HTTP_METHOD.GET,
      null,
      REQUEST_TIMEOUT
    );

    exponentialBackoff(1, savePingResult, pingId, latency, date);
  } catch (error) {
    logger("url ping error", error);
  }
};

setTimeout(() => {
  setInterval(sendPingRequest, 1000, urlToPing);
}, 2000);

processOnExit(() => {
  logger(
    "total %s, ok %s, error %s, timeout %s",
    statistic.ok + statistic.error + statistic.timeout,
    statistic.ok,
    statistic.error,
    statistic.timeout
  );
  process.exit();
});
