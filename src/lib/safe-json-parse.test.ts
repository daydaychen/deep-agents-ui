import { describe, expect, it } from "vitest";
import { parseJSON } from "./safe-json-parse";

describe("parseJSON", () => {
  describe("valid JSON parsing", () => {
    it("parses a simple object", () => {
      expect(parseJSON('{"a": 1}')).toEqual({ a: 1 });
    });

    it("parses an array", () => {
      expect(parseJSON("[1, 2, 3]")).toEqual([1, 2, 3]);
    });

    it("parses a string", () => {
      expect(parseJSON('"hello"')).toBe("hello");
    });

    it("parses a number", () => {
      expect(parseJSON("42")).toBe(42);
    });

    it("parses null", () => {
      expect(parseJSON("null")).toBeNull();
    });

    it("parses boolean", () => {
      expect(parseJSON("true")).toBe(true);
    });
  });

  describe("prototype pollution protection", () => {
    it("rejects __proto__ key", () => {
      expect(() => parseJSON('{"__proto__": {"admin": true}}')).toThrow(
        "Prototype pollution attempt detected",
      );
    });

    it("rejects constructor key", () => {
      expect(() => parseJSON('{"constructor": {"prototype": {}}}')).toThrow(
        "Prototype pollution attempt detected",
      );
    });

    it("rejects prototype key", () => {
      expect(() => parseJSON('{"prototype": {"admin": true}}')).toThrow(
        "Prototype pollution attempt detected",
      );
    });

    it("allows prototype keys when disallowPrototypes is false", () => {
      const result = parseJSON('{"__proto__": {"admin": true}}', {
        disallowPrototypes: false,
      });
      expect(result).toBeDefined();
    });
  });

  describe("depth limiting", () => {
    it("allows JSON within default depth (5)", () => {
      const json = '{"a": {"b": {"c": {"d": {"e": 1}}}}}';
      expect(parseJSON(json)).toEqual({ a: { b: { c: { d: { e: 1 } } } } });
    });

    it("rejects JSON exceeding default depth", () => {
      const json = '{"a": {"b": {"c": {"d": {"e": {"f": 1}}}}}}';
      expect(() => parseJSON(json)).toThrow(/depth/i);
    });

    it("respects custom maxDepth", () => {
      const json = '{"a": {"b": 1}}';
      expect(() => parseJSON(json, { maxDepth: 1 })).toThrow(/depth/i);
    });

    it("allows deeper nesting with higher maxDepth", () => {
      const json = '{"a": {"b": {"c": {"d": {"e": {"f": 1}}}}}}';
      expect(parseJSON(json, { maxDepth: 10 })).toEqual({
        a: { b: { c: { d: { e: { f: 1 } } } } },
      });
    });

    it("does not count braces inside string values as depth", () => {
      // This string has { inside the value but actual nesting depth is 1
      const json = '{"key": "value with { braces } and {{ more }}"}';
      expect(parseJSON(json)).toEqual({
        key: "value with { braces } and {{ more }}",
      });
    });

    it("does not count braces inside nested string values", () => {
      // Depth 2 but has extra { in strings
      const json = '{"outer": {"inner": "text { with } braces"}}';
      expect(parseJSON(json, { maxDepth: 2 })).toEqual({
        outer: { inner: "text { with } braces" },
      });
    });

    it("counts array nesting as depth", () => {
      const json = "[[[[[[1]]]]]]";
      expect(() => parseJSON(json)).toThrow(/depth/i);
    });
  });

  describe("invalid JSON", () => {
    it("throws on malformed JSON", () => {
      expect(() => parseJSON("{invalid}")).toThrow();
    });

    it("throws on empty string", () => {
      expect(() => parseJSON("")).toThrow();
    });
  });
});
