# Product Requirements Document: Netsi Address Component

---

- **Title**: Netsi Address - A Headless Danish Address Autocomplete Web
  Component
- **Author**: Google Gemini 2.5 Pro, AI Assistant (collaborating with netsi1964)
- **Stakeholders**: Frontend Developers, UI/UX Designers, Product Managers
- **Version**: 2.1
- **Date**: 2025-06-29
- **Status**: Final

---

## 1. Objective

To create a zero-dependency, highly configurable, and developer-friendly web
component that provides robust Danish address lookup and autocompletion. The
component will act as a "headless" controller, attaching to existing user forms
to ensure maximum flexibility and seamless integration into any web application.

## 2. Background & Context

Entering addresses is a common, yet error-prone, task in web forms. For
applications targeting users in Denmark, leveraging the official **DAWA
(Danmarks Adressers Web API)** is the authoritative way to ensure data validity.
The primary endpoint for this functionality is the
[DAWA Address Search API](https://dawadocs.dataforsyningen.dk/dok/api/adresse#s%C3%B8gning).

However, integrating directly with this API, handling user input, managing
dropdown UI, and processing complex JSON responses requires significant
boilerplate code. This component aims to abstract away all of that complexity
into a single, reusable element, solving the problem of needing a reliable,
fast, and intuitive address input field.

## 3. Assumptions

- Developers using this component are familiar with HTML, CSS, and modern
  JavaScript (ES Modules).
- The component will be used in a browser environment where the `fetch` API and
  Custom Elements are supported.
- The DAWA API is considered the single source of truth for Danish addresses and
  will remain publicly available.
- Users value speed and accuracy; therefore, features like debouncing, request
  cancellation, and fuzzy search are critical.
- Developers need ultimate control over how data is presented in their
  application.

## 4. User Stories

### Persona 1: Frida, The Frontend Developer

- **As Frida**, I want to add a Danish address lookup to my form **without
  writing complex API logic**, so I can focus on my application's core features.
- **As Frida**, I want to connect the component to my **existing form fields
  using simple CSS selectors**, so I don't have to refactor my HTML structure.
- **As Frida**, I want to be able to map **any value from the API's JSON
  response** to any element on my page.
- **As Frida**, I want to **transform the data** from the API (e.g., format a
  date or combine two fields) before it's displayed in my UI, so I have full
  control over the presentation.
- **As Frida**, I want the component to **work out-of-the-box with a sensible
  default configuration**, so I can get started quickly for standard use cases.
- **As Frida**, I want to install the component easily from a standard package
  registry like **NPM or JSR**.

### Persona 2: Erik, The End-User

- **As Erik**, I want to receive **address suggestions as I type**, so I can
  enter my address quickly and with fewer keystrokes.
- **As Erik**, I want the system to **understand my typos** (e.g.,
  "Rådhusplasen" instead of "Rådhuspladsen"), so I don't get stuck if I make a
  small mistake.
- **As Erik**, I want to be able to use my **keyboard (arrow keys and Enter)**
  to navigate and select suggestions, so I don't have to switch to my mouse.
- **As Erik**, when I select an address, I expect **all relevant fields**
  (street, number, city, zip code) to be filled out for me instantly, so I know
  my choice has been registered.

## 5. Functional Requirements

| ID         | Requirement Description                                                                                                                                                 | User Story  |
| :--------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------- |
| **REQ-01** | The component shall be a "headless" Custom Element (`<netsi-address>`) that does not render its own primary UI.                                                         | Frida       |
| **REQ-02** | The component shall be configured via a single JavaScript `config` object.                                                                                              | Frida       |
| **REQ-03** | The `config` object must accept a `ui` property for mapping API data to DOM elements.                                                                                   | Frida       |
| **REQ-04** | The `ui` object must identify the primary search input field via a mandatory `address` key with a CSS selector.                                                         | Frida       |
| **REQ-05** | The `ui` object shall allow mapping of **any** dot-notation path from the DAWA JSON response to a UI element.                                                           | Frida       |
| **REQ-06** | For each UI mapping, the user can provide a simple string (CSS selector) OR an object `{ selector: "...", mapper: (v, full_obj) => "..." }`.                            | Frida       |
| **REQ-07** | The `mapper` function shall receive the raw value from the JSON path and the full address object, and its return value shall be used to populate the UI element.        | Frida       |
| **REQ-08** | If no `ui` object is provided, the component must use a predefined set of default ID selectors for common address fields.                                               | Frida       |
| **REQ-09** | The component shall dynamically create and manage a dropdown list of address suggestions positioned below the search input.                                             | Erik        |
| **REQ-10** | Input from the user shall be debounced to prevent excessive API calls.                                                                                                  | Erik, Frida |
| **REQ-11** | The `config` object shall accept a `useFuzzyFallback: true` flag. If enabled, a second API call with `fuzzy=true` will be made if the first returns no results.         | Erik        |
| **REQ-12** | Fuzzy search results shall be visually distinguished in the dropdown.                                                                                                   | Erik        |
| **REQ-13** | The `config` object shall accept any other key-value pair and pass it directly as a URL parameter to the DAWA API (e.g., `postnr: '2100'`).                             | Frida       |
| **REQ-14** | The suggestions dropdown must be fully navigable via `ArrowUp`, `ArrowDown`, `Enter`, and `Escape` keys.                                                                | Erik        |
| **REQ-15** | Upon selection, the component shall populate all configured UI fields with the corresponding data. The main search field shall be populated with the full address text. | Erik, Frida |
| **REQ-16** | The component shall emit a `netsi-address:select` custom event with the full address object as its `detail` payload upon successful selection.                          | Frida       |
| **REQ-17** | The component shall be publishable to NPM and JSR.                                                                                                                      | Frida       |

### 5.1. Example DAWA API Response

Below is an example of the JSON object returned for a single address from the DAWA API. Developers can use dot-notation to access any value within this structure for mapping to UI elements (see `REQ-05`).

For example, to get the street name, the mapping path would be `adgangsadresse.vejstykke.navn`. To get the zip code, the path is `adgangsadresse.postnummer.nr`.

```json
{
  "id": "0a3f50c2-f254-32b8-e044-0003ba298018",
  "kvhx": "07512601793C_______",
  "status": 1,
  "darstatus": 3,
  "href": "https://api.dataforsyningen.dk/adresser/0a3f50c2-f254-32b8-e044-0003ba298018",
  "historik": {
    "oprettet": "2000-02-05T15:24:05.000",
    "ændret": "2000-02-05T15:24:05.000",
    "ikrafttrædelse": "2000-02-05T15:24:05.000",
    "nedlagt": null
  },
  "etage": null,
  "dør": null,
  "adressebetegnelse": "Grenåvej 793C, 8541 Skødstrup",
  "adgangsadresse": {
    "href": "https://api.dataforsyningen.dk/adgangsadresser/0a3f5096-327f-32b8-e044-0003ba298018",
    "id": "0a3f5096-327f-32b8-e044-0003ba298018",
    "adressebetegnelse": "Grenåvej 793C, 8541 Skødstrup",
    "kvh": "07512601793C",
    "status": 1,
    "darstatus": 3,
    "vejstykke": {
      "href": "https://api.dataforsyningen.dk/vejstykker/751/2601",
      "navn": "Grenåvej",
      "adresseringsnavn": "Grenåvej",
      "kode": "2601"
    },
    "husnr": "793C",
    "navngivenvej": {
      "href": "https://api.dataforsyningen.dk/navngivneveje/cb7ac140-ec8e-462a-8365-ecf46c334dc5",
      "id": "cb7ac140-ec8e-462a-8365-ecf46c334dc5"
    },
    "supplerendebynavn": null,
    "supplerendebynavn2": null,
    "postnummer": {
      "href": "https://api.dataforsyningen.dk/postnumre/8541",
      "nr": "8541",
      "navn": "Skødstrup"
    },
    "stormodtagerpostnummer": null,
    "kommune": {
      "href": "https://api.dataforsyningen.dk/kommuner/0751",
      "kode": "0751",
      "navn": "Aarhus"
    },
    "ejerlav": {
      "kode": 950853,
      "navn": "Segalt By, Skødstrup"
    },
    "esrejendomsnr": "0",
    "matrikelnr": "15am",
    "historik": {
      "oprettet": "2000-02-05T15:24:05.000",
      "ændret": "2018-07-04T18:00:00.000",
      "ikrafttrædelse": "2000-02-05T15:24:05.000",
      "nedlagt": null
    },
    "adgangspunkt": {
      "id": "0a3f5096-327f-32b8-e044-0003ba298018",
      "koordinater": [
        10.32021648,
        56.28047272
      ],
      "højde": 62.1,
      "nøjagtighed": "A",
      "kilde": 5,
      "tekniskstandard": "TK",
      "tekstretning": 137,
      "ændret": "2012-02-20T23:59:00.000"
    },
    "vejpunkt": {
      "id": "1b68dca7-af45-11e7-847e-066cff24d637",
      "kilde": "Ekstern",
      "nøjagtighed": "B",
      "tekniskstandard": "V0",
      "koordinater": [
        10.32016023,
        56.28041365
      ],
      "ændret": "2018-05-03T14:08:02.125"
    },
    "DDKN": {
      "m100": "100m_62380_5817",
      "km1": "1km_6238_581",
      "km10": "10km_623_58"
    },
    "sogn": {
      "href": "https://api.dataforsyningen.dk/sogne/8246",
      "kode": "8246",
      "navn": "Skødstrup"
    },
    "region": {
      "href": "https://api.dataforsyningen.dk/regioner/1082",
      "kode": "1082",
      "navn": "Region Midtjylland"
    },
    "landsdel": {
      "href": "https://api.dataforsyningen.dk/landsdele/DK042",
      "nuts3": "DK042",
      "navn": "Østjylland"
    },
    "retskreds": {
      "href": "https://api.dataforsyningen.dk/retskredse/1165",
      "kode": "1165",
      "navn": "Retten i Århus"
    },
    "politikreds": {
      "href": "https://api.dataforsyningen.dk/politikredse/1461",
      "kode": "1461",
      "navn": "Østjyllands Politi"
    },
    "opstillingskreds": {
      "href": "https://api.dataforsyningen.dk/opstillingskredse/0065",
      "kode": "0065",
      "navn": "Aarhus Øst"
    },
    "afstemningsområde": {
      "href": "https://api.dataforsyningen.dk/afstemningsomraader/751/51",
      "nummer": "51",
      "navn": "Skødstrup Hallen"
    },
    "storkreds": {
      "href": "https://api.dataforsyningen.dk/storkredse/8",
      "nummer": "8",
      "navn": "Østjylland"
    },
    "valglandsdel": {
      "href": "https://api.dataforsyningen.dk/valglandsdele/C",
      "bogstav": "C",
      "navn": "Midtjylland-Nordjylland"
    },
    "zone": "Udfaset",
    "jordstykke": {
      "href": "https://api.dataforsyningen.dk/jordstykker/950853/15am",
      "ejerlav": {
        "kode": 950853,
        "navn": "Segalt By, Skødstrup",
        "href": "https://api.dataforsyningen.dk/ejerlav/950853"
      },
      "matrikelnr": "15am",
      "esrejendomsnr": "0"
    },
    "bebyggelser": [
      {
        "id": "12337669-c91e-6b98-e053-d480220a5a3f",
        "kode": 10466,
        "type": "by",
        "navn": "Løgten",
        "href": "https://api.dataforsyningen.dk/bebyggelser/12337669-c91e-6b98-e053-d480220a5a3f"
      }
    ],
    "brofast": true
  }
}
```

## 6. UI/UX Flow

1. The user begins typing in the input field designated by `config.ui.address`.
2. After a brief pause (debouncing), the component sends a request to the DAWA
   API.
3. A dropdown list appears directly below the input field, showing formatted
   address suggestions.
4. If the search was fuzzy, a "(Mente du?)" indicator appears next to each
   suggestion.
5. The user can: a. Continue typing to refine the results. b. Use the mouse or
   finger to click a suggestion. c. Use arrow keys to highlight a suggestion and
   press Enter to select it. d. Press Escape or click outside the component to
   close the dropdown.
6. Upon selection: a. The dropdown closes. b. The main search input is filled
   with the selected address's full text. c. All other fields defined in the
   `config.ui` are populated with the (potentially mapped) data. d. A
   `netsi-address:select` event is fired.

## 7. Non-Functional Requirements

- **Performance**: API calls must be debounced. In-flight `fetch` requests must
  be cancelled if a new one is initiated to prevent race conditions.
- **Accessibility (a11y)**: Full keyboard navigation is mandatory. Highlighted
  elements should be visually distinct.
- **Reusability**: The component must be framework-agnostic and usable in any
  project via standard ES Modules.
- **Maintainability**: Code should be well-commented, self-contained, and easy
  to understand.

## 8. Success Metrics

- **Developer Adoption**: Number of downloads on NPM/JSR. Number of stars/forks
  on the GitHub repository.
- **Ease of Use**: Time required for a developer to integrate the component into
  a new project (goal: < 15 minutes).
- **User Success Rate**: High percentage of users successfully selecting a valid
  address compared to manual entry.

## 9. Future Work (Out of Scope for v2.1)

- Theming support via CSS Custom Properties for the dropdown.
- Integration with mapping libraries (e.g., firing an event with coordinates to
  center a map).
- Support for other DAWA endpoints (e.g., searching for just a `vejnavn`).
