import express, { Application, Request, Response } from "express";
import { ONLINE_USER_SET } from "./constants";
import redisClient from "./redis";
import { busy_users, online_users } from "./socket";
import cors from "cors";

const app: Application = express();
app.use(cors());

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Tic-Tac-Toe API is running");
});

app.get("/joined-users", async (req: Request, res: Response) => {
  const users = await redisClient.sMembers(online_users);
  const busy = await redisClient.sMembers(busy_users);
  res.status(200).json({ users, busy });
});

app.post("/join-app", async (req: Request, res: Response) => {
  try {
    const body = req.body as { username: string };

    if (!body.username) {
      throw new Error("User name is required");
    }
    const sameUserExists: boolean = await redisClient.sIsMember(
      online_users,
      body.username
    );
    if (sameUserExists) {
      throw new Error("User name already exists");
    }

    await redisClient.sAdd(online_users, body.username);

    res.status(200).json({ data: "User added" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default app;
