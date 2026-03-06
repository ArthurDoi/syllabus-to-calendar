"use client";
import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";

interface Message { role: "user" | "assistant"; text: string; }

const SUGGESTIONS = ["What's due this week?", "Any exams coming up?", "What did I miss last week?", "Show my next assignment"];

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Xin chào! Tôi có thể giúp bạn tra cứu lịch học, deadline, hoặc các môn học. Hỏi tôi bất cứ điều gì!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text?: string) => {
    const q = text || input;
    if (!q.trim() || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      // TODO: kết nối endpoint chatbot RAG khi backend hoàn thiện
      // const res = await api.post("/chat", { message: q });
      // const answer = res.data.answer;

      // Placeholder response
      await new Promise(r => setTimeout(r, 800));
      const answer = `Tính năng RAG đang được phát triển. Câu hỏi của bạn: "${q}" sẽ được trả lời sau khi tích hợp xong.`;
      setMessages(prev => [...prev, { role: "assistant", text: answer }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Có lỗi xảy ra. Vui lòng thử lại." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", height: "100%" }}>
      <div style={{ padding: "10px 32px", borderBottom: "1px solid #e5e7eb", fontSize: 13, color: "#9ca3af" }}>
        Ask questions about your schedule, assignments, and exams
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", padding: "24px 32px" }}>
        <div style={{ width: "100%", maxWidth: 720 }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 20, background: "#fff", display: "flex", flexDirection: "column", minHeight: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>AI Assistant</span>
              </div>
              <button onClick={() => setMessages([{ role: "assistant", text: "Chat cleared. How can I help you now?" }])}
                style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>
                Clear Chat
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", marginBottom: 16 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12, alignItems: "flex-end", gap: 8 }}>
                  {m.role === "assistant" && <span style={{ fontSize: 20, flexShrink: 0 }}>🤖</span>}
                  <div style={{
                    maxWidth: "72%", padding: "10px 14px",
                    borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                    background: m.role === "user" ? "#2563eb" : "#f3f4f6",
                    color: m.role === "user" ? "#fff" : "#111", fontSize: 14, lineHeight: 1.6
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>🤖</span>
                  <div style={{ padding: "10px 14px", borderRadius: "14px 14px 14px 2px", background: "#f3f4f6", fontSize: 14, color: "#9ca3af" }}>
                    Đang suy nghĩ...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  style={{ padding: "6px 14px", border: "1px solid #e5e7eb", borderRadius: 99, fontSize: 12, cursor: "pointer", background: "#fff", color: "#374151" }}>
                  {s}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Any exams coming up?"
                style={{ flex: 1, padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none" }} />
              <button onClick={() => send()} disabled={loading}
                style={{ width: 42, height: 42, background: loading ? "#93c5fd" : "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 18, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
