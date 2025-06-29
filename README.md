# Netsi Address Component

A fully encapsulated, zero-dependency web component for simple and robust Danish
address lookup using Dataforsyningen's DAWA API. This component is written in
TypeScript and provides strong typing for all configurations.

It is designed as a "headless" controller that attaches to your existing form
fields, making it extremely flexible to integrate into any project.

## Features

- **Headless & Flexible**: Attaches to any form structure using CSS selectors.
- **TypeScript First**: Provides strong types for configuration and API responses.
- **Smart Defaults**: Works out-of-the-box with a standard set of element IDs.
  No configuration needed for a basic setup.
- **Advanced Data Mapping**: Use a `mapper` function to transform API data
  before it's displayed in your UI.
- **Zero Dependencies**: Compiles to a single, dependency-free JavaScript file.
- **Configurable**: Easily configured, including all
  [DAWA API parameters](https://dawadocs.dataforsyningen.dk/dok/api/adresse#s%C3%B8gning).
- **Fuzzy Search**: Optionally falls back to a "fuzzy" search if no exact
  matches are found.
- **Keyboard Navigation**: Full support for `ArrowUp`, `ArrowDown`, `Enter`, and
  `Escape`.
- **Tested**: Includes a suite of unit tests for core logic.

## Demo

A local demo is available in the `/demo` directory. To run it, you first need to
build the component from its TypeScript source.

```bash
# First, install Deno: https://deno.com/manual/getting_started/installation
# Then, build the project:
deno task build

# Serve the demo folder
npx http-server -o demo/index.html
```

## Installation

### Via JSR (Recommended)

```bash
deno add @netsi/address
```

### Via NPM

```bash
npm install @netsi/address
```

### Via CDN

The component's source is TypeScript, so direct use in the browser requires a build step. For CDN usage, it's recommended to use a service that transpiles and bundles JSR packages, like esm.sh.

```html
<script type="module">
  // The 'netsi-address' element is automatically defined.
  import "https://esm.sh/@netsi/address";
</script>
```

## Usage

### 1. Basic Usage (with Default Selectors)

If your form fields follow a simple ID convention, you can use the component
with minimal configuration.

**HTML:**

```html
<!-- The standalone component tag -->
<netsi-address id="address-component"></netsi-address>

<!-- Your form with the default IDs -->
<div class="form-group">
  <label for="address">Search for a Danish address</label>
  <!-- The component defaults to looking for an input with id="address" -->
  <input type="text" id="address" placeholder="e.g., Rådhuspladsen 1, 1550">
</div>

<!-- Default fields to be populated -->
<input type="text" id="vejnavn" readonly>
<input type="text" id="husnr" readonly>
<input type="text" id="postnr" readonly>
<input type="text" id="postnrnavn" readonly>
<!-- ... etc. See full list of defaults below. -->
```

**JavaScript:**

```javascript
import "@netsi/address-component";

const addressComponent = document.getElementById("address-component");
// Minimal config, as the component will use its smart defaults.
addressComponent.config = {
  useFuzzyFallback: true,
};
```

### 2. Advanced Usage (with Custom Selectors and Mappers)

For full control, provide a `ui` object in the configuration. You can specify
custom selectors and use a `mapper` function to format the data.

**HTML:**

```html
<netsi-address id="address-component"></netsi-address>

<input type="text" class="my-search-field">
<input type="text" class="my-road-name-field" readonly>
<div>
  <span>Address created on:</span>
  <strong id="created-date"></strong>
</div>
```

**JavaScript:**

```javascript
import "@netsi/address-component";

const addressComponent = document.getElementById("address-component");

addressComponent.config = {
  // Component behavior
  useFuzzyFallback: true,

  // DAWA API Parameters
  postnr: "2100", // Filter all searches by a specific postal code

  // UI Mapping
  ui: {
    // --- This is mandatory for custom UI ---
    address: ".my-search-field",

    // --- Simple mapping ---
    "adgangsadresse.vejstykke.navn": ".my-road-name-field",

    // --- Advanced mapping with a mapper function ---
    "historik.oprettet": {
      selector: "#created-date",
      mapper: (isoDateString) => {
        if (!isoDateString) return "Unknown";
        // Format the date for better readability
        return new Date(isoDateString).toLocaleDateString("da-DK");
      },
    },
  },
};
```

### Default UI Selectors

If the `ui` object is not provided, the component uses the following `id`
selectors. The keys are dot-notation paths to the data in the DAWA API response.

| Data Path                        | Default Selector |
| -------------------------------- | ---------------- |
| **`address`** (The search input) | `#address`       |
| `etage`                          | `#etage`         |
| `dør`                            | `#doer`          |
| `adgangsadresse.vejstykke.navn`  | `#vejnavn`       |
| `adgangsadresse.husnr`           | `#husnr`         |
| `adgangsadresse.postnummer.nr`   | `#postnr`        |
| `adgangsadresse.postnummer.navn` | `#postnrnavn`    |
| `adgangsadresse.kommune.kode`    | `#kommunekode`   |
| `adgangsadresse.kommune.navn`    | `#kommune`       |

## Development

This project uses Deno for development.

- **To build the browser-compatible bundle for the demo:**
  ```bash
  deno task build
  ```
  This command uses `esbuild` to compile `src/netsi-address.ts` into `demo/netsi-address.bundle.js`.

- **To run the tests:**
  ```bash
  deno task test
  ```

## Events

The component emits a `netsi-address:select` event when an address is
successfully selected. The `event.detail` property contains the complete address
object from DAWA.

```javascript
addressComponent.addEventListener("netsi-address:select", (event) => {
  console.log("Address selected:", event.detail);
});
```

---
*This package was added to JSR and NPM with the help of Cursor. A fully encapsulated web component for Danish address lookup using DAWA.*
