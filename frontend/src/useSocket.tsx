"use client";

import React, { Context, createContext, useContext, useState } from "react";
import { io, Socket } from "socket.io-client";
import { baseUrl } from "./constant";

export type SocketContextType = {
  isConnected: boolean;
  socket?: Socket;
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setSocket: React.Dispatch<React.SetStateAction<Socket | undefined>>;
  connectToSocket: (username: string) => void;
  disconnectSocket: () => void;
};

const SocketContext: Context<SocketContextType | undefined> = createContext<
  SocketContextType | undefined
>(undefined);

export const SocketContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | undefined>();
  const [transport, setTransport] = useState("N/A");

  const connectToSocket = (username: string) => {
    console.log("Connecting....");
    const socket = io(baseUrl);
    setSocket(socket);
    setTransport(socket.io.engine.transport.name);
    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("joinGame", username, (data: any) => {
        console.log("Join Game =>", data);
      });
    });
    socket.on("disconnected", () => {
      setIsConnected(false);
    });
  };

  const disconnectSocket = () => {
    if (socket) {
      socket?.disconnect();
    }
    setTransport("N/A");
  };

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        socket,
        setIsConnected,
        setSocket,
        connectToSocket,
        disconnectSocket,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("Not initialized");
  }
  return context;
};
