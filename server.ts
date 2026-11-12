import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { initializeApp as initializeAdminApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  app.use(express.json());

  try {
    if (!getApps().length) {
      initializeAdminApp({
        credential: applicationDefault(),
        projectId: firebaseConfig.projectId
      });
    }
  } catch (err) {
    console.warn("Firebase Admin initialization fallback:", err);
    try {
      if (!getApps().length) {
        initializeAdminApp({ projectId: firebaseConfig.projectId });
      }
    } catch (innerErr) {
      console.warn("Firebase Admin could not be initialized:", innerErr);
    }
  }

  // Lazy initialization for AI client
  let aiClient: GoogleGenAI | null = null;
  function getAiInstance(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.KULTIQGeminiAPIKey;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is required');
      }
      aiClient = new GoogleGenAI({ apiKey });
    }
    return aiClient;
  }

  app.get('/api/admin/users', async (req, res) => {
    try {
       const idToken = req.headers.authorization?.split('Bearer ')[1];
       if (!idToken) return res.status(401).json({ error: 'Unauthorized' });
       
       const adminAuth = getAdminAuth();
       const decodedToken = await adminAuth.verifyIdToken(idToken);
       if (decodedToken.email !== 'awtrp1@gmail.com') return res.status(403).json({ error: 'Forbidden' });

       const listUsersResult = await adminAuth.listUsers();
       res.json(listUsersResult.users);
    } catch (e: any) {
       res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const ai = getAiInstance();
      const { museumInfo, ratings, comments, CATEGORIES, C_DATA, categoryScores, overallScore, isDemo } = req.body;
      
      const relevantCategories = isDemo 
        ? CATEGORIES.filter((c: string) => ["Strategie/Ausrichtung", "Marketing/Publikumsorientierung"].includes(c)) 
        : CATEGORIES;

      const detailContext = relevantCategories.map((cat: string) => {
        const crits = Object.entries(C_DATA[cat].criteria).map(([crit, desc]) => {
            const val = ratings[`${cat}-${crit}`];
            const comm = comments[`${cat}-${crit}`];
            return `  - ${crit}: ${val > 0 ? val : 'Nicht bewertet'}${comm ? ` (Kommentar: ${comm})` : ''}`;
        }).join('\n');
        return `${cat} (Durchschnitt: ${categoryScores[cat].toFixed(2)}):\n${crits}`;
      }).join('\n\n');

      let prompt = `Du bist ein hochspezialisierter Fachauditor für Museen und Kultureinrichtungen. 
      Erstelle eine detaillierte, professionelle Analyse für das Museum "${museumInfo.name}".
      Gesamtbewertung: ${overallScore.toFixed(2)} von 5.0 Punkten.
      Hier sind die Ergebnisse der einzelnen Kategorien:\n\n${detailContext}\n\n`;

      if (isDemo) {
        prompt += `WICHTIGER HINWEIS ZUR DEMO-VERSION: 
        Dies ist nur ein Quick-Check (2 von 10 Kategorien). 
        Fasse die Analyse kürzer. 
        Weise im Text (summary) am Ende ausdrücklich darauf hin, dass dies nur eine Kurzanalyse war und die Vollversion eine detaillierte 360°-Analyse inklusive Budgetplanung und SWOT-Auswertung bietet. Mache einen klaren Call-to-Action!\n\n`;
      }

      prompt += `Anforderungen:
      1. Verfasse eine ausführliche, strategische Zusammenfassung (summary). Strukturiere diesen Text zwingend mit sinnvollen Markdown-Zwischenüberschriften (###) und Absätzen, um die Lesbarkeit zu maximieren.
      2. Erstelle konkrete Handlungsempfehlungen (recommendations).
      3. Schlage passende Beratungsleistungen vor (consulting).
      4. Führe eine SWOT-Analyse durch.
      Antworte ausschließlich im JSON-Format gemäß dem vorgegebenen Schema.`;

      const resAi = await ai.models.generateContent({
          model: "gemini-3.5-flash", // Updated to supported model
          contents: prompt,
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      summary: { type: Type.STRING },
                      recommendations: { 
                          type: Type.ARRAY, 
                          items: { 
                              type: Type.OBJECT, 
                              properties: { 
                                  area: { type: Type.STRING }, 
                                  items: { type: Type.ARRAY, items: { type: Type.STRING } } 
                              },
                              required: ["area", "items"]
                          } 
                      },
                      consulting: { 
                          type: Type.ARRAY, 
                          items: { 
                              type: Type.OBJECT, 
                              properties: { 
                                  area: { type: Type.STRING }, 
                                  items: { type: Type.ARRAY, items: { type: Type.STRING } } 
                              },
                              required: ["area", "items"]
                          } 
                      },
                      swot: { 
                          type: Type.OBJECT, 
                          properties: { 
                              strengths: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                              opportunities: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                              threats: { type: Type.ARRAY, items: { type: Type.STRING } } 
                          },
                          required: ["strengths", "weaknesses", "opportunities", "threats"]
                      }
                  },
                  required: ["summary", "recommendations", "consulting", "swot"]
              }
          }
      });

      if (resAi.text) {
          res.json(JSON.parse(resAi.text));
      } else {
          throw new Error("Keine Antwort von der KI erhalten.");
      }
    } catch (e) { 
      console.error("AI Generation Error:", e); 
      res.status(500).json({ error: e.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    // SPA fallback
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
