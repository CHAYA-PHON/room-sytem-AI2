import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

// Enable body parsing
app.use(express.json({ limit: "10mb" }));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// AI Analytics endpoint using Gemini API
app.post("/api/ai/analyze-trends", async (req, res) => {
  let apiKey = (req.headers["x-gemini-api-key"] as string) || process.env.GEMINI_API_KEY;
  const authHeader = req.headers["authorization"];
  let accessToken = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    accessToken = authHeader.substring(7);
  }

  const hasApiKey = apiKey && !apiKey.includes("MY_GEMINI_API_KEY");
  const hasAccessToken = !!accessToken;

  if (!hasApiKey && !hasAccessToken) {
    return res.status(400).json({
      error: "MISSING_API_KEY",
      message: "ไม่พบคีย์ความลับ GEMINI_API_KEY หรือบัญชี Google เชื่อมต่อ โปรดเชื่อมต่อบัญชี Google ของคุณ หรือระบุ Gemini API Key ส่วนตัวเพื่อเปิดใช้งานการวิเคราะห์",
    });
  }

  try {
    const { rooms = [], bills = [], meters = [], payments = [], selectedRoomIds = [], previousAnalysis = null } = req.body;

    // Prepare dense and useful context for Gemini
    const systemInstruction = `คุณเป็นระบบปัญญาประดิษฐ์ (AI Analytics Expert) ประจำระบบนิติบุคคลและบริหารจัดการหอพัก "SABAIDEE DORM"
ทำหน้าที่วิเคราะห์พฤติกรรมการใช้น้ำและไฟฟ้าของแต่ละห้องพัก, คำนวณค่าเฉลี่ย, คาดการณ์การใช้งานในรอบเดือนถัดไป, วิเคราะห์ประวัติชำระเงินล่าช้า/ความเสี่ยงค้างจ่าย และเปรียบเทียบพฤติกรรมระหว่างห้องพักที่เลือกอย่างตรงไปตรงมา

ให้วิเคราะห์โดยอ้างอิงจากข้อมูลหอพักที่ถูกส่งเข้าไปอย่างเป็นระบบ โดยคำตอบทั้งหมดต้องเป็นภาษาไทยที่อ่านเข้าใจง่าย กระชับ และสุภาพ`;

    const prompt = `ข้อมูลปัจจุบันของหอพักประกอบด้วย:

1. ข้อมูลห้องพัก (Rooms):
${JSON.stringify(rooms, null, 2)}

2. ประวัติมิเตอร์ น้ำและไฟ (Meter Readings):
${JSON.stringify(meters, null, 2)}

3. ประวัติบิลสรุปแต่ละเดือน (Bills):
${JSON.stringify(bills, null, 2)}

4. ประวัติการชำระเงิน (Payments):
${JSON.stringify(payments, null, 2)}

5. รายชื่อห้องพักที่เลือกเปรียบเทียบเป็นพิเศษ (Selected Rooms for Comparison):
${JSON.stringify(selectedRoomIds, null, 2)}

${previousAnalysis ? `6. ผลการวิเคราะห์อัจฉริยะครั้งล่าสุดที่ผ่านมา (Previous Analysis for Reference Context):
${JSON.stringify(previousAnalysis, null, 2)}

(สำคัญมาก: ข้อมูลผลวิเคราะห์เดิมด้านบนนี้มีไว้เพื่อให้ระบบวิเคราะห์เปรียบเทียบหาแนวโน้มพฤติกรรมที่เปลี่ยนแปลงไปของหอพักในรอบนี้)` : ""}

คำสั่ง:
จงดำเนินการคำนวณและวิเคราะห์ด้านล่างนี้ตามจริง โดยคืนผลลัพธ์เป็นโครงสร้าง JSON ตามที่กำหนดเท่านั้น ห้ามพิมพ์อารัมภบทหรือเนื้อหาภายนอก JSON เด็ดขาด:
- หาค่าเฉลี่ยหน่วยการใช้น้ำ, ค่าน้ำ, หน่วยการใช้ไฟ, ค่าไฟฟ้า ของแต่ละห้องจากประวัติมิเตอร์/บิลย้อนหลังที่มีทั้งหมด
- ประเมินแนวโน้ม (Trend: "increasing" | "decreasing" | "stable") พร้อมคาดการณ์ปริมาณการใช้ในงวดถัดไป และเขียนคำอธิบายแนวโน้มการใช้พลังงานในห้องนั้น โดยหากมีผลวิเคราะห์เดิม (Previous Analysis) ร่วมด้วย กรุณานำมาเปรียบเทียบเป้าหมายการประหยัดพลังงานหรือความเปลี่ยนแปลงด้านพฤติกรรมให้ชัดเจน
- ประเมินพฤติกรรมการจ่ายเงินค้างชำระ: ตรวจสอบความถี่และงวดการค้างชำระ รวมถึงการชำระเงินของแต่ละห้องและระบุความเสี่ยง (riskLevel: "low" | "medium" | "high") พร้อมเหตุผลเชิงสถิติ (เช่น ห้องนี้ค้างค่าเช่าติดต่อกัน หรือจ่ายช้าหลังจากวันที่ 5) โดยเชื่อมโยงกับวินัยเดิมในประวัติอ้างอิง (ถ้ามี) ว่าดีขึ้นหรือแย่ลงอย่างไร
- หากมี Selected Rooms for Comparison ให้เปรียบเทียบความแตกต่างด้านการใช้พลังงานและวินัยทางการเงินระหว่างห้องพักเหล่านั้นอย่างชัดเจน
- สรุปภาพรวมหอพักทั้งหมดพร้อมคำแนะนำสำหรับเจ้าของหอพักในการประหยัดพลังงานหรือปรับปรุงประสิทธิภาพการบริหารจัดการยอดค้างชำระ โดยวิเคราะห์เจาะจงเปรียบเทียบกับภาพรวมในผลวิเคราะห์เดิมว่าทิศทางการบริหารดีขึ้นหรือเสี่ยงขึ้นในจุดใด`;

    // Define strict response schema for reliable JSON return
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        averages: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              roomId: { type: Type.STRING },
              roomName: { type: Type.STRING },
              avgWaterUnits: { type: Type.NUMBER, description: "เฉลี่ยหน่วยค่าน้ำที่ใช้ต่อเดือน" },
              avgWaterCost: { type: Type.NUMBER, description: "เฉลี่ยเงินค่าน้ำต่อเดือน" },
              avgElecUnits: { type: Type.NUMBER, description: "เฉลี่ยหน่วยค่าไฟที่ใช้ต่อเดือน" },
              avgElecCost: { type: Type.NUMBER, description: "เฉลี่ยเงินค่าไฟต่อเดือน" }
            },
            required: ["roomId", "roomName", "avgWaterUnits", "avgWaterCost", "avgElecUnits", "avgElecCost"]
          }
        },
        trends: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              roomId: { type: Type.STRING },
              roomName: { type: Type.STRING },
              waterTrend: { type: Type.STRING, description: "increasing, decreasing, หรือ stable" },
              elecTrend: { type: Type.STRING, description: "increasing, decreasing, หรือ stable" },
              predictedWaterNextMonth: { type: Type.NUMBER, description: "คาดการณ์หน่วยน้ำที่จะใช้ในเดือนหน้า" },
              predictedElecNextMonth: { type: Type.NUMBER, description: "คาดการณ์หน่วยไฟที่จะใช้ในเดือนหน้า" },
              trendNarrative: { type: Type.STRING, description: "คำอธิบายแนวโน้มพลังงานและการใช้งาน สรุปสั้นๆ ในห้องนี้" }
            },
            required: ["roomId", "roomName", "waterTrend", "elecTrend", "predictedWaterNextMonth", "predictedElecNextMonth", "trendNarrative"]
          }
        },
        latePaymentAnalysis: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              roomId: { type: Type.STRING },
              roomName: { type: Type.STRING },
              paymentStatusSummary: { type: Type.STRING, description: "สรุปวินัยชำระเงินของห้องนี้" },
              riskLevel: { type: Type.STRING, description: "low, medium, หรือ high" },
              riskDetails: { type: Type.STRING, description: "คำอธิบายความเสี่ยงและการชำระเงินล่าช้าของห้องนี้" }
            },
            required: ["roomId", "roomName", "paymentStatusSummary", "riskLevel", "riskDetails"]
          }
        },
        roomComparison: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              roomId: { type: Type.STRING },
              roomName: { type: Type.STRING },
              comparisonTag: { type: Type.STRING, description: "ป้ายวิเคราะห์ เช่น 'กินไฟสูงสุด', 'ประหยัดน้ำที่สุด', 'จ่ายตรงเวลาดีเด่น'" },
              comparisonMetric: { type: Type.STRING, description: "คำอธิบายการเปรียบเทียบและข้อสังเกตของห้องนี้เมื่อเทียบกับห้องอื่นที่ถูกเลือก" }
            },
            required: ["roomId", "roomName", "comparisonTag", "comparisonMetric"]
          }
        },
        overallSummary: {
          type: Type.STRING,
          description: "บทสรุปภาพรวมและคำแนะนำเชิงกลยุทธ์สำหรับการบริหารจัดการหอพักในรูปแบบวรรคข้อความภาษาไทย"
        }
      },
      required: ["averages", "trends", "latePaymentAnalysis", "roomComparison", "overallSummary"]
    };

    let parsedAnalysis: any = null;

    if (hasAccessToken) {
      // Direct REST call with OAuth access token
      const modelsToTry = ["gemini-1.5-flash", "gemini-2.5-flash"];
      let lastError: any = null;

      for (const model of modelsToTry) {
        try {
          console.log(`Calling Gemini REST API via OAuth token using model: ${model}`);
          const restResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: { parts: [{ text: systemInstruction }] },
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema,
                temperature: 0.1,
              }
            })
          });

          if (!restResponse.ok) {
            const errText = await restResponse.text();
            throw new Error(`Google API status ${restResponse.status}: ${errText}`);
          }

          const responseData = await restResponse.json();
          const jsonText = responseData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
          parsedAnalysis = JSON.parse(jsonText);
          break; // successfully parsed!
        } catch (err: any) {
          lastError = err;
          console.warn(`OAuth model ${model} failed:`, err.message || err);
        }
      }

      if (!parsedAnalysis) {
        throw lastError || new Error("ล้มเหลวในการสร้างเนื้อหาวิเคราะห์ผ่านบัญชี Google");
      }
    } else {
      // Initialize Gemini SDK with custom user agent header for API Key
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const response = await (async () => {
        const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest"];
        let lastError: any = null;

        for (const model of modelsToTry) {
          let attempts = 0;
          const maxAttempts = 2;
          
          while (attempts < maxAttempts) {
            try {
              console.log(`Calling Gemini API using model: ${model} (Attempt ${attempts + 1}/${maxAttempts})`);
              const res = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                  systemInstruction,
                  responseMimeType: "application/json",
                  responseSchema,
                  temperature: 0.1,
                },
              });
              return res;
            } catch (err: any) {
              attempts++;
              lastError = err;
              console.warn(`Attempt ${attempts} failed for model ${model}:`, err.message || err);
              
              const isTransient = err.status === 503 || err.status === 429 || 
                                  (err.message && (err.message.includes("503") || err.message.includes("429") || err.message.includes("UNAVAILABLE")));
              
              if (isTransient && attempts < maxAttempts) {
                const delay = attempts * 1000;
                console.log(`Transient error. Waiting ${delay}ms before retrying...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
              } else {
                break;
              }
            }
          }
        }
        throw lastError;
      })();

      const jsonText = response.text?.trim() || "{}";
      parsedAnalysis = JSON.parse(jsonText);
    }

    return res.json(parsedAnalysis);
  } catch (err: any) {
    console.error("AI Analysis error:", err);
    return res.status(500).json({
      error: "AI_PROCESSING_ERROR",
      message: "เกิดข้อผิดพลาดในการประมวลผลการวิเคราะห์ด้วย AI: " + err.message,
    });
  }
});

// Helper to construct Google OAuth Redirect URI
const getRedirectUri = (req: express.Request) => {
  const host = req.get("host") || "localhost:3000";
  // Always use https on Cloud Run or in production, http for local dev
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}/auth/callback`;
};

// 1. Route to get Google Auth URL
app.get("/api/auth/url", (req, res) => {
  const redirectUri = getRedirectUri(req);
  const clientId = process.env.OAUTH_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({
      error: "OAUTH_NOT_CONFIGURED",
      message: "ระบบยังไม่ได้เปิดใช้งาน OAuth Client ID ในตัวเลือกหลังบ้าน กรุณาติดต่อผู้พัฒนา",
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/cloud-platform",
    access_type: "offline",
    prompt: "consent",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url: authUrl });
});

// 2. Google OAuth Callback Endpoint
app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${error}' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication failed: ${error}. This window should close automatically.</p>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send("Authorization code is missing.");
  }

  try {
    const redirectUri = getRedirectUri(req);
    
    // Exchange Auth Code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.OAUTH_CLIENT_ID!,
        client_secret: process.env.OAUTH_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Failed to exchange code: ${errText}`);
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // Get User Profile using the access token
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let profile = { name: "Google User", email: "", picture: "" };
    if (userinfoResponse.ok) {
      profile = await userinfoResponse.json();
    }

    // Send access token and profile info to the parent window
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                accessToken: '${accessToken}',
                profile: ${JSON.stringify(profile)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>เชื่อมต่อสำเร็จ! กำลังปิดหน้าต่างนี้อัตโนมัติ...</p>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("OAuth callback exchange error:", err);
    res.status(500).send(`Authentication error: ${err.message || err}`);
  }
});


// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode with Vite Middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated successfully.");
  } else {
    // Production Mode serving static files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static server configured.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express application successfully booted on host 0.0.0.0, listening on port ${PORT}`);
  });
}

// Only start the server listening if we are not running on Vercel
if (!process.env.VERCEL) {
  startServer();
}

export default app;
