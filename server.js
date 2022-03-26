import httpServer, { statusCodeToMessage } from "./lib/httpServer.js";
import processOnExit from "./lib/processOnExit.js";
import logger from "./lib/logger.js";
import getRandomInt from "./lib/getRandomInt.js";

const host = process.env.SERVER_HOST || "localhost";
const port =
  process.env.SERVER_PORT !== "0" ? Number(process.env.SERVER_PORT) || 8080 : 0;

const statistics = {
  total: 0,
  summaryTime: 0,
  list: [],
};

const getAverageResponse = () =>
  statistics.total > 0
    ? Math.ceil(statistics.summaryTime / statistics.total)
    : null;

const getMedianResponse = () => {
  const values = [...statistics.list];

  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort();

  const half = Math.floor(sorted.length / 2);

  if (sorted.length % 2) {
    return sorted[half];
  }

  return Math.floor((sorted[half - 1] + sorted[half]) / 2);
};

const sendError = (req, res, status) =>
  res.writeHead(status).end(statusCodeToMessage(status));

const saveStatistics = (time) => {
  statistics.total += 1;
  statistics.summaryTime += time;
  statistics.list.push(time);
};

const sendOkResponse = (req, res, body) => {
  const data = JSON.parse(body);

  logger(body);

  saveStatistics(data.responseTime);

  res.writeHead(200).end("OK");
};

const sendErrorResponse = (req, res) => sendError(req, res, 500);

const hangUpResponse = (req, res) => {};

// 60% for OK response
// 20% for ERROR response
// 20% for NO response
const responseProbabilities = [
  sendOkResponse,
  sendOkResponse,
  sendOkResponse,
  sendOkResponse,
  sendOkResponse,
  sendOkResponse,
  sendErrorResponse,
  sendErrorResponse,
  hangUpResponse,
  hangUpResponse,
];

httpServer(host, port, async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/data") {
      const buffers = [];

      for await (const chunk of req) {
        buffers.push(chunk);
      }

      const body = Buffer.concat(buffers).toString();

      const handler =
        responseProbabilities[
          getRandomInt(0, responseProbabilities.length - 1)
        ];

      handler(req, res, body);
    } else {
      sendError(req, res, 404);
    }
  } catch (error) {
    logger(error);
    sendError(req, res, 500);
  }
});

processOnExit(() => {
  logger(
    "average time: %s; median time: %s",
    getAverageResponse(),
    getMedianResponse()
  );
  process.exit();
});
