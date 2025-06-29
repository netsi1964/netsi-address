// Type definitions based on PRD.md and DAWA API structure

type MapperFunction = (value: any, fullObject: DawaAddress) => string;

type UiMapping = string | {
  selector: string;
  mapper: MapperFunction;
};

interface UiConfig {
  address: string; // This is mandatory.
  [key: string]: UiMapping | undefined;
}

interface NetsiConfig {
  ui?: Partial<UiConfig>;
  useFuzzyFallback?: boolean;
  [key: string]: any; // Allows any other key for URL parameters.
}

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

interface Suggestion {
  tekst: string;
  adresse: DawaAddress;
  isFuzzy?: boolean;
}

interface SelectEventDetail {
  address: DawaAddress;
}

function debounce<T extends (...args: any[]) => void>(func: T, delay = 350): T {
  let timeoutId: number | undefined;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  } as T;
}

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
          items[this._highlightedIndex].click();
        }
        break;
      case "Escape":
        this._hideSuggestions();
        break;
    }
  }

  private _handleClickOutside(e: MouseEvent): void {
    const target = e.target as Node | null;
    if (
      target &&
      this._suggestionsEl &&
      target !== this._inputEl &&
      !this._suggestionsEl.contains(target)
    ) {
      this._hideSuggestions();
    }
  }

  private _buildQueryParameters(isFuzzy = false): URLSearchParams {
    const params = new URLSearchParams();
    const query = this._inputEl?.value.trim();
    if (query) {
      params.set("q", query);
    }

    for (const key in this._config) {
      if (
        key === "ui" || key === "useFuzzyFallback" ||
        !Object.prototype.hasOwnProperty.call(this._config, key)
      ) continue;
      params.set(key, String(this._config[key]));
    }

    if (isFuzzy) {
      params.set("fuzzy", "true");
    }
    return params;
  }

  private async _fetchData(params: URLSearchParams): Promise<Suggestion[]> {
    const API_URL = "https://api.dataforsyningen.dk/adresser/autocomplete";
    const requestUrl = `${API_URL}?${params.toString()}`;
    const response = await fetch(requestUrl, {
      signal: this._abortController?.signal,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    return response.json();
  }

  async lookup(): Promise<void> {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const query = this._inputEl?.value.trim();

    if (!query) {
      this._renderSuggestions([]);
      return;
    }

    try {
      let params = this._buildQueryParameters(false);
      let data = await this._fetchData(params);

      if (data.length === 0 && this._config.useFuzzyFallback) {
        params = this._buildQueryParameters(true);
        data = await this._fetchData(params);
        if (data.length > 0) {
          data.forEach((item) => (item.isFuzzy = true));
        }
      }
      this._renderSuggestions(data);
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("NetsiAddress lookup failed:", error);
      }
    }
  }

  async select(item: Suggestion): Promise<void> {
    if (!item?.adresse) return;
    let addressData: DawaAddress = item.adresse;

    if (!addressData.adgangsadresse?.kommune && addressData.href) {
      try {
        const response = await fetch(addressData.href);
        if (!response.ok) {
          throw new Error("Failed to fetch full address details.");
        }
        addressData = await response.json();
      } catch (error) {
        console.error("NetsiAddress select failed:", error);
        return;
      }
    }

    this._populate(addressData);
    this._hideSuggestions();

    const selectEvent = new CustomEvent<SelectEventDetail>(
      "netsi-address:select",
      {
        detail: { address: addressData },
        bubbles: true,
        composed: true,
      },
    );
    this.dispatchEvent(selectEvent);
  }

  private _populate(addressData: DawaAddress): void {
    if (!this._config.ui) return;

    // First, handle the main address input field specially.
    if (this._inputEl) {
      this._inputEl.value = addressData.adressebetegnelse;
    }

    // Then, iterate over the rest of the UI mappings.
    for (const [key, mapping] of Object.entries(this._config.ui)) {
      if (!mapping || key === "address") continue;

      const { selector, mapper } = typeof mapping === "string"
        ? { selector: mapping, mapper: undefined }
        : mapping;

      const targetEl = document.querySelector(selector) as
        | HTMLInputElement
        | null;
      if (targetEl) {
        const rawValue = this._getValue(addressData, key);
        targetEl.value = mapper ? mapper(rawValue, addressData) : rawValue;
      }
    }
  }

  private _getValue(obj: object, path: string): any {
    // Navigate through the object path to get the final value.
    return path.split(".").reduce((acc: any, part) => acc && acc[part], obj);
  }
}

customElements.define("netsi-address", NetsiAddress);

export default NetsiAddress;
