import logger from "./logger.js";

export default (handler) => {
  process
    .on("SIGINT", handler)
    .on("SIGUSR1", handler)
    .on("SIGUSR2", handler)
    .on("uncaughtException", (error) => {
      logger("uncaughtException", error);
      handler();
    });
};
