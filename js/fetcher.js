/**
 * Keetype v2 - Data Fetcher & Parser
 * 
 * Manages fetching from Google Sheets (GViz API with JSONP fallback)
 * and seamless fallback to the local fallback database.
 */

window.KeetypeFetcher = (function() {
  let currentSource = "google_sheets"; // 'google_sheets' | 'fallback'
  let currentStatus = {
    source: "google_sheets",
    label: "Google Sheets (Live)",
    isLive: true,
    lastSync: null,
    error: null
  };
  let cachedData = null;
  let statusListeners = [];

  // Utility slugifier to create deterministic product IDs from Model names
  function slugify(text) {
    if (!text) return "";
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove non-word chars
      .replace(/[\s_-]+/g, "-") // Collapse whitespace/dashes
      .replace(/^-+|-+$/g, ""); // Trim dashes
  }

  function cleanCell(cell) {
    if (!cell) return "";
    const val = cell.f !== undefined && cell.f !== null ? cell.f : (cell.v !== undefined && cell.v !== null ? cell.v : "");
    return String(val).trim();
  }

  // Fetch a single sheet via GViz API with JSONP fallback
  async function fetchSheetGViz(spreadsheetId, gid) {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
    
    // First try standard fetch (works online on HTTP/HTTPS)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        return JSON.parse(text.substring(jsonStart, jsonEnd));
      }
    } catch (fetchErr) {
      console.warn(`Standard fetch failed for gid=${gid}, attempting JSONP fallback:`, fetchErr);
    }

    // JSONP Fallback: bypasses CORS restrictions when running locally via file:// or without CORS
    return new Promise((resolve, reject) => {
      const callbackName = `gviz_cb_${gid}_${Date.now()}`;
      const script = document.createElement("script");
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Google Sheets request timed out"));
      }, 8000);

      function cleanup() {
        clearTimeout(timeout);
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[callbackName] = function(data) {
        cleanup();
        resolve(data);
      };

      script.src = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=responseHandler:${callbackName}&gid=${gid}`;
      script.onerror = function() {
        cleanup();
        reject(new Error("Failed to load Google Sheets script tag"));
      };

      document.body.appendChild(script);
    });
  }

  // 1. Parse Keyboards Sheet
  function parseKeyboards(data) {
    const items = [];
    let currentCat = "";
    let currentSize = "";
    let updateDate = "28/09/2026";
    const rows = data?.table?.rows || [];

    for (const r of rows) {
      const cells = (r.c || []).map(cleanCell);
      while (cells.length < 6) cells.push("");

      // Check for update date in footer
      for (const c of cells) {
        const m = c.match(/\[(\d{2}\/\d{2}\/\d{4})\]/);
        if (m) updateDate = m[1];
      }

      // Skip disclaimer/header rows
      if (!cells.some(Boolean) || 
          cells[0].includes("Important") || 
          cells[0].includes("Updates:") || 
          cells[0].startsWith("[") || 
          cells[0].includes("other") || 
          cells[0] === "Category" || 
          cells[0] === "Recommended HE Keyboards" ||
          cells[0].includes("budget-oriented")) {
        continue;
      }

      if (cells[0]) currentCat = cells[0];
      if (cells[1]) currentSize = cells[1];
      const model = cells[2];

      if (!model || model.toLowerCase() === "literally nothing") continue;

      const tier = cells[3];
      const caseMaterial = cells[4];
      const notes = cells[5];
      const id = slugify(model);

      const rawProduct = {
        id: id,
        model: model,
        category: currentCat,
        size: currentSize,
        tier: tier,
        caseMaterial: caseMaterial,
        notes: notes,
        lastUpdate: updateDate,
        type: "keyboards",
        images: []
      };

      items.push(window.applyProductOverrides ? window.applyProductOverrides(rawProduct) : rawProduct);
    }
    return { items, updateDate };
  }

  // 2. Parse Glass Mousepads Sheet
  function parseMousepads(data) {
    const items = [];
    let currentCat = "";
    let updateDate = "28/09/2026";
    const rows = data?.table?.rows || [];

    for (const r of rows) {
      const cells = (r.c || []).map(cleanCell);
      while (cells.length < 7) cells.push("");

      for (const c of cells) {
        const m = c.match(/\[(\d{2}\/\d{2}\/\d{4})\]/);
        if (m) updateDate = m[1];
      }

      if (!cells.some(Boolean) ||
          cells[0].includes("Important") ||
          cells[0].includes("Updates:") ||
          cells[0].startsWith("[") ||
          cells[0].includes("Wondering") ||
          cells[0].includes("Speed categories") ||
          cells[0] === "Category" ||
          cells[0] === "Recommended Glass Mousepads") {
        continue;
      }

      if (cells[0]) currentCat = cells[0];
      const name = cells[1];
      if (!name) continue;

      const coating = cells[3];
      const notes = cells[4];
      const avail = cells[5];
      const id = slugify(name);

      const rawProduct = {
        id: id,
        model: name,
        category: currentCat,
        coating: coating,
        notes: notes,
        availability: avail,
        lastUpdate: updateDate,
        type: "mousepads",
        images: []
      };

      items.push(window.applyProductOverrides ? window.applyProductOverrides(rawProduct) : rawProduct);
    }
    return { items, updateDate };
  }

  // 3. Parse Skates (Cloth and Glass)
  function parseSkates(clothData, glassData) {
    const clothItems = {};
    const glassItems = {};
    let updateDate = "28/09/2026";

    // Parse Cloth Skates
    let curClothCat = "";
    for (const r of (clothData?.table?.rows || [])) {
      const cells = (r.c || []).map(cleanCell);
      while (cells.length < 7) cells.push("");

      for (const c of cells) {
        const m = c.match(/\[(\d{2}\/\d{2}\/\d{4})\]/);
        if (m) updateDate = m[1];
      }

      if (!cells.some(Boolean) ||
          cells[0].includes("Important") ||
          cells[0].includes("Updates:") ||
          cells[0].startsWith("[") ||
          cells[0].includes("Glass skates") ||
          cells[0].includes("I might") ||
          cells[0].includes("other") ||
          cells[0].includes("Shwamper") ||
          cells[0] === "Category" ||
          cells[0] === "Recommended skates for cloth mousepads") {
        continue;
      }

      if (cells[0]) curClothCat = cells[0];
      const name = cells[1];
      if (!name) continue;

      const id = slugify(name);
      clothItems[id] = {
        id,
        model: name,
        clothSpeed: curClothCat,
        material: cells[2],
        format: cells[3],
        texture: cells[4],
        foam: cells[5],
        notes: cells[6],
        lastUpdate: updateDate
      };
    }

    // Parse Glass Skates
    let curGlassCat = "";
    for (const r of (glassData?.table?.rows || [])) {
      const cells = (r.c || []).map(cleanCell);
      while (cells.length < 6) cells.push("");

      for (const c of cells) {
        const m = c.match(/\[(\d{2}\/\d{2}\/\d{4})\]/);
        if (m) updateDate = m[1];
      }

      if (!cells.some(Boolean) ||
          cells[0].includes("Important") ||
          cells[0].includes("Updates:") ||
          cells[0].startsWith("[") ||
          cells[0].includes("Glass skates") ||
          cells[0].includes("sensor issues") ||
          cells[0].includes("I might") ||
          cells[0] === "Category" ||
          cells[0] === "Recommended skates for glass mousepads") {
        continue;
      }

      if (cells[0]) curGlassCat = cells[0];
      const name = cells[1];
      if (!name) continue;

      const id = slugify(name);
      glassItems[id] = {
        id,
        model: name,
        glassSpeed: curGlassCat,
        format: cells[2],
        texture: cells[3],
        foam: cells[4],
        notes: cells[5],
        lastUpdate: updateDate
      };
    }

    // Combine into unified skates list
    const allIds = Array.from(new Set([...Object.keys(clothItems), ...Object.keys(glassItems)]));
    const combined = [];

    for (const id of allIds) {
      const c = clothItems[id] || {};
      const g = glassItems[id] || {};
      const model = c.model || g.model;
      const clothSpeed = c.clothSpeed || "";
      const glassSpeed = g.glassSpeed || "";
      const material = c.material || "PTFE";
      const format = c.format || g.format || "";
      const texture = c.texture || g.texture || "";
      const foam = c.foam || g.foam || "";

      const notesParts = [];
      if (c.notes) notesParts.push(`Cloth: ${c.notes}`);
      if (g.notes) notesParts.push(`Glass: ${g.notes}`);
      const notes = notesParts.join(" | ");

      const rawProduct = {
        id,
        model,
        clothSpeed,
        glassSpeed,
        material,
        format,
        texture,
        foam,
        notes,
        clothNotes: c.notes || "",
        glassNotes: g.notes || "",
        lastUpdate: c.lastUpdate || g.lastUpdate || updateDate,
        type: "skates",
        images: []
      };

      combined.push(window.applyProductOverrides ? window.applyProductOverrides(rawProduct) : rawProduct);
    }

    return {
      items: combined,
      clothItems: Object.values(clothItems),
      glassItems: Object.values(glassItems),
      updateDate
    };
  }

  // Load data from Local Fallback DB
  function loadFallbackData() {
    const fallback = window.FALLBACK_DATA || { keyboards: [], mousepads: [], skates: [], meta: {} };
    
    // Apply overrides to all items
    const keyboards = (fallback.keyboards || []).map(p => {
      p.type = "keyboards";
      return window.applyProductOverrides ? window.applyProductOverrides(p) : p;
    });

    const mousepads = (fallback.mousepads || []).map(p => {
      p.type = "mousepads";
      return window.applyProductOverrides ? window.applyProductOverrides(p) : p;
    });

    const skates = (fallback.skates || []).map(p => {
      p.type = "skates";
      return window.applyProductOverrides ? window.applyProductOverrides(p) : p;
    });

    return {
      keyboards,
      mousepads,
      skates,
      meta: fallback.meta || {},
      source: "fallback"
    };
  }

  // Fetch all categories from Google Sheets
  async function fetchLiveGoogleSheets() {
    const config = window.KEETYPE_CONFIG;
    const kbCat = config.categories.find(c => c.id === "keyboards");
    const mpCat = config.categories.find(c => c.id === "mousepads");
    const skCat = config.categories.find(c => c.id === "skates");

    const [kbRaw, mpRaw, skClothRaw, skGlassRaw] = await Promise.all([
      fetchSheetGViz(config.spreadsheetId, kbCat.gid),
      fetchSheetGViz(config.spreadsheetId, mpCat.gid),
      fetchSheetGViz(config.spreadsheetId, skCat.gidCloth),
      fetchSheetGViz(config.spreadsheetId, skCat.gidGlass)
    ]);

    const kbParsed = parseKeyboards(kbRaw);
    const mpParsed = parseMousepads(mpRaw);
    const skParsed = parseSkates(skClothRaw, skGlassRaw);

    return {
      keyboards: kbParsed.items,
      mousepads: mpParsed.items,
      skates: skParsed.items,
      meta: {
        keyboards: { lastUpdate: kbParsed.updateDate },
        mousepads: { lastUpdate: mpParsed.updateDate },
        skates: { lastUpdate: skParsed.updateDate }
      },
      source: "google_sheets"
    };
  }

  // Main fetch function with automatic fallback
  async function loadData(preferredSource = null) {
    if (preferredSource) {
      currentSource = preferredSource;
    }

    if (currentSource === "fallback") {
      cachedData = loadFallbackData();
      currentStatus = {
        source: "fallback",
        label: "Local Fallback DB",
        isLive: false,
        lastSync: new Date(),
        error: null
      };
      notifyStatusChange();
      return cachedData;
    }

    // Attempt Google Sheets live fetch
    try {
      currentStatus = {
        source: "google_sheets",
        label: "Syncing from Google Sheets...",
        isLive: true,
        lastSync: currentStatus.lastSync,
        error: null
      };
      notifyStatusChange();

      const liveData = await fetchLiveGoogleSheets();
      cachedData = liveData;
      currentStatus = {
        source: "google_sheets",
        label: "Google Sheets (Live)",
        isLive: true,
        lastSync: new Date(),
        error: null
      };
      notifyStatusChange();
      return liveData;
    } catch (err) {
      console.warn("Live fetch from Google Sheets failed, reverting to Local Fallback DB:", err);
      cachedData = loadFallbackData();
      currentStatus = {
        source: "fallback",
        label: "Local Fallback DB (Offline Mode)",
        isLive: false,
        lastSync: new Date(),
        error: err.message
      };
      notifyStatusChange();
      return cachedData;
    }
  }

  function notifyStatusChange() {
    for (const fn of statusListeners) {
      try { fn(currentStatus); } catch (e) { console.error(e); }
    }
  }

  return {
    loadData,
    getData: () => cachedData,
    getStatus: () => currentStatus,
    setSource: (source) => {
      currentSource = source;
      return loadData(source);
    },
    onStatusChange: (listener) => {
      statusListeners.push(listener);
      listener(currentStatus);
    },
    slugify
  };
})();
