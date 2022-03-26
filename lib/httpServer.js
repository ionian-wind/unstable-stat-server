import http from "http";
import logger from "./logger.js";

export const statusCodeToMessage = (code) =>
  http.STATUS_CODES[code] || "Unknown error";

export default (host, port, handler) =>
  http
    .createServer(handler)
    .on("connection", (socket) => socket.setNoDelay()) // no need of Nagle algorithm here
    .listen(port, host, () => logger(`listening http://%s:%s`, host, port));
