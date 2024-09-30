import http from "http";
import app from "./express";
import setupSocket from "./socket";
import { connectRedis } from "./redis";

const server = http.createServer(app);
connectRedis();
setupSocket(server);
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
