import { ChatInterface } from "@/components/chat/ChatInterface";

export const dynamic = "force-dynamic";

export default async function AIPage() {
  return (
    <div className="p-6 h-full w-full">
      <ChatInterface />
    </div>
  );
}
