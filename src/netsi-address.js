function debounce(func, delay = 350) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

class NetsiAddress extends HTMLElement {
  _config = {};
  _inputEl = null;
  _suggestionsEl = null;
  _highlightedIndex = -1;
  _abortController = null;
  _boundHandleKeydown = this._handleKeydown.bind(this);
  _boundHandleClickOutside = this._handleClickOutside.bind(this);
  _boundReposition = this._repositionSuggestions.bind(this);
  _debouncedLookup = debounce(this.lookup.bind(this));

  static get _defaults() {
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
    };
  }

  constructor() {
    super();
  }

  set config(newConfig) {
    this._config = {
      ...newConfig,
      ui: { ...NetsiAddress._defaults.ui, ...newConfig.ui },
    };
    this._initialize();
  }
  connectedCallback() {}
  disconnectedCallback() {
    this._inputEl?.removeEventListener("input", this._debouncedLookup);
    this._inputEl?.removeEventListener("keydown", this._boundHandleKeydown);
    document.removeEventListener("click", this._boundHandleClickOutside);
    window.removeEventListener("resize", this._boundReposition);
    window.removeEventListener("scroll", this._boundReposition, true);
    this._suggestionsEl?.remove();
    document.getElementById("netsi-address-styles")?.remove();
  }

  _initialize() {
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

  _injectStyles() {
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

  _createSuggestionsUI() {
    this._suggestionsEl = document.createElement("ul");
    this._suggestionsEl.id = "netsi-suggestions-list";
    document.body.appendChild(this._suggestionsEl);
  }

  _attachListeners() {
    this._inputEl.addEventListener("input", this._debouncedLookup);
    this._inputEl.addEventListener("keydown", this._boundHandleKeydown);
    document.addEventListener("click", this._boundHandleClickOutside);
    // Listeners to reposition the dropdown on scroll and resize
    window.addEventListener("resize", this._boundReposition);
    window.addEventListener("scroll", this._boundReposition, true);
  }

  // --- CORRECTED POSITIONING LOGIC ---
  _repositionSuggestions() {
    if (!this._inputEl) return;

    // getBoundingClientRect() provides coordinates relative to the viewport.
    const rect = this._inputEl.getBoundingClientRect();

    // We must add the window's scroll offsets to get the true document position.
    // This is the key fix.
    this._suggestionsEl.style.left = `${rect.left + window.scrollX}px`;
    this._suggestionsEl.style.top = `${rect.bottom + window.scrollY}px`;
    this._suggestionsEl.style.width = `${rect.width}px`;
  }

  _renderSuggestions(suggestions) {
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
      this._suggestionsEl.appendChild(li);
    });
    this._showSuggestions();
  }
  _updateHighlight() {
    const items = this._suggestionsEl.querySelectorAll(
      "li",
    );
    items.forEach((item, index) => {
      if (index === this._highlightedIndex) {
        item.classList.add("highlighted");
        item.scrollIntoView({ block: "nearest" });
      } else item.classList.remove("highlighted");
    });
  }

  // --- CORRECTED SHOW/HIDE LOGIC ---
  _showSuggestions() {
    this._suggestionsEl.classList.add("visible");
    // IMPORTANT: Calculate position *after* the element is made visible.
    this._repositionSuggestions();
  }
  _hideSuggestions() {
    this._suggestionsEl.classList.remove("visible");
  }

  _handleKeydown(e) {
    if (
      !this._suggestionsEl.classList.contains("visible")
    ) return;
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
        if (this._highlightedIndex > -1) items[this._highlightedIndex].click();
        break;
      case "Escape":
        this._hideSuggestions();
        break;
    }
  }
  _handleClickOutside(e) {
    if (
      e.target !== this._inputEl && !this._suggestionsEl.contains(e.target)
    ) this._hideSuggestions();
  }
  _buildQueryParameters(isFuzzy = false) {
    const params = new URLSearchParams();
    const query = this._inputEl?.value.trim();
    if (query) params.set("q", query);
    for (const key in this._config) {
      if (key === "ui" || key === "useFuzzyFallback") continue;
      params.set(key, this._config[key]);
    }
    if (isFuzzy) params.set("fuzzy", "true");
    return params;
  }
  async _fetchData(params) {
    const API_URL = "https://api.dataforsyningen.dk/adresser/autocomplete";
    const requestUrl = `${API_URL}?${params.toString()}`;
    const response = await fetch(requestUrl, {
      signal: this._abortController.signal,
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    return response.json();
  }
  async lookup() {
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
        if (data.length > 0) data.forEach((item) => item.isFuzzy = true);
      }
      this._renderSuggestions(data);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("NetsiAddress lookup failed:", error);
      }
    }
  }
  async select(item) {
    if (!item?.adresse) return;
    let addressData = item.adresse;
    if (!addressData.kommune && addressData.href) {
      try {
        const response = await fetch(addressData.href);
        if (!response.ok) throw new Error("Could not fetch full address data");
        addressData = await response.json();
      } catch (error) {
        console.error("Failed to select address:", error);
        return;
      }
    }
    this._hideSuggestions();
    if (this._inputEl) this._inputEl.value = item.tekst;
    this._populate(addressData);
    this.dispatchEvent(
      new CustomEvent("netsi-address:select", {
        detail: addressData,
        bubbles: true,
        composed: true,
      }),
    );
  }
  _populate(addressData) {
    for (const jsonPath in this._config.ui) {
      if (jsonPath === "address") continue;
      const uiMapping = this._config.ui[jsonPath];
      let selector, mapper;
      if (typeof uiMapping === "string") selector = uiMapping;
      else if (typeof uiMapping === "object" && uiMapping.selector) {
        selector = uiMapping.selector;
        mapper = uiMapping.mapper;
      } else continue;
      const element = document.querySelector(selector);
      if (!element) continue;
      const rawValue = jsonPath.split(".").reduce(
        (obj, k) => (obj && obj[k] != null) ? obj[k] : "",
        addressData,
      );
      let displayValue = rawValue;
      if (typeof mapper === "function") {
        try {
          displayValue = mapper(rawValue, addressData);
        } catch (e) {
          console.error(`Mapper function for path "${jsonPath}" failed:`, e);
          continue;
        }
      }
      if ("value" in element) element.value = displayValue;
      else element.textContent = displayValue;
    }
  }
}

customElements.define("netsi-address", NetsiAddress);
export default NetsiAddress;
