"use client";

import { useSocketContext } from "@/useSocket";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  params: {
    username: string;
    room: string;
  };
};

const cells = ["11", "12", "13", "21", "22", "23", "31", "32", "33"];

export default function page({ params }: Props) {
  const { username, room } = params;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mark, setMark] = useState<"X" | "O">(
    room.split("-")[0] === username ? "X" : "O"
  );
  const [myTurn, setMyTurn] = useState(mark === "X");
  const [opMark, setOpMark] = useState<"X" | "O">(
    room.split("-")[0] === username ? "O" : "X"
  );
  const [gameState, setGameState] = useState<{
    my: string[];
    opponent: string[];
  }>({
    my: [],
    opponent: [],
  });
  const router = useRouter();
  const { connectToSocket, disconnectSocket, isConnected, socket } =
    useSocketContext();

  const leaveGame = () => {
    socket?.emit("leaveRoom");
    router.back();
  };

  useEffect(() => {
    if (!isConnected) {
      connectToSocket(username);
    }
    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    console.log(socket?.id);
    if (socket) {
      socket.on("opMove", opponentMove);
      socket.on("next", handleNext);
      socket.on("opponent_left", () => {
        window.alert("you opponent left");
        leaveGame();
      });
    }
    () => {
      if (socket) {
        socket.off("opMove");
      }
    };
  }, [socket?.id]);

  const makeMove = (cell: string) => {
    if (!myTurn || loading) return;
    setGameState((state) => ({
      ...state,
      my: [...state.my, cell],
    }));
    setMyTurn(false);
    setLoading(true);
    socket?.emit("makeMove", cell, room);
  };
  const opponentMove = (cell: string) => {
    console.log("🚀 ~ opponentMove ~ cell:", cell);
    setGameState((state) => ({
      ...state,
      opponent: [...state.opponent, cell],
    }));
    setMyTurn(true);
  };

  const handleNext = (data: {
    winningPlayer: string | null;
    isDraw: boolean;
    isContinue: boolean;
  }) => {
    console.log("🚀 ~ page ~ data:", data);
    if (data.isContinue) {
      setLoading(false);
      return;
    }
    if (data.isDraw) {
      setTimeout(() => window.alert("match was a draw"), 1000);

      router.back();
      return;
    }
    if (data.winningPlayer) {
      if (data.winningPlayer === socket?.id) {
        setTimeout(() => window.alert("You won"), 1000);
      } else {
        setTimeout(() => window.alert("You Loose"), 1000);
      }
      router.back();
    }
  };

  return (
    <div>
      <div>
        <button className="underline font-bold" onClick={leaveGame}>
          Leave game
        </button>
      </div>
      <div className="text-center">
        {myTurn ? <p>Your turn</p> : <p>Opponent turn</p>}
      </div>
      <div className=" flex flex-col gap-4">
        <h1>
          You are <span className="border p-1">{mark}</span>
        </h1>
        <div className="grid grid-cols-3 gap-2">
          {cells.map((item) => (
            <div
              key={item}
              className="border aspect-square cursor-pointer text-[100px] flex justify-center border-black items-center"
              onClick={() => makeMove(item)}
            >
              {gameState.my.includes(item)
                ? mark
                : gameState.opponent.includes(item)
                ? opMark
                : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
