import { messages, type Message, type InsertMessage } from "@shared/schema";

export interface IStorage {
  createMessage(message: InsertMessage, sessionId: string): Promise<Message>;
  getMessages(sessionId: string): Promise<Message[]>;
}

export class MemStorage implements IStorage {
  private sessions: { [key: string]: Message[] };

  constructor() {
    this.sessions = {};
  }

  async createMessage(insertMessage: InsertMessage, sessionId: string): Promise<Message> {
    const messages = this.getMessagesFromSession(sessionId);
    const message: Message = {
      ...insertMessage,
      id: (messages.length +1).toString(),
      createdAt: new Date(),
      recommendations: insertMessage.recommendations || null,
    };
    messages.push(message);
    return message;
  }

  private getMessagesFromSession(sessionId: string): Message[] {
    if (!this.sessions[sessionId]) {
      this.sessions[sessionId] = [];
    }
    return this.sessions[sessionId];
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    return this.getMessagesFromSession(sessionId);
  }
}

export const storage = new MemStorage();