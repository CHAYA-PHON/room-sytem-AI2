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
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.includes("MY_GEMINI_API_KEY")) {
    return res.status(400).json({
      error: "MISSING_API_KEY",
      message: "ไม่พบคีย์ความลับ GEMINI_API_KEY ในระบบความปลอดภัย โปรดเพิ่มคีย์ในเมนู Settings > Secrets เพื่อเปิดใช้งานคุณสมบัติวิเคราะห์ด้วย AI",
    });
  }

  try {
    const { rooms = [], bills = [], meters = [], payments = [], selectedRoomIds = [] } = req.body;

    // Initialize Gemini SDK with custom user agent header as required by rules
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

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

คำสั่ง:
จงดำเนินการคำนวณและวิเคราะห์ด้านล่างนี้ตามจริง โดยคืนผลลัพธ์เป็นโครงสร้าง JSON ตามที่กำหนดเท่านั้น ห้ามพิมพ์อารัมภบทหรือเนื้อหาภายนอก JSON เด็ดขาด:
- หาค่าเฉลี่ยหน่วยการใช้น้ำ, ค่าน้ำ, หน่วยการใช้ไฟ, ค่าไฟฟ้า ของแต่ละห้องจากประวัติมิเตอร์/บิลย้อนหลังที่มีทั้งหมด
- ประเมินแนวโน้ม (Trend: "increasing" | "decreasing" | "stable") พร้อมคาดการณ์ปริมาณการใช้ในงวดถัดไป และเขียนคำอธิบายแนวโน้มการใช้พลังงานในห้องนั้น
- ประเมินพฤติกรรมการจ่ายเงินค้างชำระ: ตรวจสอบความถี่และงวดการค้างชำระ รวมถึงการชำระเงินของแต่ละห้องและระบุความเสี่ยง (riskLevel: "low" | "medium" | "high") พร้อมเหตุผลเชิงสถิติ (เช่น ห้องนี้ค้างค่าเช่าติดต่อกัน หรือจ่ายช้าหลังจากวันที่ 5)
- หากมี Selected Rooms for Comparison ให้เปรียบเทียบความแตกต่างด้านการใช้พลังงานและวินัยทางการเงินระหว่างห้องพักเหล่านั้นอย่างชัดเจน
- สรุปภาพรวมหอพักทั้งหมดพร้อมคำแนะนำสำหรับเจ้าของหอพักในการประหยัดพลังงานหรือปรับปรุงประสิทธิภาพการบริหารจัดการยอดค้างชำระ`;

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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1, // low temperature for precise analytics & mathematical calculations
      },
    });

    const jsonText = response.text?.trim() || "{}";
    const parsedAnalysis = JSON.parse(jsonText);

    return res.json(parsedAnalysis);
  } catch (err: any) {
    console.error("AI Analysis error:", err);
    return res.status(500).json({
      error: "AI_PROCESSING_ERROR",
      message: "เกิดข้อผิดพลาดในการประมวลผลการวิเคราะห์ด้วย AI: " + err.message,
    });
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

startServer();
