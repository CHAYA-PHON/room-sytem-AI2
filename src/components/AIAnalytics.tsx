import React, { useState } from "react";
import { Room, Bill, MeterReading, PaymentRecord } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Cpu, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Gauge, 
  Droplet, 
  Zap, 
  DollarSign,
  Activity,
  Layers,
  HelpCircle,
  Clock,
  Key,
  Eye,
  EyeOff
} from "lucide-react";

interface AIAnalyticsProps {
  rooms: Room[];
  bills: Bill[];
  meters: MeterReading[];
  payments: PaymentRecord[];
}

interface AIAverages {
  roomId: string;
  roomName: string;
  avgWaterUnits: number;
  avgWaterCost: number;
  avgElecUnits: number;
  avgElecCost: number;
}

interface AITrend {
  roomId: string;
  roomName: string;
  waterTrend: "increasing" | "decreasing" | "stable" | string;
  elecTrend: "increasing" | "decreasing" | "stable" | string;
  predictedWaterNextMonth: number;
  predictedElecNextMonth: number;
  trendNarrative: string;
}

interface AILatePayment {
  roomId: string;
  roomName: string;
  paymentStatusSummary: string;
  riskLevel: "low" | "medium" | "high" | string;
  riskDetails: string;
}

interface AIRoomComparison {
  roomId: string;
  roomName: string;
  comparisonTag: string;
  comparisonMetric: string;
}

interface AIAnalysisResult {
  averages: AIAverages[];
  trends: AITrend[];
  latePaymentAnalysis: AILatePayment[];
  roomComparison: AIRoomComparison[];
  overallSummary: string;
}

interface GoogleProfile {
  name: string;
  email: string;
  picture: string;
}

export default function AIAnalytics({ rooms, bills, meters, payments }: AIAnalyticsProps) {
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"averages" | "trends" | "payments" | "comparison" | "overall">("averages");

  const [customApiKey, setCustomApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [showApiOption, setShowApiOption] = useState<boolean>(false);

  const [googleUser, setGoogleUser] = useState<GoogleProfile | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Load API Key and Google login on mount
  React.useEffect(() => {
    try {
      const savedKey = localStorage.getItem("sabaidee_dorm_custom_gemini_key") || "";
      setCustomApiKey(savedKey);

      const savedUser = localStorage.getItem("sabaidee_dorm_google_user");
      const savedToken = localStorage.getItem("sabaidee_dorm_google_token");
      if (savedUser && savedToken) {
        setGoogleUser(JSON.parse(savedUser));
        setGoogleToken(savedToken);
      }
    } catch (err) {
      console.error("Error loading saved Gemini API Key or Google login:", err);
    }
  }, []);

  const [cachedData, setCachedData] = useState<{ inputsString: string; result: AIAnalysisResult } | null>(null);
  const [hasDataChanged, setHasDataChanged] = useState<boolean>(false);

  const currentInputsString = JSON.stringify({ rooms, bills, meters, payments, selectedRoomIds });

  // Sync cache and analyze automatic retrieval
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("sabaidee_dorm_ai_analysis_cache");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.inputsString && parsed.result) {
          setCachedData(parsed);
          if (parsed.inputsString === currentInputsString) {
            setAnalysisResult(parsed.result);
            setHasDataChanged(false);
          } else {
            setHasDataChanged(true);
            setAnalysisResult(null); // Clear active result since data changed
          }
        } else {
          setHasDataChanged(false);
        }
      } else {
        setHasDataChanged(false);
      }
    } catch (err) {
      console.error("Error reading AI cache:", err);
    }
  }, [rooms, bills, meters, payments, selectedRoomIds, currentInputsString]);

  // Handle room selection for comparison
  const handleToggleRoom = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
  };

  // Handle Google Login popup flow
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/url");
      if (!response.ok) {
        throw new Error("ล้มเหลวในการดึงลิงก์เชื่อมต่อ Google");
      }
      const data = await response.json();
      
      const width = 500;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        data.url,
        "google-oauth-popup",
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );

      if (!popup) {
        throw new Error("ไม่สามารถเปิดหน้าต่างป๊อปอัปได้ กรุณาปิดการบล็อกป๊อปอัปของเบราว์เซอร์แล้วลองอีกครั้ง");
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
          const { accessToken, profile } = event.data;
          setGoogleUser(profile);
          setGoogleToken(accessToken);
          localStorage.setItem("sabaidee_dorm_google_user", JSON.stringify(profile));
          localStorage.setItem("sabaidee_dorm_google_token", accessToken);
          setIsLoggingIn(false);
          window.removeEventListener("message", handleMessage);
        } else if (event.data?.type === "OAUTH_AUTH_ERROR") {
          setError(`การเชื่อมต่อบัญชีล้มเหลว: ${event.data.error}`);
          setIsLoggingIn(false);
          window.removeEventListener("message", handleMessage);
        }
      };

      window.addEventListener("message", handleMessage);

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsLoggingIn(false);
          window.removeEventListener("message", handleMessage);
        }
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "เกิดข้อผิดพลาดในการเริ่มต้นเชื่อมต่อ Google");
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = () => {
    setGoogleUser(null);
    setGoogleToken(null);
    localStorage.removeItem("sabaidee_dorm_google_user");
    localStorage.removeItem("sabaidee_dorm_google_token");
  };

  // Run AI analysis
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (googleToken) {
        headers["Authorization"] = `Bearer ${googleToken}`;
      } else if (customApiKey.trim()) {
        headers["x-gemini-api-key"] = customApiKey.trim();
      }

      const response = await fetch("/api/ai/analyze-trends", {
        method: "POST",
        headers,
        body: JSON.stringify({
          rooms,
          bills,
          meters,
          payments,
          selectedRoomIds,
          previousAnalysis: cachedData?.result || null
        }),
      });

      const contentType = response.headers.get("content-type");
      let data: any = {};
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || `เซิร์ฟเวอร์ตอบกลับด้วยข้อผิดพลาดสถานะ ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(data.message || "เกิดข้อผิดพลาดในการเรียกใช้ API วิเคราะห์ข้อมูลด้วย AI");
      }

      setAnalysisResult(data);

      // Save to local storage cache
      const cachePayload = {
        inputsString: currentInputsString,
        result: data
      };
      localStorage.setItem("sabaidee_dorm_ai_analysis_cache", JSON.stringify(cachePayload));
      setCachedData(cachePayload);
      setHasDataChanged(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "การเชื่อมต่อเซิร์ฟเวอร์ขัดข้อง โปรดตรวจสอบอินเทอร์เน็ตหรือบัญชีการเชื่อมต่อของคุณ");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper to render trend icons & colors
  const renderTrendBadge = (trend: string) => {
    const cleanTrend = trend.toLowerCase();
    if (cleanTrend.includes("inc") || cleanTrend === "increasing" || cleanTrend.includes("เพิ่ม")) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200">
          <TrendingUp className="w-3.5 h-3.5" /> เพิ่มขึ้น
        </span>
      );
    } else if (cleanTrend.includes("dec") || cleanTrend === "decreasing" || cleanTrend.includes("ลด")) {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-200">
          <TrendingDown className="w-3.5 h-3.5" /> ลดลง
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200">
          <Activity className="w-3.5 h-3.5" /> คงที่ / ปานกลาง
        </span>
      );
    }
  };

  // Helper for risk badge styling
  const renderRiskBadge = (risk: string) => {
    const cleanRisk = risk.toLowerCase();
    if (cleanRisk === "high" || cleanRisk.includes("สูง")) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2.5 py-1 rounded-full text-xs font-extrabold border border-red-300">
          <AlertTriangle className="w-3 h-3" /> ความเสี่ยงสูง
        </span>
      );
    } else if (cleanRisk === "medium" || cleanRisk.includes("กลาง")) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-extrabold border border-amber-300">
          <Clock className="w-3 h-3" /> ความเสี่ยงปานกลาง
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-extrabold border border-emerald-300">
          <CheckCircle className="w-3 h-3" /> เสถียรดีมาก
        </span>
      );
    }
  };

  return (
    <div id="ai-analytics-dashboard" className="space-y-6">
      {/* Editorial AI Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Cpu className="w-48 h-48 text-white" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-blue-500/30">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Sabaidee Dorm AI Engine V2.5
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            ระบบปัญญาประดิษฐ์วิเคราะห์พฤติกรรมและคาดการณ์
          </h1>
          <p className="mt-2 text-slate-300 text-sm md:text-base leading-relaxed">
            ใช้อัลกอริทึมของ <span className="text-blue-300 font-bold">Gemini 3.5 Flash</span> ในการประเมินรอบบิลย้อนหลัง สรุปผลความคุ้มค่าการใช้พลังงาน ตรวจจับห้องพักที่มีประวัติชำระค่าเช่าล่าช้า และเปรียบเทียบหาแนวโน้มพฤติกรรมการอุปโภคเพื่อสนับสนุนการปรับราคาและการประหยัดค่าสาธารณูปโภคของหอพักอย่างแม่นยำ
          </p>
        </div>
      </div>

      {/* Google Authentication for Gemini AI */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center bg-blue-100 text-blue-600 rounded-full w-5 h-5 text-xs font-bold font-mono">G</span>
              <h3 className="text-sm font-bold text-slate-800">
                เชื่อมต่อบัญชี Google เพื่อใช้งาน Gemini AI วิเคราะห์หอพัก
              </h3>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              สลับจากระบบ API Key แบบเดิมมาเป็นการเชื่อมต่อแบบไร้รหัสผ่านที่ปลอดภัยกว่า คีย์หรือบัญชีของคุณจะได้รับการป้องกันระดับองค์กรด้วยระบบ Google Accounts และสามารถเรียกใช้งาน AI ได้อย่างเต็มรูปแบบทันที
            </p>
          </div>

          <div className="shrink-0 flex items-center">
            {googleUser ? (
              <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-3 pr-4 shadow-sm">
                {googleUser.picture ? (
                  <img src={googleUser.picture} alt={googleUser.name} className="w-10 h-10 rounded-full border border-slate-100" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                    {googleUser.name.charAt(0)}
                  </div>
                )}
                <div className="text-left space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">{googleUser.name}</span>
                    <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold rounded-full">เชื่อมต่อแล้ว</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">{googleUser.email}</div>
                </div>
                <button
                  onClick={handleGoogleLogout}
                  className="ml-2 text-xs text-red-600 hover:text-red-700 font-bold hover:underline bg-transparent border-none cursor-pointer p-1 transition-all"
                >
                  ตัดการเชื่อมต่อ
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="inline-flex items-center gap-3 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 font-extrabold text-xs px-4 py-3 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer duration-200 disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 0, 0)">
                    <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.48C21.68,11.78 21.56,11.4 21.35,11.1z" fill="#4285F4" />
                    <path d="M12,20.8c2.38,0 4.38,-0.78 5.84,-2.14l-3.3,-2.58c-0.92,0.62 -2.1,0.98 -3.54,0.98c-2.72,0 -5.02,-1.84 -5.84,-4.3H1.73v2.66C3.18,18.28 7.3,20.8 12,20.8z" fill="#34A853" />
                    <path d="M6.16,12.76c-0.2,-0.62 -0.32,-1.28 -0.32,-1.96s0.12,-1.34 0.32,-1.96V6.18H1.73C1.06,7.5 0.68,9 0.68,10.8s0.38,3.3 1.05,4.62L6.16,12.76z" fill="#FBBC05" />
                    <path d="M12,5.56c1.3,0 2.46,0.44 3.38,1.32l2.54,-2.54C16.38,2.9 14.38,2 12,2C7.3,2 3.18,4.52 1.73,8.14l4.43,3.44C6.98,9.08 9.28,5.56 12,5.56z" fill="#EA4335" />
                  </g>
                </svg>
                {isLoggingIn ? "กำลังเชื่อมต่อ..." : "เชื่อมต่อบัญชี Google ของคุณ"}
              </button>
            )}
          </div>
        </div>

        {/* Custom API Key Collapsible Backup */}
        <div className="pt-2 border-t border-slate-200/60">
          <button
            onClick={() => setShowApiOption(!showApiOption)}
            className="text-[11px] text-slate-400 hover:text-slate-600 font-bold hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
          >
            {showApiOption ? "✕ ซ่อนตัวเลือก API Key สำรอง" : "⚙️ ใช้รหัสผ่าน API Key ส่วนตัว (กรณีบัญชี Google ขัดข้อง)"}
          </button>

          {showApiOption && (
            <div className="mt-3 p-4 bg-slate-100 rounded-xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-600" />
                  <span>ข้อมูล Gemini API Key ส่วนตัวส่วนบุคคล</span>
                </h4>
                <p className="text-[10px] text-slate-500 max-w-xl">
                  หากคุณพบคอขวดปริมาณการเรียกใช้งานด้วยบัญชี Google หรือใช้บัญชีภายนอกเพื่อประมวลผล สามารถระบุ API Key ส่วนตัวตรงนี้ได้ คีย์จะส่งผ่านเซสชันของเบราว์เซอร์นี้โดยตรง
                </p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto md:max-w-xs shrink-0">
                <div className="relative flex-1 w-full">
                  <input
                    type={showApiKey ? "text" : "password"}
                    placeholder="กรอก Gemini API Key (AIzaSy...)"
                    value={customApiKey}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setCustomApiKey(val);
                      localStorage.setItem("sabaidee_dorm_custom_gemini_key", val);
                    }}
                    className="w-full px-2.5 py-1.5 text-[11px] border border-slate-300 rounded-lg pr-8 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none"
                  >
                    {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
                {customApiKey && (
                  <button
                    onClick={() => {
                      setCustomApiKey("");
                      localStorage.removeItem("sabaidee_dorm_custom_gemini_key");
                    }}
                    className="px-2 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg text-[10px] font-bold cursor-pointer shrink-0 transition-colors"
                  >
                    ลบออก
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Box: Room Multi-Selector & Run Button */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
          ขั้นตอนที่ 1: เลือกห้องพักที่ต้องการวิเคราะห์หรือเปรียบเทียบยอด (เลือกกี่ห้องก็ได้)
        </h3>

        {rooms.length === 0 ? (
          <div className="text-slate-500 text-center py-4 text-sm">
            ไม่มีห้องพักในระบบในขณะนี้ โปรดเพิ่มห้องพักก่อนทำการวิเคราะห์
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mb-6">
            {rooms.map((room) => {
              const isSelected = selectedRoomIds.includes(room.id);
              return (
                <button
                  key={room.id}
                  onClick={() => handleToggleRoom(room.id)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-bold transition-all border text-center ${
                    isSelected
                      ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                >
                  ห้อง {room.name}
                </button>
              );
            })}
          </div>
        )}

        {/* AI Analysis Cache / Status Banner */}
        {cachedData && (
          <div className={`mb-5 p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
            !hasDataChanged 
              ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
              : "bg-amber-50 border-amber-100 text-amber-800"
          }`}>
            <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${!hasDataChanged ? "text-emerald-600" : "text-amber-600"}`} />
            <div>
              {!hasDataChanged ? (
                <>
                  <p className="font-bold text-emerald-900">⚡ แสดงผลวิเคราะห์ล่าสุดทันที (ข้อมูลไม่มีการเปลี่ยนแปลง)</p>
                  <p className="text-emerald-700 mt-0.5 font-semibold">ระบบได้ดึงผลลัพธ์การวิเคราะห์ที่บันทึกไว้ล่าสุดมาแสดงผลโดยอัตโนมัติเพื่อประหยัดการทำงาน</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-amber-900">⚠️ ตรวจพบการเปลี่ยนแปลงของข้อมูลหอพักล่าสุด</p>
                  <p className="text-amber-700 mt-0.5 font-semibold">คุณสามารถกดเริ่มวิเคราะห์ใหม่ได้ทันที โดยระบบจะส่งผลวิเคราะห์เดิมไปเป็นคีย์อ้างอิง เพื่อให้ AI วิเคราะห์การอัปเดตและเปรียบเทียบแนวโน้มพฤติกรรมให้คุณด้วย</p>
                  <button 
                    onClick={() => {
                      setAnalysisResult(cachedData.result);
                      setHasDataChanged(false); // Display previous results temporarily on demand
                    }}
                    className="mt-2.5 px-2 py-1 bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-200 rounded text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    🔍 แสดงผลวิเคราะห์เดิมชั่วคราว (อ้างอิงข้อมูลชุดเดิม)
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-5">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <span>คำแนะนำ: ข้อมูลทั้งหมดจะประมวลผลบนคลาวด์อย่างปลอดภัย คีย์ Gemini API ของคุณไม่ถูกส่งไปยังไคลเอนต์</span>
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || rooms.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold px-6 py-3 rounded-lg shadow-md transition-all cursor-pointer text-sm"
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>ระบบ AI กำลังประมวลผลข้อมูล...</span>
              </>
            ) : (
              <>
                <Cpu className="w-4.5 h-4.5" />
                <span>ประมวลผลวิเคราะห์ด้วย AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Output */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">ไม่สามารถวิเคราะห์ข้อมูลได้</h4>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Analysis Display Portal */}
      {!analysisResult && !isAnalyzing && (
        <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
          <Sparkles className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700">พร้อมดำเนินการวิเคราะห์ข้อมูล</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto leading-relaxed">
            เลือกรายชื่อห้องที่ต้องการเปรียบเทียบในแผงควบคุมด้านบน จากนั้นคลิกปุ่ม "ประมวลผลวิเคราะห์ด้วย AI" เพื่อจำลองข้อมูลการคำนวณและประเมินเชิงสถิติได้ทันที
          </p>
        </div>
      )}

      {/* Loading placeholder skeleton */}
      {isAnalyzing && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/4 animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
            <div className="h-8 bg-slate-100 rounded w-5/6 animate-pulse"></div>
            <div className="h-8 bg-slate-100 rounded w-4/5 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="h-32 bg-slate-50 rounded-lg animate-pulse"></div>
            <div className="h-32 bg-slate-50 rounded-lg animate-pulse"></div>
            <div className="h-32 bg-slate-50 rounded-lg animate-pulse"></div>
          </div>
        </div>
      )}

      {/* AI Analysis Result Board */}
      <AnimatePresence>
        {analysisResult && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Visual Tabs Navigation */}
            <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar gap-2">
              <button
                onClick={() => setActiveSection("averages")}
                className={`py-3 px-4 font-bold text-sm whitespace-nowrap transition-all border-b-2 -mb-px flex items-center gap-2 ${
                  activeSection === "averages"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Gauge className="w-4 h-4" />
                <span>ค่าเฉลี่ยใช้น้ำ/ไฟฟ้า</span>
              </button>
              <button
                onClick={() => setActiveSection("trends")}
                className={`py-3 px-4 font-bold text-sm whitespace-nowrap transition-all border-b-2 -mb-px flex items-center gap-2 ${
                  activeSection === "trends"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>คาดการณ์แนวโน้มพลังงาน</span>
              </button>
              <button
                onClick={() => setActiveSection("payments")}
                className={`py-3 px-4 font-bold text-sm whitespace-nowrap transition-all border-b-2 -mb-px flex items-center gap-2 ${
                  activeSection === "payments"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>วินัยชำระเงินและเครดิต</span>
              </button>
              <button
                onClick={() => setActiveSection("comparison")}
                className={`py-3 px-4 font-bold text-sm whitespace-nowrap transition-all border-b-2 -mb-px flex items-center gap-2 ${
                  activeSection === "comparison"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>เปรียบเทียบยอดเฉลี่ยรายห้อง ({selectedRoomIds.length})</span>
              </button>
              <button
                onClick={() => setActiveSection("overall")}
                className={`py-3 px-4 font-bold text-sm whitespace-nowrap transition-all border-b-2 -mb-px flex items-center gap-2 ${
                  activeSection === "overall"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>สรุปวิเคราะห์เชิงกลยุทธ์</span>
              </button>
            </div>

            {/* Content Switcher */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm min-h-[300px]">
              
              {/* SECTION 1: AVERAGES */}
              {activeSection === "averages" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-900 text-base">สถิติค่าเฉลี่ยอุปโภคน้ำและไฟฟ้าต่อรอบเดือน</h3>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">วิเคราะห์ตามประวัติบิลจริง</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analysisResult.averages.map((avg) => (
                      <div key={avg.roomId} className="border border-slate-100 rounded-xl p-4 hover:border-slate-300 transition-all bg-slate-50/50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-extrabold text-slate-800">ห้องพัก {avg.roomName}</span>
                          <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">ID: {avg.roomId}</span>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Water Avg */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-600">
                              <span className="flex items-center gap-1"><Droplet className="w-3.5 h-3.5 text-blue-500" /> การใช้น้ำประปาเฉลี่ย</span>
                              <span className="font-bold text-slate-800">{avg.avgWaterUnits.toFixed(1)} หน่วย/เดือน</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, avg.avgWaterUnits * 5)}%` }}></div>
                            </div>
                            <div className="text-[10px] text-right text-slate-400 font-bold">คิดเป็นค่าใช้จ่ายเฉลี่ย {avg.avgWaterCost.toLocaleString()} บาท</div>
                          </div>

                          {/* Elec Avg */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-600">
                              <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" /> การใช้กระแสไฟฟ้าเฉลี่ย</span>
                              <span className="font-bold text-slate-800">{avg.avgElecUnits.toFixed(1)} หน่วย/เดือน</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, avg.avgElecUnits * 0.5)}%` }}></div>
                            </div>
                            <div className="text-[10px] text-right text-slate-400 font-bold">คิดเป็นค่าใช้จ่ายเฉลี่ย {avg.avgElecCost.toLocaleString()} บาท</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2: TRENDS & PREDICTIONS */}
              {activeSection === "trends" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-900 text-base">การคาดการณ์พฤติกรรมใช้พลังงานและแนวโน้มล่วงหน้า</h3>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">คาดการณ์สำหรับงวดถัดไป</span>
                  </div>

                  <div className="space-y-4">
                    {analysisResult.trends.map((trend) => (
                      <div key={trend.roomId} className="border border-slate-100 hover:border-slate-200 rounded-xl p-4 bg-[#fbfcfd]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-3">
                          <span className="text-sm font-extrabold text-slate-800">ห้องพัก {trend.roomName}</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-500">มิเตอร์น้ำ: {renderTrendBadge(trend.waterTrend)}</span>
                            <span className="text-xs text-slate-500">มิเตอร์ไฟ: {renderTrendBadge(trend.elecTrend)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div className="bg-blue-50/40 p-3 rounded-lg border border-blue-50">
                            <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">คาดการณ์ใช้น้ำงวดหน้า</div>
                            <div className="text-lg font-bold text-slate-800 mt-1">{trend.predictedWaterNextMonth.toFixed(1)} หน่วย</div>
                          </div>
                          <div className="bg-amber-50/40 p-3 rounded-lg border border-amber-50">
                            <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">คาดการณ์ใช้ไฟฟ้างวดหน้า</div>
                            <div className="text-lg font-bold text-slate-800 mt-1">{trend.predictedElecNextMonth.toFixed(1)} หน่วย</div>
                          </div>
                          <div className="md:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center">
                            <p className="text-xs text-slate-600 leading-relaxed italic">
                              "{trend.trendNarrative}"
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 3: LATE PAYMENTS */}
              {activeSection === "payments" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-900 text-base">ระบบประเมินวินัยทางการเงินและความเสี่ยงค้างจ่าย</h3>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">พิจารณาจากการชำระ FIFO</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysisResult.latePaymentAnalysis.map((payment) => (
                      <div key={payment.roomId} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-extrabold text-slate-800">ห้องพัก {payment.roomName}</span>
                            {renderRiskBadge(payment.riskLevel)}
                          </div>
                          <p className="text-xs font-bold text-blue-600 mt-1">
                            สรุปพฤติกรรม: {payment.paymentStatusSummary}
                          </p>
                          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                            {payment.riskDetails}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 4: SELECTED ROOM COMPARISON */}
              {activeSection === "comparison" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-900 text-base">เปรียบเทียบยอดรวมและข้อมูลเชิงลึกระหว่างห้องพัก</h3>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">ผลการจับคู่เปรียบเทียบเฉพาะกลุ่ม</span>
                  </div>

                  {selectedRoomIds.length < 2 ? (
                    <div className="text-center py-10">
                      <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-600 font-bold">กรุณาเลือกตั้งแต่ 2 ห้องขึ้นไปในขั้นตอนแรก</p>
                      <p className="text-slate-400 text-xs mt-1">เพื่อเปิดการวิเคราะห์ข้อมูลความคุ้มค่าพลังงานและแนวโน้มเปรียบเทียบแบบรายคู่</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analysisResult.roomComparison.map((comp) => (
                          <div key={comp.roomId} className="border border-blue-100 rounded-xl p-4 bg-blue-50/20">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-extrabold text-slate-800">ห้องพัก {comp.roomName}</span>
                              <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded">
                                {comp.comparisonTag}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                              {comp.comparisonMetric}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 5: STRATEGIC OVERALL SUMMARY */}
              {activeSection === "overall" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-900 text-base">สรุปทิศทางและข้อเสนอแนะเชิงกลยุทธ์จาก AI</h3>
                    <span className="text-[10px] bg-blue-50 px-2 py-0.5 rounded font-bold text-blue-600">คำสั่งนโยบายบริหาร</span>
                  </div>

                  <div className="bg-slate-900 text-slate-200 rounded-xl p-6 border border-slate-800">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans font-medium text-slate-100">
                      {analysisResult.overallSummary}
                    </p>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
