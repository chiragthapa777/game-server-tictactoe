import { createClient } from "redis";

const redisClient = createClient();

redisClient.on("error", (err: Error) => {
  console.log("Redis Client Error", err);
});
redisClient.on("connect", () => {
  console.log("Redis connected");
});

export const connectRedis = async () => {
  await redisClient.connect();
};

export default redisClient;
