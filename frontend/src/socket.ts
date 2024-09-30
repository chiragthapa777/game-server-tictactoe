"use client";

import { io } from "socket.io-client";
import { baseUrl } from "./constant";

export const socket = io(baseUrl);
