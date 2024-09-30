import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import redisClient from "./redis";
import { cellName, checkWinner, GameState, WINNER_STATE } from "./tictactoe";

export const online_users = "online_users";
export const busy_users = "busy_users";
const getRoomName = (player1: string, player2: string) => {
  return [player1, player2]
    .sort((a, b) => {
      if (a > b) {
        return -1;
      }
      if (b > a) {
        return 1;
      }
      return 0;
    })
    .join("-");
};

export const initRedis = async () => {
  await redisClient.del(online_users);
  await redisClient.del(busy_users);
  const [onGames, gameStates] = await Promise.all([
    redisClient.keys("on_game:*"),
    redisClient.keys("game_state:*"),
  ]);
  if (onGames.length > 0 || gameStates.length > 0) {
    await redisClient.del([...onGames, ...gameStates]);
  }
};

export const handleGameFinish = async ({
  gameState,
}: {
  socket: Socket;
  winnerSocketId?: string;
  gameState: GameState;
}) => {
  await Promise.all([
    redisClient.del(`on_game:${gameState.playerSocketMapping.player1}`),
    redisClient.del(`on_game:${gameState.playerSocketMapping.player2}`),
  ]);
  // update leader board and send updates
};

const setupSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["get", "post"],
    },
  });
  initRedis();

  io.on("connection", (socket: Socket) => {
    try {
      // join game and disconnect
      socket.on("joinGame", async (username: string, callback) => {
        try {
          await Promise.all([
            redisClient.set(socket.id, username),
            redisClient.set(username, socket.id),
            redisClient.sAdd(online_users, username),
          ]);
          socket.broadcast.emit(
            "users",
            await redisClient.sMembers(online_users)
          );
          callback("ok");
        } catch (error) {
          console.log("🚀 ~ socket.on ~ error joinGame:", error);
        }
      });

      socket.on("disconnect", async () => {
        try {
          const username = await redisClient.get(socket.id);
          console.log(`User disconnected - ${username} - ${socket.id}`);
          await Promise.all([
            redisClient.sRem(online_users, username),
            redisClient.sRem(busy_users, username),
            redisClient.del(socket.id),
            redisClient.del(username),
          ]);
          socket.broadcast.emit(
            "users",
            await redisClient.sMembers(online_users)
          );
          const userWasOnGameRoom = await redisClient.get(
            `on_game:${socket.id}`
          );
          if (userWasOnGameRoom) {
            socket.broadcast
              .in(userWasOnGameRoom)
              .emit("opponent_left", "Your opponent was disconnected");
          }
        } catch (error) {
          console.log("🚀 ~ socket.on ~ error disconnect:  ", error);
        }
      });

      // play game
      socket.on("request", async (player2UserName: string) => {
        try {
          const socketId = await redisClient.get(player2UserName);
          const player1 = await redisClient.get(socket.id);
          io.to(socketId).emit("request", player1); // on req, user will send res to socket id with accept or deny, is accept will join room
        } catch (error) {
          console.log("🚀 ~ socket.on ~ error: request", error);
        }
      });

      socket.on(
        "response",
        async (data: "accept" | "deny", player2UserName: string) => {
          console.log("🚀 ~ data:", data, player2UserName);
          try {
            const socketId = await redisClient.get(player2UserName);
            const player1 = await redisClient.get(socket.id);
            io.to(socketId).emit("response", data, player1);
          } catch (error) {
            console.log("🚀 ~ error response :", error);
          }
        }
      );

      socket.on(
        "joinRoom",
        async (player2: string, callback: (params: string | null) => void) => {
          try {
            if (!player2) {
              callback(null);
              return;
            }
            const player1 = await redisClient.get(socket.id);
            const player2SocketId = await redisClient.get(player2);

            const roomName = getRoomName(player1, player2);
            socket.join(roomName);

            // to track user leave game
            await Promise.all([
              redisClient.set(`on_game:${socket.id}`, roomName),
              redisClient.set(`on_game:${player2SocketId}`, roomName),
            ]);

            // create game state
            const initialState: GameState = {
              player1Moves: [],
              player2Moves: [],
              playerSocketMapping: {
                player1: socket.id,
                player2: player2SocketId,
              },
            };
            await redisClient.json.set(
              `game_state:${roomName}`,
              "$",
              initialState
            );

            console.log("game state set", " ", socket.id);

            // to track busy user list
            await redisClient.sAdd(
              busy_users,
              await redisClient.get(socket.id)
            );

            socket.broadcast.emit(
              "busy",
              await redisClient.sMembers(busy_users)
            );
            callback(roomName);
          } catch (error) {
            console.log("🚀 ~ error joinRoom:", error);
          }
        }
      );

      socket.on("leaveRoom", async (room: string) => {
        try {
          const userWasOnGameRoom = await redisClient.get(
            `on_game:${socket.id}`
          );
          if (userWasOnGameRoom) {
            redisClient.json.del(userWasOnGameRoom);
            socket.broadcast
              .in(userWasOnGameRoom)
              .emit("opponent_left", "Your opponent was disconnected");
          }
          await redisClient.sRem(busy_users, await redisClient.get(socket.id));
          await redisClient.del(`on_game:${socket.id}`);
          socket.broadcast.emit("busy", await redisClient.sMembers(busy_users));
          socket.leave(room);
        } catch (error) {
          console.log("🚀 ~ socket.on ~ error leaveRoom :", error);
        }
      });

      socket.on("makeMove", async (position: cellName, room: string) => {
        try {
          socket.broadcast.to(room).emit("opMove", position);
          const gameState: GameState = (await redisClient.json.get(
            `game_state:${room}`
          )) as GameState;
          const isPlayer1 = gameState.playerSocketMapping.player1 === socket.id;
          if (isPlayer1) {
            gameState.player1Moves.push(position);
          } else {
            gameState.player2Moves.push(position);
          }
          const winnerState = checkWinner(gameState);
          console.log("🚀 ~ socket.on ~ winnerState:", winnerState);
          switch (winnerState) {
            case WINNER_STATE.PLAYER1: {
              socket.to(room).emit("next", {
                winningPlayer: gameState.playerSocketMapping.player1,
                isDraw: false,
                isContinue: false,
              });
              await handleGameFinish({
                gameState,
                socket,
                winnerSocketId: gameState.playerSocketMapping.player1,
              });
              break;
            }
            case WINNER_STATE.PLAYER2: {
              socket.to(room).emit("next", {
                winningPlayer: gameState.playerSocketMapping.player2,
                isDraw: false,
                isContinue: false,
              });
              await handleGameFinish({
                gameState,
                socket,
                winnerSocketId: gameState.playerSocketMapping.player2,
              });
              break;
            }
            case WINNER_STATE.CONTINUE: {
              socket.broadcast.to(room).emit("next", {
                winningPlayer: null,
                isDraw: false,
                isContinue: true,
              });
              await redisClient.json.set(`game_state:${room}`, "$", gameState);
              break;
            }
            case WINNER_STATE.DRAW: {
              socket.to(room).emit("next", {
                winningPlayer: null,
                isDraw: true,
                isContinue: false,
              });
              await handleGameFinish({ gameState, socket });
              break;
            }
          }
        } catch (error) {
          console.log("🚀 ~ error makeMove :", error);
        }
      });
    } catch (error) {}
  });
};

export default setupSocket;
