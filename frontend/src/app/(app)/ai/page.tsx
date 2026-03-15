import { ChatInterface } from "@/components/chat/ChatInterface";

export const dynamic = "force-dynamic";

export default async function AIPage() {
  return (
    <div className="p-6 h-full w-full">
      <div className="mb-6 flex flex-col justify-start items-start">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            AI Assistant
          </h1>
        </div>
        <p className="text-sm text-gray-500 ml-4">
          Ask questions about your schedule, assignments, and exams
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}
