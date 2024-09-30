"use client";
import { baseUrl } from "@/constant";
import { useSocketContext } from "@/useSocket";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  params: {
    username: string;
  };
};

export default function page({ params }: Props) {
  const { username } = params;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Array<string>>([]);
  const [busy, setBusy] = useState<Array<string>>([]);
  const router = useRouter();
  const [receivedRequest, setReceivedRequest] = useState("");
  const [requestSent, setRequestSent] = useState("");
  const { connectToSocket, disconnectSocket, isConnected, socket } =
    useSocketContext();
  // const [timer, setTimer] = useState<undefined | NodeJS.Timeout>();

  const getUsers = async () => {
    setError("");
    try {
      setLoading(true);
      const res = await fetch(baseUrl + "/joined-users", {
        method: "GET",
      });

      const data: any = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setBusy(data.busy);
      setUsers(data.users);
    } catch (error: any) {
      setError(error?.message ?? error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isConnected) {
      connectToSocket(username);
    }
    getUsers();
    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    console.log(socket?.id);
    if (socket) {
      socket.on("users", (users) => {
        setUsers(users);
      });
      socket.on("busy", (users) => {
        setBusy(users);
      });
      socket.on("request", (users) => {
        if (!receivedRequest) {
          setReceivedRequest(users);
        }
      });
      socket.on("response", async (answer: "accept" | "deny", user) => {
        console.log("🚀 ~ socket.on ~ answer:", answer, user);
        if (answer === "accept") {
          await handleGoToGameRoom(user);
          setRequestSent("");
        } else {
          setRequestSent("");
        }
      });
    }
    () => {
      if (socket) {
        socket.off("users");
        socket.off("users");
        socket.off("request");
        socket.off("response");
      }
    };
  }, [socket?.id]);

  const handleRequest = (user: string) => {
    console.log("🚀 ~ handleRequest ~ user:", user);
    if (socket) {
      setRequestSent(user);
      socket.emit("request", user);
    }
  };

  useEffect(() => {
    if (receivedRequest) {
      localStorage.setItem("receivedRequest", receivedRequest);
    }
  }, [receivedRequest]);

  const handleRequestAccept = async () => {
    console.log("1", receivedRequest);
    socket?.emit("response", "accept", receivedRequest);
    await handleGoToGameRoom(receivedRequest);
    setReceivedRequest("");
  };

  const handleRequestDeny = () => {
    socket?.emit("response", "deny", receivedRequest);
    setReceivedRequest("");
  };

  const handleGoToGameRoom = async (user: string) => {
    console.log("🚀 ~ handleGoToGameRoom ~ user:", user)
    socket?.emit("joinRoom", user, (room: string) => {
      console.log("🚀 ~ socket?.emit ~ room:", room);
      router.push("/" + username + "/" + room);
    });
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-center">loading...</h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col relative">
      <div className="font-bold underline">
        <button
          onClick={() => {
            console.log("Back");
            window.sessionStorage?.removeItem("username");
            router.push("/");
          }}
        >
          Go back
        </button>
      </div>
      {receivedRequest && (
        <div className="absolute w-full h-screen flex bg-slate-700/50 justify-center items-center">
          <div className="border p-4">
            <p>You have received request from {receivedRequest}</p>
            <div className="flex gap-2 justify-center">
              <button className=" border p-2" onClick={handleRequestAccept}>
                accept
              </button>
              <button className=" border p-2" onClick={handleRequestDeny}>
                deny
              </button>
            </div>
          </div>
        </div>
      )}
      {requestSent && (
        <div className="absolute w-full h-screen flex bg-slate-700/50 justify-center items-center">
          <div className="border p-4">
            waiting for response from {requestSent}
          </div>
        </div>
      )}
      {isConnected && (
        <p className="text-center"> You are connected to server</p>
      )}
      <div className="border my-2">
        <h1 className="font-bold text-center py-2">Online users</h1>
        <div className="flex flex-col gap-2 divide-y border-t">
          {users
            .filter((user) => user !== username)
            .map((user) => {
              return (
                <div
                  key={user}
                  className="p-2 flex justify-between items-center"
                >
                  <p>{user}</p>
                  {busy.includes(user) ? (
                    <p>busy</p>
                  ) : (
                    <button
                      className="underline"
                      onClick={() => handleRequest(user)}
                    >
                      Request
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
