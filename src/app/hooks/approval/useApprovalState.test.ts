import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useApprovalState } from "./useApprovalState";

describe("useApprovalState", () => {
  it("mitigates prototype pollution when parsing user edited arguments", () => {
    const actionRequest = {
      name: "testAction",
      args: { originalKey: "originalValue" },
    };
    const onResume = vi.fn();

    const { result } = renderHook(() => useApprovalState(actionRequest, onResume));

    const maliciousPayload = '{"__proto__":{"polluted":"yes"}}';

    // Ensure "polluted" is undefined on Object.prototype before test
    // @ts-expect-error
    expect(({} as any).polluted).toBeUndefined();

    act(() => {
      // updateEditedArg uses safe-json-parse, so it should catch or sanitize
      result.current.updateEditedArg("maliciousKey", maliciousPayload);
    });

    // Verify Object.prototype is not polluted
    // @ts-expect-error
    expect(({} as any).polluted).toBeUndefined();

    // Verify it falls back to string value or throws (safe-json-parse throws on prototype pollution)
    // The catch block in useApprovalState sets the raw string value
    expect(result.current.editedArgs["maliciousKey"]).toBe(maliciousPayload);
  });
});
