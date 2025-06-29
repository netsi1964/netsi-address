import {
  assertEquals
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setupDOM } from "./test_helper.ts";

// Setup a minimal DOM environment
setupDOM();
// Dynamically import the component to ensure DOM is ready
const { default: NetsiAddress } = await import("./netsi-address.ts");


Deno.test("NetsiAddress _buildQueryParameters builds correct query", async () => {
  const component = new NetsiAddress();

  // Mock the component properties that the method depends on
  // @ts-ignore - Accessing private properties for unit testing
  component._inputEl = { value: "Rådhuspladsen 1" };
  // @ts-ignore
  component._config = {
    ui: { address: "#address" },
    useFuzzyFallback: false,
    postnr: "1550", // Extra param for the API
  };

  // Test standard query
  // @ts-ignore
  const params = component._buildQueryParameters(false);
  assertEquals(params.get("q"), "Rådhuspladsen 1");
  assertEquals(params.get("postnr"), "1550");
  assertEquals(params.get("fuzzy"), null, "Fuzzy should not be set");
  assertEquals(params.has("ui"), false, "UI config should not be a parameter");

  // Test fuzzy query
  // @ts-ignore
  const fuzzyParams = component._buildQueryParameters(true);
  assertEquals(fuzzyParams.get("fuzzy"), "true", "Fuzzy should be set to true");
});

Deno.test("NetsiAddress _getValue utility retrieves nested values", async () => {
  const component = new NetsiAddress();
  const testObj = {
    id: "123",
    adgangsadresse: {
      vejstykke: {
        navn: "Rådhuspladsen",
      },
      husnr: "1",
      postnummer: null, // Test for null value
    },
  };

  // @ts-ignore
  assertEquals(component._getValue(testObj, "adgangsadresse.vejstykke.navn"), "Rådhuspladsen");
  // @ts-ignore
  assertEquals(component._getValue(testObj, "adgangsadresse.husnr"), "1");
  // @ts-ignore
  assertEquals(component._getValue(testObj, "adgangsadresse.postnummer"), null);
  // @ts-ignore
  assertEquals(component._getValue(testObj, "adgangsadresse.etage"), undefined);
  // @ts-ignore
  assertEquals(component._getValue(testObj, "id"), "123");
}); 