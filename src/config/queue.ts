import { Queue } from "bullmq";

const callQueue = new Queue("scheduled-calls", {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

export default callQueue;
