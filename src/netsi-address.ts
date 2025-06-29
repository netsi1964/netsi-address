/**
 * Defines the shape of a mapper function used in the UI configuration.
 * @param value - The specific value from the address data.
 * @param fullObject - The complete DawaAddress object.
 * @returns The string to be placed in the UI element.
 */
type MapperFunction = (value: any, fullObject: DawaAddress) => string;

/**
 * Represents how a piece of address data is mapped to a UI element.
 * It can be a simple CSS selector string or an object with a selector and a custom mapper function.
 */
type UiMapping = string | {
  selector: string;
  mapper: MapperFunction;
};

/**
 * Defines the UI configuration for mapping address data to DOM elements.
 * The `address` property is mandatory and serves as the main input for the component.
 */
interface UiConfig {
  /** The CSS selector for the main address input field. This is required. */
  address: string;
  [key: string]: UiMapping | undefined;
}

/**
 * Main configuration object for the NetsiAddress component.
 */
interface NetsiConfig {
  /** UI mapping configuration. */
  ui?: Partial<UiConfig>;
  /** Whether to use a fuzzy search as a fallback if no exact matches are found. */
  useFuzzyFallback?: boolean;
  /** Any other keys are treated as URL parameters for the DAWA API request. */
  [key: string]: any;
}

/**
 * Represents a complete address object from the DAWA API.
 */
interface DawaAddress {
  id: string;
  href: string;
  adressebetegnelse: string;
  adgangsadresse: {
    vejstykke: { navn: string };
    husnr: string;
    postnummer: { nr: string; navn: string };
    kommune: { kode: string; navn: string };
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Represents a single suggestion in the autocomplete list.
 */
interface Suggestion {
  /** The text to display for the suggestion. */
  tekst: string;
  /** The full address object associated with the suggestion. */
  adresse: DawaAddress;
  /** Optional flag indicating if the suggestion is from a fuzzy search. */
  isFuzzy?: boolean;
}

/**
 * The detail object for the 'netsi-address:select' event.
 */
interface SelectEventDetail {
  /** The selected address object. */
  address: DawaAddress;
}

/**
 * Creates a debounced function that delays invoking `func` until after `delay` milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param func The function to debounce.
 * @param delay The number of milliseconds to delay.
 * @returns The new debounced function.
 */
function debounce<T extends (...args: any[]) => void>(func: T, delay = 350): T {
  let timeoutId: number | undefined;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  } as T;
}

/**
 * A custom element for address lookup and autocompletion using the Danish Address API (DAWA).
 *
 * @example
 * ```html
 * <netsi-address id="my-address"></netsi-address>
 * <input type="text" id="address" placeholder="Start typing an address...">
 * ```
 *
 * @example
 * ```javascript
 * const addressElement = document.getElementById('my-address');
 * addressElement.config = {
 *   ui: {
 *     address: '#address',
 *     'adgangsadresse.vejstykke.navn': '#vejnavn',
 *     'adgangsadresse.husnr': '#husnr',
 *   },
 *   useFuzzyFallback: true
 * };
 * ```
 *
 * @fires netsi-address:select - Dispatched when an address is selected from the suggestion list.
 * The event detail contains the selected address object.
 */
class NetsiAddress extends HTMLElement {
  private _config!: NetsiConfig;
  private _inputEl: HTMLInputElement | null = null;
  private _suggestionsEl: HTMLUListElement | null = null;
  private _highlightedIndex = -1;
  private _abortController: AbortController | null = null;

  private readonly _boundHandleKeydown = this._handleKeydown.bind(this);
  private readonly _boundHandleClickOutside = this._handleClickOutside.bind(
    this,
  );
  private readonly _boundReposition = this._repositionSuggestions.bind(this);
  private readonly _debouncedLookup = debounce(this.lookup.bind(this));

  static get _defaults(): NetsiConfig {
    return {
      ui: {
        address: "#address",
        etage: "#etage",
        dør: "#doer",
        "adgangsadresse.vejstykke.navn": "#vejnavn",
        "adgangsadresse.husnr": "#husnr",
        "adgangsadresse.postnummer.nr": "#postnr",
        "adgangsadresse.postnummer.navn": "#postnrnavn",
        "adgangsadresse.kommune.kode": "#kommunekode",
        "adgangsadresse.kommune.navn": "#kommune",
      },
      useFuzzyFallback: false,
    };
  }

  constructor() {
    super();
  }

  /**
   * Sets the configuration for the component.
   * Merges the provided configuration with the default values.
   * @param newConfig - The configuration object.
   */
  set config(newConfig: NetsiConfig) {
    this._config = {
      ...NetsiAddress._defaults,
      ...newConfig,
      ui: { ...NetsiAddress._defaults.ui, ...newConfig.ui },
    };
    this._initialize();
  }

  connectedCallback() {}

  disconnectedCallback() {
    if (this._inputEl?.removeEventListener) {
      this._inputEl.removeEventListener("input", this._debouncedLookup as EventListener);
      this._inputEl.removeEventListener("keydown", this._boundHandleKeydown);
    }
    if (document?.removeEventListener) {
      document.removeEventListener("click", this._boundHandleClickOutside);
    }
    if (window?.removeEventListener) {
      window.removeEventListener("resize", this._boundReposition);
      window.removeEventListener("scroll", this._boundReposition, true);
    }
    this._suggestionsEl?.remove();
    document.getElementById("netsi-address-styles")?.remove();
  }

  private _initialize(): void {
    if (!this._config.ui?.address) {
      console.error(
        "NetsiAddress: `ui.address` selector is mandatory in the config.",
      );
      return;
    }
    this._inputEl = document.querySelector(this._config.ui.address);

    if (!this._inputEl) {
      console.error(
        "NetsiAddress: Main input element not found with selector:",
        this._config.ui.address,
      );
      return;
    }

    this._injectStyles();
    this._createSuggestionsUI();
    this._attachListeners();
  }

  private _injectStyles(): void {
    if (document.getElementById("netsi-address-styles")) return;
    const style = document.createElement("style");
    style.id = "netsi-address-styles";
    style.innerHTML = `
      #netsi-suggestions-list {
        position: absolute; display: none; z-index: 1000;
        background: white; border: 1px solid #ccc;
        border-radius: 4px; box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        list-style-type: none; padding: 0; margin: 0; max-height: 250px; overflow-y: auto;
        box-sizing: border-box;
      }
      #netsi-suggestions-list.visible { display: block; }
      #netsi-suggestions-list li { display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 0.95em; }
      #netsi-suggestions-list li:last-child { border-bottom: none; }
      #netsi-suggestions-list li.highlighted, #netsi-suggestions-list li:hover { background-color: #007bff; color: white; }
      .fuzzy-indicator { font-style: italic; color: #6c757d; font-size: 0.9em; white-space: nowrap; margin-left: 1em; }
      #netsi-suggestions-list li.highlighted .fuzzy-indicator { color: #e9ecef; }
    `;
    document.head.appendChild(style);
  }

  private _createSuggestionsUI(): void {
    if (document?.createElement) {
      this._suggestionsEl = document.createElement("ul");
      this._suggestionsEl.id = "netsi-suggestions-list";
      document.body.appendChild(this._suggestionsEl);
    }
  }

  private _attachListeners(): void {
    if (this._inputEl?.addEventListener) {
      this._inputEl.addEventListener("input", this._debouncedLookup as EventListener);
      this._inputEl.addEventListener("keydown", this._boundHandleKeydown);
    }
    if (document?.addEventListener) {
      document.addEventListener("click", this._boundHandleClickOutside);
    }
    if (window?.addEventListener) {
      window.addEventListener("resize", this._boundReposition);
      window.addEventListener("scroll", this._boundReposition, true);
    }
  }

  private _repositionSuggestions(): void {
    if (!this._inputEl || !this._suggestionsEl) return;
    const rect = this._inputEl.getBoundingClientRect();
    this._suggestionsEl.style.left = `${rect.left + window.scrollX}px`;
    this._suggestionsEl.style.top = `${rect.bottom + window.scrollY}px`;
    this._suggestionsEl.style.width = `${rect.width}px`;
  }

  private _renderSuggestions(suggestions: Suggestion[]): void {
    if (this._suggestionsEl) {
      this._suggestionsEl.innerHTML = "";
      this._highlightedIndex = -1;
  
      if (suggestions.length === 0) {
        this._hideSuggestions();
        return;
      }
  
      suggestions.forEach((item) => {
        const li = document.createElement("li");
        const textNode = document.createElement("span");
        textNode.textContent = item.tekst;
        li.appendChild(textNode);
  
        if (item.isFuzzy) {
          const fuzzySpan = document.createElement("span");
          fuzzySpan.className = "fuzzy-indicator";
          fuzzySpan.textContent = "(Mente du?)";
          li.appendChild(fuzzySpan);
        }
  
        li.addEventListener("click", () => this.select(item));
        this._suggestionsEl!.appendChild(li);
      });
  
      this._showSuggestions();
    }
  }

  private _updateHighlight(): void {
    if (!this._suggestionsEl) return;
    const items = this._suggestionsEl.querySelectorAll("li");
    items.forEach((item, index) => {
      if (index === this._highlightedIndex) {
        item.classList.add("highlighted");
        item.scrollIntoView({ block: "nearest" });
      } else {
        item.classList.remove("highlighted");
      }
    });
  }

  private _showSuggestions(): void {
    this._suggestionsEl?.classList.add("visible");
    this._repositionSuggestions();
  }

  private _hideSuggestions(): void {
    this._suggestionsEl?.classList.remove("visible");
  }

  private _handleKeydown(e: KeyboardEvent): void {
    if (!this._suggestionsEl?.classList.contains("visible")) return;
    const items = this._suggestionsEl.querySelectorAll("li");
    if (items.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this._highlightedIndex = (this._highlightedIndex + 1) % items.length;
        this._updateHighlight();
        break;
      case "ArrowUp":
        e.preventDefault();
        this._highlightedIndex = (this._highlightedIndex - 1 + items.length) %
          items.length;
        this._updateHighlight();
        break;
      case "Enter":
        e.preventDefault();
        if (this._highlightedIndex > -1) {
          const suggestions = Array.from(
            this._suggestionsEl.querySelectorAll("li"),
          ).map((li) => JSON.parse(li.dataset.suggestion || "{}"));
          this.select(suggestions[this._highlightedIndex]);
        }
        break;
      case "Escape":
        this._hideSuggestions();
        break;
    }
  }

  private _handleClickOutside(e: MouseEvent): void {
    if (
      this._suggestionsEl && !this._suggestionsEl.contains(e.target as Node) &&
      this._inputEl && !this._inputEl.contains(e.target as Node)
    ) {
      this._hideSuggestions();
    }
  }

  private _buildQueryParameters(isFuzzy = false): URLSearchParams {
    const params = new URLSearchParams({
      q: this._inputEl!.value,
      type: "adresse",
      per_side: "10",
      ...(isFuzzy && { fuzzy: "" }),
    });

    Object.entries(this._config).forEach(([key, value]) => {
      if (key !== "ui" && key !== "useFuzzyFallback") {
        params.append(key, String(value));
      }
    });

    return params;
  }

  private async _fetchData(params: URLSearchParams): Promise<Suggestion[]> {
    this._abortController?.abort();
    this._abortController = new AbortController();

    const response = await fetch(
      `https://api.dataforsyningen.dk/adresser/autocomplete?${params.toString()}`,
      { signal: this._abortController.signal },
    );
    if (!response.ok) throw new Error("Network response was not ok.");
    return (await response.json()).map((s: any) => ({ ...s, isFuzzy: params.has("fuzzy") }));
  }

  /**
   * Performs the address lookup based on the current input value.
   * Fetches data from the DAWA API and renders the suggestions.
   */
  async lookup(): Promise<void> {
    if (!this._inputEl || this._inputEl.value.length < 2) {
      this._hideSuggestions();
      return;
    }

    try {
      const mainParams = this._buildQueryParameters();
      let suggestions = await this._fetchData(mainParams);

      if (suggestions.length === 0 && this._config.useFuzzyFallback) {
        const fuzzyParams = this._buildQueryParameters(true);
        suggestions = await this._fetchData(fuzzyParams);
      }
      
      this._renderSuggestions(suggestions);

    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("NetsiAddress: Error fetching address data:", error);
        this._hideSuggestions();
      }
    }
  }

  /**
   * Selects an address from the suggestions.
   * Populates the UI fields and dispatches a custom event.
   * @param item - The suggestion item to select.
   */
  async select(item: Suggestion): Promise<void> {
    this._hideSuggestions();

    const detail: SelectEventDetail = { address: item.adresse };
    const event = new CustomEvent("netsi-address:select", {
      detail,
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);

    if (this._inputEl) {
      this._inputEl.value = item.tekst;
    }

    this._populate(item.adresse);
  }

  private _populate(addressData: DawaAddress): void {
    if (!this._config.ui) return;

    Object.entries(this._config.ui).forEach(([key, mapping]) => {
      if (!mapping) return;
      
      const { selector, mapper } = typeof mapping === "string"
        ? { selector: mapping, mapper: (val: any) => String(val ?? "") }
        : mapping;

      const element = document.querySelector(selector) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement;
      
      if (element) {
        const value = this._getValue(addressData, key);
        element.value = mapper(value, addressData);
      }
    });
  }

  private _getValue(obj: object, path: string): any {
    return path.split(".").reduce(
      (acc, part) => acc && acc[part],
      obj as any,
    );
  }
}

if (typeof window !== "undefined" && window.customElements) {
  customElements.define("netsi-address", NetsiAddress);
}

export default NetsiAddress;
