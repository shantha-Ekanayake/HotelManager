import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerHMSRoutes } from "./hms-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register all HMS routes
  registerHMSRoutes(app);

  // Placeholder/utility routes
  app.get("/api/placeholder/:width/:height", (req, res) => {
    const { width, height } = req.params;
    const size = `${width}x${height}`;
    res.type("svg").send(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#e0e0e0"/>
        <text x="50%" y="50%" font-family="Arial" font-size="12" fill="#666" text-anchor="middle" dy=".3em">${size}</text>
      </svg>
    `);
  });

  const httpServer = createServer(app);
  return httpServer;
}
