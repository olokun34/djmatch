import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import { generateRecommendations } from "./lib/openai";
import {v4 as uuidv4} from 'uuid';

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/messages", async (req, res) => {
    try {
      console.log("Received message request:", req.body);
      const sessionId = req.headers['x-session-id'] as string || uuidv4();
      req.headers['x-session-id'] = sessionId;


      const userMessage = insertMessageSchema.parse({
        content: req.body.content,
        role: "user",
        sessionId: sessionId
      });

      console.log("Parsed user message:", userMessage);
      const savedUserMessage = await storage.createMessage(userMessage);

      // Get AI response
      try {
        console.log("Generating AI recommendations...");
        const recommendations = await generateRecommendations(req.body.content);
        console.log("AI recommendations generated:", recommendations);

        const aiMessage = insertMessageSchema.parse({
          content: recommendations.response,
          role: "assistant",
          recommendations: recommendations.tracks,
          sessionId: sessionId
        });

        const savedAiMessage = await storage.createMessage(aiMessage);
        res.json({ userMessage: savedUserMessage, aiMessage: savedAiMessage });
      } catch (error: any) {
        console.error("Error generating AI response:", error);

        // Mensaje más amigable basado en el tipo de error
        let errorMessage = "Lo siento, no pude generar recomendaciones en este momento. ";

        if (error.message?.includes("402")) {
          errorMessage += "El servicio de IA está temporalmente no disponible. Estamos trabajando en solucionarlo.";
        } else if (error.message?.includes("API error")) {
          errorMessage += "Hubo un problema de conexión con el servicio de IA. Por favor, intenta de nuevo en unos momentos.";
        } else {
          errorMessage += "Por favor, intenta de nuevo más tarde.";
        }

        const errorResponse = insertMessageSchema.parse({
          content: errorMessage,
          role: "assistant",
          recommendations: null,
          sessionId: sessionId
        });

        const savedErrorMessage = await storage.createMessage(errorResponse);
        res.status(500).json({ userMessage: savedUserMessage, aiMessage: savedErrorMessage });
      }
    } catch (error: any) {
      console.error("Error processing message:", error);
      const errorMessage = error instanceof Error ? error.message : "Ha ocurrido un error inesperado";
      res.status(400).json({ error: errorMessage });
    }
  });

  app.get("/api/messages", async (req, res) => {
    const sessionId = req.headers['x-session-id'] as string;
    const messages = await storage.getMessages(sessionId);
    res.json(messages);
  });

  const httpServer = createServer(app);
  return httpServer;
}