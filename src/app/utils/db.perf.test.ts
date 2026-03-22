import { describe, it, expect, } from 'vitest';
import { saveThreadMessages, loadThreadMessages, } from './db';
import type { Message } from "@langchain/langgraph-sdk";

// Basic mock for indexedDB in test environment
import 'fake-indexeddb/auto';

describe('DB Performance', () => {
  const THREAD_ID = 'test-perf-thread';

  it('measures performance of saveThreadMessages', async () => {
    // Generate a large number of messages
    const NUM_TOOL_CALLS = 100;
    const NUM_MESSAGES_PER_CALL = 50;

    const messagesMap = new Map<string, Message[]>();

    for (let i = 0; i < NUM_TOOL_CALLS; i++) {
      const toolCallId = `tool-call-${i}`;
      const msgs: Message[] = [];

      for (let j = 0; j < NUM_MESSAGES_PER_CALL; j++) {
        msgs.push({
          id: `msg-${i}-${j}`,
          type: 'human',
          content: `Test message ${i}-${j}`,
          additional_kwargs: {},
        } as unknown as Message);
      }

      messagesMap.set(toolCallId, msgs);
    }

    const startTime = performance.now();
    await saveThreadMessages(THREAD_ID, messagesMap);
    const endTime = performance.now();

    const duration = endTime - startTime;
    console.log(`⏱️ saveThreadMessages took ${duration.toFixed(2)}ms for ${NUM_TOOL_CALLS * NUM_MESSAGES_PER_CALL} messages`);

    // Verify data was saved
    const loaded = await loadThreadMessages(THREAD_ID);
    expect(loaded.size).toBe(NUM_TOOL_CALLS);
  });
});
