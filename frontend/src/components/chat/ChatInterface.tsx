"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

import { chatService, ChatMessage } from "@/lib/services";

interface UIMessage extends ChatMessage {
  id: string;
  action_taken?: string | null;
  timestamp: Date;
}

const ACTION_LABELS: Record<string, string> = {
  get_courses: "📚 Querying Courses",
  get_events: "📅 Querying Events",
  get_upcoming_events: "⏰ Upcoming Events",
  get_event_labels: "🏷️ Categorizing Events",
  sync_to_calendar: "🔄 Synced to Calendar",
};

export function ChatInterface() {
  const STORAGE_KEY = "stc:chat-history-v2";
  const defaultAssistantMessage: UIMessage = {
    id: "intro",
    role: "assistant",
    text: "Xin chào! Tôi là trợ lý AI — tôi có thể truy vấn trực tiếp dữ liệu lịch trình, khóa học và sự kiện. Hãy hỏi tôi bất cứ điều gì!",
    timestamp: new Date(),
  };
  const [messages, setMessages] = useState<UIMessage[]>([
    defaultAssistantMessage,
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const suggestedQuestions = [
    "What's due this week?",
    "Any exams coming up?",
    "What did I miss last week?",
    "Show my next assignment",
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as (Omit<UIMessage, "timestamp"> & {
          timestamp: string;
        })[];
        setMessages(
          parsed.map((message) => ({
            ...message,
            timestamp: new Date(message.timestamp),
          }))
        );
      } catch (error) {
        console.error("Failed to parse stored messages:", error);
      }
    } else {
      setMessages([defaultAssistantMessage]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const serialized = messages.map((message) => ({
      ...message,
      timestamp: message.timestamp.toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  }, [messages, hydrated]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleClearChat = () => {
    const resetMessage: UIMessage = {
      id: `${Date.now()}`,
      role: "assistant",
      text: "Lịch sử chat đã được xóa. Tôi có thể hỗ trợ gì tiếp theo?",
      timestamp: new Date(),
    };
    setMessages([resetMessage]);
    setInput("");
    inputRef.current?.focus();
  };

  const handleSuggestedClick = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: UIMessage = {
      id: Date.now().toString(),
      role: "user",
      text: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Send last 10 messages for context
      const history: ChatMessage[] = messages
        .slice(-10)
        .map(m => ({ role: m.role, text: m.text }));

      const res = await chatService.send(userMessage.text, history);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: res.answer,
          action_taken: res.action_taken,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          text:
            "⚠️ Xin lỗi, có lỗi kết nối tới AI. Vui lòng thử lại sau.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-white/80 backdrop-blur-md flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          AI Assistant
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearChat}
          className="text-gray-500 hover:text-red-500 hover:bg-red-50"
        >
          Clear Chat
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "flex w-full gap-3 max-w-[80%]",
                  message.role === "user" ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-purple-100 text-purple-600"
                  )}
                >
                  {message.role === "user" ? (
                    <User className="w-5 h-5" />
                  ) : (
                    <Bot className="w-5 h-5" />
                  )}
                </div>
                <div className="flex flex-col gap-1 items-start">
                  <div
                    className={cn(
                      "p-3 rounded-2xl text-sm shadow-sm",
                      message.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-100 prose-pre:p-2 prose-pre:rounded-md">
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.text}</p>
                    )}
                  </div>

                  {/* Function tool action label */}
                  {message.role === "assistant" && message.action_taken && (
                    <div className="text-[10px] font-medium text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full mt-1 self-start">
                      {ACTION_LABELS[message.action_taken] || `⚡ ${message.action_taken}`}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 max-w-[80%]"
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <span
                  className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 space-y-3">
        {/* Suggested Questions Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSuggestedClick(q)}
              disabled={isLoading}
              className="whitespace-nowrap px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 text-xs rounded-full transition-colors border border-gray-200"
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your assignments..."
            className="flex-1 bg-white/50 backdrop-blur-sm focus-visible:ring-blue-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all hover:shadow-lg"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
