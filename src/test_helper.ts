import {
  DOMParser,
  HTMLDocument,
} from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

// A very simple Event class for mocking
class Event {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
}

export function setupDOM(): void {
  const dom = new DOMParser().parseFromString(
    `<!DOCTYPE html><html><body></body></html>`,
    "text/html",
  )!;

  // @ts-ignore
  globalThis.document = dom;
  // @ts-ignore
  globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
  
  // Provide a base class that can be extended
  // @ts-ignore
  globalThis.HTMLElement = class HTMLElement {};
  // @ts-ignore
  globalThis.customElements = { define: () => {}, get: () => {} };
  // @ts-ignore
  globalThis.CustomEvent = Event;
  // @ts-ignore
  globalThis.Node = class Node {};
} 