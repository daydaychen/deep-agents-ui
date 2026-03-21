import type { Message } from "@langchain/langgraph-sdk";
import { renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProcessedMessages } from "./useProcessedMessages";

// Mock the utils module
vi.mock("@/app/utils/utils", () => ({
  extractSubAgents: vi.fn(() => []),
  extractStringFromMessageContent: vi.fn((msg: Message) =>
    typeof msg.content === "string" ? msg.content : "",
  ),
}));

import { extractSubAgents } from "@/app/utils/utils";

// -- Fixture helpers --

function makeHumanMessage(id: string, content: string): Message {
  return {
    id,
    type: "human",
    content,
    additional_kwargs: {},
    response_metadata: {},
  } as Message;
}

function makeAiMessage(id: string, content: string, overrides: Partial<Message> = {}): Message {
  return {
    id,
    type: "ai",
    content,
    additional_kwargs: {},
    response_metadata: {},
    tool_calls: [],
    ...overrides,
  } as Message;
}

function makeToolMessage(id: string, toolCallId: string, content: string): Message {
  return {
    id,
    type: "tool",
    content,
    tool_call_id: toolCallId,
    additional_kwargs: {},
    response_metadata: {},
  } as Message;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useProcessedMessages", () => {
  it("returns empty array for empty messages", () => {
    const { result } = renderHook(() => useProcessedMessages([]));
    expect(result.current).toEqual([]);
  });

  it("processes human messages with showAvatar", () => {
    const messages = [makeHumanMessage("h1", "hello")];
    const { result } = renderHook(() => useProcessedMessages(messages));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].message.id).toBe("h1");
    expect(result.current[0].showAvatar).toBe(true);
    expect(result.current[0].toolCalls).toEqual([]);
  });

  it("skips tool messages from output", () => {
    const messages = [
      makeAiMessage("ai1", "thinking", {
        tool_calls: [{ id: "tc1", name: "task_create", args: {} }],
      }),
      makeToolMessage("t1", "tc1", "done"),
    ];
    const { result } = renderHook(() => useProcessedMessages(messages));
    // Only the AI message should be in output
    expect(result.current).toHaveLength(1);
    expect(result.current[0].message.id).toBe("ai1");
  });

  it("updates tool call status to completed when tool message arrives", () => {
    const messages = [
      makeAiMessage("ai1", "thinking", {
        tool_calls: [{ id: "tc1", name: "task_create", args: {} }],
      }),
      makeToolMessage("t1", "tc1", "result text"),
    ];
    const { result } = renderHook(() => useProcessedMessages(messages));
    expect(result.current[0].toolCalls[0].status).toBe("completed");
    expect(result.current[0].toolCalls[0].result).toBe("result text");
  });

  describe("avatar grouping", () => {
    it("shows avatar for first message", () => {
      const messages = [makeHumanMessage("h1", "first")];
      const { result } = renderHook(() => useProcessedMessages(messages));
      expect(result.current[0].showAvatar).toBe(true);
    });

    it("hides avatar for consecutive same-type messages", () => {
      const messages = [makeHumanMessage("h1", "first"), makeHumanMessage("h2", "second")];
      const { result } = renderHook(() => useProcessedMessages(messages));
      expect(result.current[0].showAvatar).toBe(true);
      expect(result.current[1].showAvatar).toBe(false);
    });

    it("shows avatar when type changes", () => {
      const messages = [makeHumanMessage("h1", "question"), makeAiMessage("ai1", "answer")];
      const { result } = renderHook(() => useProcessedMessages(messages));
      expect(result.current[0].showAvatar).toBe(true);
      expect(result.current[1].showAvatar).toBe(true);
    });

    it("shows avatar when sender_id changes", () => {
      const messages = [
        makeAiMessage("ai1", "from agent A", {
          additional_kwargs: { sender_id: "agent-a" },
        }),
        makeAiMessage("ai2", "from agent B", {
          additional_kwargs: { sender_id: "agent-b" },
        }),
      ];
      const { result } = renderHook(() => useProcessedMessages(messages));
      expect(result.current[0].showAvatar).toBe(true);
      expect(result.current[1].showAvatar).toBe(true);
    });
  });

  describe("tool call extraction from 3 message shapes", () => {
    it("extracts from additional_kwargs.tool_calls (OpenAI format)", () => {
      const messages = [
        makeAiMessage("ai1", "", {
          additional_kwargs: {
            tool_calls: [
              {
                id: "tc1",
                function: { name: "task_create", arguments: { task_name: "test" } },
              },
            ],
          },
        }),
      ];
      const { result } = renderHook(() => useProcessedMessages(messages));
      expect(result.current[0].toolCalls).toHaveLength(1);
      expect(result.current[0].toolCalls[0].name).toBe("task_create");
      expect(result.current[0].toolCalls[0].id).toBe("tc1");
    });

    it("extracts from tool_calls array (LangGraph format)", () => {
      const messages = [
        makeAiMessage("ai1", "", {
          tool_calls: [{ id: "tc1", name: "hook_create", args: { name: "my_hook" } }],
        }),
      ];
      const { result } = renderHook(() => useProcessedMessages(messages));
      expect(result.current[0].toolCalls).toHaveLength(1);
      expect(result.current[0].toolCalls[0].name).toBe("hook_create");
    });

    it("extracts from content tool_use blocks (Anthropic format)", () => {
      const messages = [
        makeAiMessage(
          "ai1",
          [
            { type: "text", text: "Let me do that" },
            { type: "tool_use", id: "tc1", name: "test_pipeline", input: { config: {} } },
          ] as unknown as string,
          {
            tool_calls: undefined as unknown as [],
            additional_kwargs: {},
          },
        ),
      ];
      const { result } = renderHook(() => useProcessedMessages(messages));
      expect(result.current[0].toolCalls).toHaveLength(1);
      expect(result.current[0].toolCalls[0].name).toBe("test_pipeline");
    });

    it("filters empty-named tool calls from tool_calls array", () => {
      const messages = [
        makeAiMessage("ai1", "", {
          tool_calls: [
            { id: "tc1", name: "", args: {} },
            { id: "tc2", name: "task_create", args: {} },
          ],
        }),
      ];
      const { result } = renderHook(() => useProcessedMessages(messages));
      expect(result.current[0].toolCalls).toHaveLength(1);
      expect(result.current[0].toolCalls[0].name).toBe("task_create");
    });
  });

  it("extracts reasoning content from additional_kwargs", () => {
    const messages = [
      makeAiMessage("ai1", "answer", {
        additional_kwargs: { reasoning_content: "I think because..." },
      }),
    ];
    const { result } = renderHook(() => useProcessedMessages(messages));
    expect(result.current[0].reasoningContent).toBe("I think because...");
  });

  it("calls extractSubAgents with tool calls and subagent map", () => {
    const subagentMap = new Map<string, Message[]>();
    const messages = [
      makeAiMessage("ai1", "", {
        tool_calls: [{ id: "tc1", name: "task", args: { subagent_type: "researcher" } }],
      }),
    ];
    renderHook(() => useProcessedMessages(messages, subagentMap));
    expect(extractSubAgents).toHaveBeenCalled();
  });

  it("sets tool call status to interrupted when interrupt is provided", () => {
    const messages = [
      makeAiMessage("ai1", "", {
        tool_calls: [{ id: "tc1", name: "task_create", args: {} }],
      }),
    ];
    const { result } = renderHook(() =>
      useProcessedMessages(messages, undefined, { value: "paused" }),
    );
    expect(result.current[0].toolCalls[0].status).toBe("interrupted");
  });

  it("works correctly under React StrictMode (no double-mutation)", () => {
    const messages = [
      makeAiMessage("ai1", "thinking", {
        tool_calls: [{ id: "tc1", name: "task_create", args: {} }],
      }),
      makeToolMessage("t1", "tc1", "done"),
    ];

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.StrictMode, null, children);

    const { result } = renderHook(() => useProcessedMessages(messages), { wrapper });
    expect(result.current[0].toolCalls[0].status).toBe("completed");
    expect(result.current[0].toolCalls[0].result).toBe("done");
  });
});
