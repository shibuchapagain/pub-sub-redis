export interface IPubSub {
  publish(message: PublishMessage): Promise<void>;
  subscribe(topic: string, callback: (message: string) => void): Promise<void>;
}

export interface PublishMessage {
  topic: string;
  message: string;
}

export interface SubscribeMessage {
  action: "subscribe";
  topic: string;
  token: string;
}

export interface ClientMessage {
  action: "subscribe" | "publish";
  topic: string;
  message?: string;
  token: string;
}

export interface DecodedToken {
  userId: string;
}
