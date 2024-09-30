"use client";

import { baseUrl } from "@/constant";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function Home() {
  const [userName, setUserName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEnterGame = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!userName) {
      setError("Enter username");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(baseUrl + "/join-app", {
        body: JSON.stringify({ username: userName }),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data: any = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      sessionStorage.setItem("username", userName);

      router.push("/" + userName);
    } catch (error: any) {
      setError(error?.message ?? error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userName = sessionStorage.getItem("username");
    if (userName) {
      router.push("/" + userName);
    }
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-center">loading...</h1>
      </div>
    );
  }

  return (
    <div className="h-full flex justify-center items-center">
      <div className="flex flex-col gap-4">
        <h1 className="text-xl">Welcome to multiplayer tic tac toe game</h1>
        {error && <p className="text-red-500 p-2">Error : {error}</p>}
        <form action="" className="flex flex-col gap-2">
          <div className=" flex flex-col gap-1">
            <label htmlFor="username">Enter a user name</label>
            <input
              type="text"
              name=""
              id="username"
              placeholder="chirag"
              className="border p-2"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>
          <button
            className="p-2 text-center w-full font-bold bg-black text-white"
            onClick={handleEnterGame}
          >
            Enter game
          </button>
        </form>
      </div>
    </div>
  );
}
