export default (message, ...args) =>
  console.log(`(%s) ${message}`, new Date(), ...args);
