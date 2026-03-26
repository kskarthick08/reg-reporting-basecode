import { runContextChatAction } from "../runContextChatAction";
import type { UseWorkbenchActionsArgs } from "./types";

export function createChatActions(args: UseWorkbenchActionsArgs) {
  async function runContextChat() {
    await runContextChatAction({
      chatInput: args.chatInput,
      projectId: args.projectId,
      chatIncludeAll: args.chatIncludeAll,
      chatModel: args.chatModel,
      setChatInput: args.setChatInput,
      setChatHistory: args.setChatHistory,
      setChatBusy: args.setChatBusy,
      setChatResponse: args.setChatResponse,
      pushAudit: args.pushAudit
    });
  }

  return { runContextChat };
}
