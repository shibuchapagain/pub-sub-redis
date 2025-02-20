import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { createClient } from "redis";
import { WebSocketServer, WebSocket, RawData } from "ws";

import {
  IPubSub,
  DecodedToken,
  ClientMessage,
  PublishMessage,
} from "./types/pub-sub.types";

import {
  SocketError,
  AuthenticationError,
  ConnectionFailError,
  MessagePublishError,
} from "./utils/errors";

dotenv.config();

export class PubSub implements IPubSub {
  private wss: WebSocketServer;
  private redisPublisher: ReturnType<typeof createClient>;
  private redisSubscriber: ReturnType<typeof createClient>;
  private activeClients = new Map<string, WebSocket>();
  private JWT_SECRET: string;

  constructor(wsPort: number, redisUrl: string, jwtSecret: string) {
    this.JWT_SECRET = jwtSecret;
    this.wss = new WebSocketServer({ port: wsPort });
    this.redisPublisher = createClient({ url: redisUrl });
    this.redisSubscriber = createClient({ url: redisUrl });

    this.initialize();
  }

  private async connectRedis() {
    try {
      await this.redisPublisher.connect();
      await this.redisSubscriber.connect();
      console.log("Connected to Redis successfully.");
    } catch (error) {
      throw new ConnectionFailError(`Failed to connect to Redis: ${error}`);
    }
  }

  private initialize() {
    this.connectRedis()
      .then(() => {
        this.wss.on("connection", (socket) => this.handleConnection(socket));
        console.log(
          `WebSocket Server running on ws://localhost:${this.wss.options.port}`
        );
      })
      .catch((error) => {
        // throw new ConnectionFailError(`Failed to initialize PubSub: ${error}`);
        process.exit(1);
      });
  }

  private handleConnection(socket: WebSocket) {
    console.log("New WebSocket client connected.");

    socket.on("message", (data) => this.handleMessage(socket, data));

    socket.on("close", () => this.handleDisconnect(socket));

    socket.on("error", (error) => {
      this.handleDisconnect(socket);
      throw new ConnectionFailError(`WebSocket error: ${error}`);
    });
  }

  private async handleMessage(socket: WebSocket, data: RawData) {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      const { action, topic, token } = message;

      if (!token) {
        this.sendError(socket, "Authentication required.");
        return;
      }

      const decoded = this.verifyToken(token);

      if (action === "subscribe") {
        this.handleSubscribe(socket, decoded.userId, topic);
      } else if (action === "publish" && message.message) {
        this.handlePublish(socket, decoded.userId, topic, message.message);
      } else {
        this.sendError(
          socket,
          "Invalid action or missing message for publish."
        );
      }
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        this.sendError(socket, "Invalid token.");
      } else if (error instanceof SyntaxError) {
        this.sendError(socket, "Invalid JSON message.");
      } else {
        console.error("Error handling message:", error);
        this.sendError(socket, "An unexpected error occurred.");
      }
    }
  }

  private handlePublish(
    socket: WebSocket,
    userId: string,
    topic: string,
    message: string
  ) {
    try {
      this.redisPublisher.publish(topic, message);
      console.log(`User ${userId} published "${message}" to topic "${topic}"`);
      socket.send(
        JSON.stringify({ status: "Message published successfully!" })
      );
    } catch (error) {
      this.sendError(socket, "Failed to publish message.");
    }
  }

  private handleSubscribe(socket: WebSocket, userId: string, topic: string) {
    this.activeClients.set(userId, socket);

    this.redisSubscriber.subscribe(topic, (msg) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ topic, message: msg }));
      }
    });
  }

  private handleDisconnect(socket: WebSocket) {
    for (const [userId, ws] of this.activeClients.entries()) {
      if (ws === socket) {
        this.activeClients.delete(userId);
      }
    }
  }

  private verifyToken(token: string): DecodedToken {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);
      return decoded as DecodedToken;
    } catch (error) {
      throw new AuthenticationError(`Failed to verify token: ${error}`);
    }
  }

  private sendError(socket: WebSocket, message: string) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ error: message }));
      throw new SocketError(message);
    }
  }

  public async publish(message: PublishMessage) {
    try {
      await this.redisPublisher.publish(message.topic, message.message);
    } catch (error) {
      throw new MessagePublishError(`Failed to publish message: ${error}`);
    }
  }

  public async subscribe(topic: string, callback: (message: string) => void) {
    try {
      await this.redisSubscriber.subscribe(topic, (message) => {
        callback(message);
      });
    } catch (error) {
      throw new MessagePublishError(`Failed to subscribe to topic: ${error}`);
    }
  }
}
