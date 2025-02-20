import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Recommendation } from "@shared/schema";

interface AIResponse {
  response: string;
  tracks: Recommendation[];
}

export async function generateRecommendations(userInput: string): Promise<AIResponse> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("API error: No se ha configurado la API key de Google Gemini");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Eres djMatch, un asistente DJ profesional especializado en música y mezclas.

    Responde siempre en este formato JSON:
    {
      "response": "Tu respuesta aquí",
      "tracks": []
    }

    Directrices:
    - Recomienda canciones específicas con detalles técnicos (BPM, tonalidad)
    - Para cada recomendación en tracks, incluye:
      * title: título de la canción
      * artist: nombre del artista
      * genre: género musical
      * bpm: beats por minuto (número)
      * key: tonalidad
      * reason: razón de la recomendación
      * spotify_url: enlace de Spotify de la canción (opcional)
    - Si la pregunta no es sobre música, responde con tracks vacío

    Usuario pregunta: ${userInput}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const parsedContent = JSON.parse(text);

      if (!parsedContent.response || !Array.isArray(parsedContent.tracks)) {
        throw new Error("Formato de respuesta inválido");
      }

      return {
        response: parsedContent.response,
        tracks: parsedContent.tracks.map((track: any) => ({
          title: String(track.title || ""),
          artist: String(track.artist || ""),
          genre: String(track.genre || ""),
          bpm: track.bpm ? Number(track.bpm) : undefined,
          key: track.key ? String(track.key) : undefined,
          reason: track.reason ? String(track.reason) : undefined,
          spotify_url: track.title && track.artist ? `https://open.spotify.com/search/${encodeURIComponent(`${track.title} ${track.artist}`)}` : undefined,
          youtube_url: track.title && track.artist ? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.title} ${track.artist}`)}` : undefined,
          tidal_url: track.title && track.artist ? `https://listen.tidal.com/search?q=${encodeURIComponent(`${track.title} ${track.artist}`)}` : undefined
        }))
      };
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return {
        response: "Lo siento, hubo un problema procesando la respuesta. Por favor, intenta de nuevo.",
        tracks: []
      };
    }
  } catch (error) {
    console.error("Error generating recommendations:", error);
    throw error;
  }
}