export default (handler) => {
  process.on("SIGINT", handler);
  process.on("SIGUSR1", handler);
  process.on("SIGUSR2", handler);
  process.on("uncaughtException", (error) => {
    console.error(error);
    handler();
  });
};
