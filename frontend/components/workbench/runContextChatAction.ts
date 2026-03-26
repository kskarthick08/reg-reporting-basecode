import type { Dispatch, SetStateAction } from "react";
import { API_BASE, parseJson } from "./utils";
import { normalizeChatModel } from "./workbenchConstants";

type ChatMessage = { id: number; role: "user" | "assistant"; text: string; at: string };

type ContextChatArgs = {
  chatInput: string;
  projectId: string;
  chatIncludeAll: boolean;
  chatModel: string;
  setChatInput: Dispatch<SetStateAction<string>>;
  setChatHistory: Dispatch<SetStateAction<ChatMessage[]>>;
  setChatBusy: Dispatch<SetStateAction<boolean>>;
  setChatResponse: Dispatch<SetStateAction<string>>;
  pushAudit: (level: "info" | "success" | "warn", text: string) => void;
};

export async function runContextChatAction(args: ContextChatArgs) {
  const prompt = args.chatInput.trim();
  if (!prompt) return;
  const stamp = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  args.setChatInput("");
  args.setChatHistory((prev) => [...prev, { id: Date.now(), role: "user", text: prompt, at: stamp }]);
  args.setChatBusy(true);
  try {
    const res = await fetch(`${API_BASE}/v1/chat/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: args.projectId,
        message: prompt,
        include_all_artifacts: args.chatIncludeAll,
        model: normalizeChatModel(args.chatModel) || undefined
      })
    });
    const json = await parseJson(res);
    if (!res.ok) throw new Error(JSON.stringify(json));
    const answer = String(json.answer || "");
    args.setChatResponse(answer);
    args.setChatHistory((prev) => [...prev, { id: Date.now() + 1, role: "assistant", text: answer || "No response generated.", at: stamp }]);
    args.pushAudit("info", "Context chat response generated.");
  } catch (e) {
    const failed = `Chat failed: ${String(e)}`;
    args.setChatResponse(failed);
    args.setChatHistory((prev) => [...prev, { id: Date.now() + 2, role: "assistant", text: failed, at: stamp }]);
    args.pushAudit("warn", "Context chat failed.");
  } finally {
    args.setChatBusy(false);
  }
}
