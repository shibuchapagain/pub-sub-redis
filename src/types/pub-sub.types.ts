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
  action: "subscribe" | "publish"; // Add 'publish' action if needed
  topic: string;
  message?: string; // Make message optional for subscribe
  token: string;
}

export interface DecodedToken {
  userId: string;
}
