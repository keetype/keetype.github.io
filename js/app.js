/**
 * Keetype v2 - Main Application Controller
 * Handles separate Home page and dedicated Category library pages.
 * Supports cross-page instant search in the header, modal popup,
 * filters, and clipboard referral code actions.
 */

(function() {
  const pageType = document.body.dataset.page || "home";

  // Application State
  const state = {
    pageType: pageType, // 'home' | 'keyboards' | 'mousepads' | 'skates' | 'mice' | etc.
    currentCategory: pageType === "home" ? "keyboards" : pageType,
    activeFilters: {},
    currentSort: "default",
    searchQuery: "",
    data: null,
    modalProduct: null
  };

  // Speed order rankings for skates and glass pads
  const SPEED_RANKS = {
    "ultra speed": 1,
    "speed": 2,
    "ultra-fast": 1,
    "fast": 2,
    "medium-fast": 3,
    "medium": 4,
    "medium-control": 5,
    "control-fast": 5.5,
    "control": 6
  };

  // DOM Elements cache
  const DOM = {};

  function initDOMElements() {
    DOM.searchInput = document.getElementById("searchInput");
    DOM.searchClearBtn = document.getElementById("searchClearBtn");
    DOM.searchSuggestions = document.getElementById("searchSuggestions");
    DOM.randomGearBtn = document.getElementById("randomGearBtn");
    DOM.filterToolbar = document.getElementById("filterToolbar");
    DOM.filterContainer = document.getElementById("filterContainer");
    DOM.sortSelect = document.getElementById("sortSelect");
    DOM.resetFiltersBtn = document.getElementById("resetFiltersBtn");
    DOM.resultsBar = document.getElementById("resultsBar");
    DOM.pageTitle = document.getElementById("pageTitle");
    DOM.countPill = document.getElementById("countPill");
    DOM.pageSubtitle = document.getElementById("pageSubtitle");
    DOM.tilesGrid = document.getElementById("tilesGrid");
    DOM.emptyState = document.getElementById("emptyState");
    DOM.comingSoonState = document.getElementById("comingSoonState");
    DOM.dbSourceSelect = document.getElementById("dbSourceSelect");
    DOM.dbIndicator = document.getElementById("dbIndicator");
    DOM.syncDbBtn = document.getElementById("syncDbBtn");
    DOM.toast = document.getElementById("toast");
    DOM.productModal = document.getElementById("productModal");
    DOM.modalCloseBtn = document.getElementById("modalCloseBtn");
    DOM.modalBody = document.getElementById("modalBody");
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  async function init() {
    initDOMElements();
    setupEventListeners();

    // Listen for database status updates from fetcher
    window.KeetypeFetcher.onStatusChange(updateDbStatusUI);

    // Initial load: Google Sheets primary, with instant fallback
    try {
      state.data = await window.KeetypeFetcher.loadData();
    } catch (e) {
      console.error("Initialization load failed:", e);
    }

    if (state.pageType === "home") {
      updateHomeLiveCounts();
    } else {
      renderLibraryView();
    }
  }

  // ==========================================================================
  // Database Selector & Status UI
  // ==========================================================================

  function updateDbStatusUI(status) {
    if (!DOM.dbIndicator) return;
    if (status.isLive) {
      DOM.dbIndicator.className = "db-indicator";
    } else {
      DOM.dbIndicator.className = "db-indicator fallback";
    }
    if (DOM.dbSourceSelect) {
      DOM.dbSourceSelect.value = status.source;
    }
  }

  // ==========================================================================
  // Home Page Live Counts
  // ==========================================================================

  function updateHomeLiveCounts() {
    if (!state.data) return;
    const kbCount = document.getElementById("count-keyboards");
    const mpCount = document.getElementById("count-mousepads");
    const skCount = document.getElementById("count-skates");

    if (kbCount && state.data.keyboards) {
      kbCount.textContent = `${state.data.keyboards.length} ranked keyboards`;
    }
    if (mpCount && state.data.mousepads) {
      mpCount.textContent = `${state.data.mousepads.length} ranked glass pads`;
    }
    if (skCount && state.data.skates) {
      skCount.textContent = `${state.data.skates.length} skate options`;
    }
  }

  // ==========================================================================
  // Library Page Rendering
  // ==========================================================================

  function renderLibraryView() {
    if (!DOM.tilesGrid) return; // If on a coming-soon page or home

    const catConfig = window.KEETYPE_CONFIG.categories.find(c => c.id === state.currentCategory);
    if (!catConfig) return;

    if (catConfig.status === "coming-soon") {
      if (DOM.filterToolbar) DOM.filterToolbar.style.display = "none";
      if (DOM.resultsBar) DOM.resultsBar.style.display = "none";
      DOM.tilesGrid.style.display = "none";
      if (DOM.emptyState) DOM.emptyState.classList.remove("visible");
      if (DOM.comingSoonState) DOM.comingSoonState.classList.add("visible");
      return;
    }

    if (DOM.comingSoonState) DOM.comingSoonState.classList.remove("visible");
    if (DOM.filterToolbar) DOM.filterToolbar.style.display = "flex";
    if (DOM.resultsBar) DOM.resultsBar.style.display = "flex";
    DOM.tilesGrid.style.display = "grid";

    renderFilterControls();
    renderSortOptions();
    applyAndRenderProducts();
  }

  // ==========================================================================
  // Dynamic Filters & Sorting Controls
  // ==========================================================================

  function renderFilterControls() {
    if (!DOM.filterContainer) return;
    DOM.filterContainer.innerHTML = "";
    const catId = state.currentCategory;

    if (catId === "keyboards") {
      DOM.filterContainer.appendChild(createFilterSelect("size", "Size", ["All", "TKL", "75%", "65%", "60%"]));
      DOM.filterContainer.appendChild(createFilterSelect("category", "Tier", ["All", "Flagship", "Mid-range", "Budget"]));
      DOM.filterContainer.appendChild(createFilterSelect("caseMaterial", "Case", ["All", "Metal", "Plastic"]));
    } else if (catId === "mousepads") {
      DOM.filterContainer.appendChild(createFilterSelect("category", "Speed", ["All", "Ultra Speed", "Speed", "Control"]));
      DOM.filterContainer.appendChild(createFilterSelect("coating", "Coating", ["All", "Coated", "Uncoated"]));
      DOM.filterContainer.appendChild(createFilterSelect("availability", "Stock", ["All", "In Stock Only (Yes)"]));
    } else if (catId === "skates") {
      DOM.filterContainer.appendChild(createFilterSelect("surface", "Surface", ["All Skates", "For Cloth Pads", "For Glass Pads"]));
      DOM.filterContainer.appendChild(createFilterSelect("speed", "Speed", ["All", "Ultra-fast", "Fast", "Medium-fast", "Medium", "Medium-control", "Control"]));
      DOM.filterContainer.appendChild(createFilterSelect("material", "Material", ["All", "PTFE", "POM", "UHMW-PE"]));
    }

    updateResetBtnVisibility();
  }

  function createFilterSelect(filterKey, labelText, options) {
    const wrap = document.createElement("div");
    wrap.className = "filter-group";

    const select = document.createElement("select");
    select.className = "filter-select";
    select.dataset.filterKey = filterKey;

    options.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt === "All" || opt === "All Skates" ? `${labelText}: ${opt}` : opt;
      if (state.activeFilters[filterKey] === opt) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val === "All" || val === "All Skates") {
        delete state.activeFilters[filterKey];
      } else {
        state.activeFilters[filterKey] = val;
      }
      updateResetBtnVisibility();
      applyAndRenderProducts();
    });

    wrap.appendChild(select);
    return wrap;
  }

  function updateResetBtnVisibility() {
    const hasActiveFilters = Object.keys(state.activeFilters).length > 0 || Boolean(state.searchQuery);
    if (DOM.resetFiltersBtn) {
      DOM.resetFiltersBtn.style.opacity = hasActiveFilters ? "1" : "0.5";
      DOM.resetFiltersBtn.style.pointerEvents = hasActiveFilters ? "auto" : "none";
    }
  }

  function renderSortOptions() {
    if (!DOM.sortSelect) return;
    DOM.sortSelect.innerHTML = "";
    const catId = state.currentCategory;

    let options = [];
    if (catId === "keyboards") {
      options = [
        { value: "default", label: "Rank (Best → Worst)" },
        { value: "name_asc", label: "Model (A → Z)" },
        { value: "name_desc", label: "Model (Z → A)" },
        { value: "tier_desc", label: "Performance Tier" }
      ];
    } else if (catId === "mousepads") {
      options = [
        { value: "default", label: "Speed (Fast → Control)" },
        { value: "name_asc", label: "Name (A → Z)" },
        { value: "avail", label: "In Stock First" }
      ];
    } else if (catId === "skates") {
      options = [
        { value: "default", label: "Sheet Order" },
        { value: "name_asc", label: "Name (A → Z)" },
        { value: "cloth_speed", label: "Cloth Speed" },
        { value: "glass_speed", label: "Glass Speed" }
      ];
    }

    options.forEach(opt => {
      const el = document.createElement("option");
      el.value = opt.value;
      el.textContent = opt.label;
      if (state.currentSort === opt.value) el.selected = true;
      DOM.sortSelect.appendChild(el);
    });
  }

  // ==========================================================================
  // Filter & Sort Logic
  // ==========================================================================

  function getFilteredAndSortedProducts() {
    if (!state.data) return [];
    let list = state.data[state.currentCategory] || [];

    // Search query filtering
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      list = list.filter(p => {
        return (
          (p.model && p.model.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.notes && p.notes.toLowerCase().includes(q)) ||
          (p.id && p.id.toLowerCase().includes(q)) ||
          (p.caseMaterial && p.caseMaterial.toLowerCase().includes(q)) ||
          (p.material && p.material.toLowerCase().includes(q))
        );
      });
    }

    // Active Category-specific Filters
    for (const [key, val] of Object.entries(state.activeFilters)) {
      if (!val || val === "All" || val === "All Skates") continue;

      list = list.filter(p => {
        if (key === "size") {
          return p.size && p.size.toLowerCase() === val.toLowerCase();
        }
        if (key === "category") {
          return p.category && p.category.toLowerCase().includes(val.toLowerCase());
        }
        if (key === "caseMaterial") {
          return p.caseMaterial && p.caseMaterial.toLowerCase().includes(val.toLowerCase());
        }
        if (key === "coating") {
          return p.coating && p.coating.toLowerCase().includes(val.toLowerCase());
        }
        if (key === "availability") {
          return p.availability && p.availability.toLowerCase().startsWith("yes");
        }
        if (key === "surface") {
          if (val === "For Cloth Pads") return Boolean(p.clothSpeed);
          if (val === "For Glass Pads") return Boolean(p.glassSpeed);
          return true;
        }
        if (key === "speed") {
          const sCloth = (p.clothSpeed || "").toLowerCase();
          const sGlass = (p.glassSpeed || "").toLowerCase();
          const target = val.toLowerCase();
          return sCloth.includes(target) || sGlass.includes(target);
        }
        if (key === "material") {
          return p.material && p.material.toLowerCase().includes(val.toLowerCase());
        }
        return true;
      });
    }

    // Sorting
    const sorted = [...list];
    const sortVal = state.currentSort;

    if (sortVal === "name_asc") {
      sorted.sort((a, b) => (a.model || "").localeCompare(b.model || ""));
    } else if (sortVal === "name_desc") {
      sorted.sort((a, b) => (b.model || "").localeCompare(a.model || ""));
    } else if (sortVal === "tier_desc") {
      sorted.sort((a, b) => Number(b.tier || 0) - Number(a.tier || 0));
    } else if (sortVal === "avail") {
      sorted.sort((a, b) => {
        const aYes = (a.availability || "").toLowerCase().startsWith("yes") ? 1 : 0;
        const bYes = (b.availability || "").toLowerCase().startsWith("yes") ? 1 : 0;
        return bYes - aYes;
      });
    } else if (sortVal === "cloth_speed") {
      sorted.sort((a, b) => {
        const rA = SPEED_RANKS[(a.clothSpeed || "").toLowerCase()] || 99;
        const rB = SPEED_RANKS[(b.clothSpeed || "").toLowerCase()] || 99;
        return rA - rB;
      });
    } else if (sortVal === "glass_speed") {
      sorted.sort((a, b) => {
        const rA = SPEED_RANKS[(a.glassSpeed || "").toLowerCase()] || 99;
        const rB = SPEED_RANKS[(b.glassSpeed || "").toLowerCase()] || 99;
        return rA - rB;
      });
    }

    return sorted;
  }

  function applyAndRenderProducts() {
    if (!DOM.tilesGrid) return;
    const products = getFilteredAndSortedProducts();
    const catConfig = window.KEETYPE_CONFIG.categories.find(c => c.id === state.currentCategory);

    // Update Header Text: "showing x items in {category name}"
    if (DOM.pageTitle) {
      DOM.pageTitle.textContent = catConfig ? catConfig.name : "";
    }
    if (DOM.countPill) {
      DOM.countPill.textContent = `${products.length} items`;
    }
    if (DOM.pageSubtitle) {
      const meta = state.data?.meta?.[state.currentCategory];
      const updateStr = meta?.lastUpdate ? ` • Updated ${meta.lastUpdate}` : "";
      DOM.pageSubtitle.textContent = `${catConfig?.description || ""}${updateStr}`;
    }

    // Empty State Check: "add a text 'No products found' when there are no products matching the filters or search query."
    if (products.length === 0) {
      DOM.tilesGrid.style.display = "none";
      if (DOM.emptyState) DOM.emptyState.classList.add("visible");
      return;
    }

    if (DOM.emptyState) DOM.emptyState.classList.remove("visible");
    DOM.tilesGrid.style.display = "grid";
    DOM.tilesGrid.innerHTML = "";

    products.forEach(p => {
      const tile = createProductTile(p);
      DOM.tilesGrid.appendChild(tile);
    });
  }

  // ==========================================================================
  // Product Tile Element Construction (Minimal & Clean)
  // ==========================================================================

  function createProductTile(product) {
    const tile = document.createElement("article");
    tile.className = "product-tile";
    tile.dataset.id = product.id;

    // 1. Preview Box (Square Preview)
    const previewContainer = document.createElement("div");
    previewContainer.className = "preview-container";
    previewContainer.title = "View details";

    const images = Array.isArray(product.images) ? product.images : [];
    let currentImageIndex = 0;

    if (images.length === 0) {
      previewContainer.innerHTML = `
        <div class="preview-placeholder">
          <div class="preview-placeholder-name">${escapeHTML(product.model)}</div>
        </div>
      `;
    } else {
      const img = document.createElement("img");
      img.className = "preview-image";
      img.src = images[0];
      img.alt = product.model;
      img.loading = "lazy";
      previewContainer.appendChild(img);

      if (images.length > 1) {
        const controls = document.createElement("div");
        controls.className = "carousel-controls has-multiple";

        const prevBtn = document.createElement("button");
        prevBtn.className = "carousel-btn";
        prevBtn.innerHTML = "‹";
        prevBtn.title = "Previous image";
        prevBtn.onclick = (e) => {
          e.stopPropagation();
          currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
          img.src = images[currentImageIndex];
          updateDots();
        };

        const nextBtn = document.createElement("button");
        nextBtn.className = "carousel-btn";
        nextBtn.innerHTML = "›";
        nextBtn.title = "Next image";
        nextBtn.onclick = (e) => {
          e.stopPropagation();
          currentImageIndex = (currentImageIndex + 1) % images.length;
          img.src = images[currentImageIndex];
          updateDots();
        };

        controls.appendChild(prevBtn);
        controls.appendChild(nextBtn);
        previewContainer.appendChild(controls);

        const dots = document.createElement("div");
        dots.className = "carousel-dots has-multiple";
        images.forEach((_, idx) => {
          const dot = document.createElement("span");
          dot.className = `carousel-dot ${idx === 0 ? "active" : ""}`;
          dots.appendChild(dot);
        });
        previewContainer.appendChild(dots);

        function updateDots() {
          dots.querySelectorAll(".carousel-dot").forEach((d, i) => {
            d.classList.toggle("active", i === currentImageIndex);
          });
        }
      }
    }

    // Discreet ID badge
    const idBadge = document.createElement("div");
    idBadge.className = "tile-id-badge";
    idBadge.textContent = `#${product.id}`;
    previewContainer.appendChild(idBadge);

    previewContainer.addEventListener("click", () => openProductModal(product));
    tile.appendChild(previewContainer);

    // 2. Tile Content
    const content = document.createElement("div");
    content.className = "tile-content";

    // Title / Model name
    const header = document.createElement("div");
    header.className = "tile-header";
    const title = document.createElement("h3");
    title.className = "tile-title";
    title.textContent = product.model;
    title.addEventListener("click", () => openProductModal(product));
    header.appendChild(title);
    content.appendChild(header);

    // Category Tags
    const tagsContainer = document.createElement("div");
    tagsContainer.className = "tile-tags";

    let specsInlineText = "";

    if (product.type === "keyboards") {
      if (product.category) tagsContainer.appendChild(createTag(product.category));
      if (product.size) tagsContainer.appendChild(createTag(product.size));
      if (product.tier) tagsContainer.appendChild(createTag(`Tier ${product.tier}`, "tag-tier"));
      if (product.caseMaterial) specsInlineText = `${product.caseMaterial} case`;
    } else if (product.type === "mousepads") {
      if (product.category) tagsContainer.appendChild(createTag(product.category));
      if (product.coating) tagsContainer.appendChild(createTag(product.coating));
      if (product.availability) {
        const avail = product.availability.toLowerCase();
        let availClass = "tag-avail-yes";
        if (avail.startsWith("no")) availClass = "tag-avail-no";
        else if (avail.includes("region")) availClass = "tag-avail-region";
        tagsContainer.appendChild(createTag(product.availability, availClass));
      }
    } else if (product.type === "skates") {
      const currentSurfaceFilter = state.activeFilters["surface"];

      if (currentSurfaceFilter === "For Cloth Pads") {
        if (product.clothSpeed) tagsContainer.appendChild(createTag(`Cloth: ${product.clothSpeed}`, "tag-speed-cloth"));
      } else if (currentSurfaceFilter === "For Glass Pads") {
        if (product.glassSpeed) tagsContainer.appendChild(createTag(`Glass: ${product.glassSpeed}`, "tag-speed-glass"));
      } else {
        if (product.clothSpeed) tagsContainer.appendChild(createTag(`Cloth: ${product.clothSpeed}`, "tag-speed-cloth"));
        if (product.glassSpeed) tagsContainer.appendChild(createTag(`Glass: ${product.glassSpeed}`, "tag-speed-glass"));
      }

      if (product.material) tagsContainer.appendChild(createTag(product.material));

      const specParts = [product.format, product.texture, product.foam ? `foam: ${product.foam}` : ""].filter(Boolean);
      specsInlineText = specParts.join(" • ");
    }

    content.appendChild(tagsContainer);

    if (specsInlineText) {
      const specsEl = document.createElement("div");
      specsEl.className = "tile-specs-inline";
      specsEl.textContent = specsInlineText;
      content.appendChild(specsEl);
    }

    if (product.notes) {
      const notesEl = document.createElement("div");
      notesEl.className = "tile-notes-snippet";
      notesEl.textContent = product.notes;
      content.appendChild(notesEl);
    }

    // Action buttons
    const actions = document.createElement("div");
    actions.className = "tile-actions";

    const refBtn = document.createElement("a");
    refBtn.className = "btn-tile btn-referral";
    if (product.referralLink) {
      refBtn.href = product.referralLink;
      refBtn.target = "_blank";
      refBtn.rel = "noopener noreferrer";
      refBtn.innerHTML = `<span>Buy / Link</span>`;
    } else {
      refBtn.classList.add("disabled");
      refBtn.innerHTML = `<span>View Item</span>`;
      refBtn.onclick = (e) => {
        e.preventDefault();
        openProductModal(product);
      };
    }

    const copyBtn = document.createElement("button");
    copyBtn.className = "btn-tile btn-copy-code";
    const refCode = product.referralCode || window.KEETYPE_CONFIG.defaultReferralCode;
    copyBtn.title = `Copy referral code (${refCode})`;
    copyBtn.innerHTML = `<span>Copy Code</span>`;
    copyBtn.onclick = () => copyReferralCode(refCode, product.model);

    actions.appendChild(refBtn);
    actions.appendChild(copyBtn);
    content.appendChild(actions);

    tile.appendChild(content);
    return tile;
  }

  function createTag(text, customClass = "") {
    const span = document.createElement("span");
    span.className = `tag ${customClass}`;
    span.textContent = text;
    return span;
  }

  // ==========================================================================
  // Clipboard Copy & Toast Feedback
  // ==========================================================================

  function copyReferralCode(code, productName = "") {
    if (!code) {
      showToast("No referral code configured.");
      return;
    }
    navigator.clipboard.writeText(code).then(() => {
      showToast(`Copied code: "${code}"`);
    }).catch(err => {
      console.warn("Clipboard write failed:", err);
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast(`Copied code: "${code}"`);
    });
  }

  let toastTimer = null;
  function showToast(message) {
    if (!DOM.toast) return;
    DOM.toast.textContent = message;
    DOM.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      DOM.toast.classList.remove("show");
    }, 2400);
  }

  // ==========================================================================
  // Search Autocomplete Suggestions & Instant Popup
  // ==========================================================================

  function setupSearchLogic() {
    if (!DOM.searchInput) return;

    DOM.searchInput.addEventListener("input", (e) => {
      const q = e.target.value;
      state.searchQuery = q;
      if (DOM.searchClearBtn) {
        DOM.searchClearBtn.classList.toggle("visible", Boolean(q));
      }

      updateResetBtnVisibility();
      if (state.pageType !== "home") {
        applyAndRenderProducts();
      }
      renderSearchSuggestions(q);
    });

    DOM.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const q = DOM.searchInput.value.trim().toLowerCase();
        const match = findProductExactOrFirst(q);
        if (match) {
          closeSearchSuggestions();
          openProductModal(match);
        }
      } else if (e.key === "Escape") {
        closeSearchSuggestions();
      }
    });

    if (DOM.searchClearBtn) {
      DOM.searchClearBtn.addEventListener("click", () => {
        DOM.searchInput.value = "";
        state.searchQuery = "";
        DOM.searchClearBtn.classList.remove("visible");
        closeSearchSuggestions();
        updateResetBtnVisibility();
        if (state.pageType !== "home") {
          applyAndRenderProducts();
        }
      });
    }

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".header-search")) {
        closeSearchSuggestions();
      }
    });

    // "Feeling Lucky" button on home page: picks random gear
    if (DOM.randomGearBtn) {
      DOM.randomGearBtn.addEventListener("click", () => {
        const all = getAllProductsList();
        if (all.length === 0) return;
        const randomItem = all[Math.floor(Math.random() * all.length)];
        openProductModal(randomItem);
        showToast(`Random pick: ${randomItem.model}!`);
      });
    }
  }

  function getAllProductsList() {
    if (!state.data) return [];
    return [
      ...(state.data.keyboards || []),
      ...(state.data.mousepads || []),
      ...(state.data.skates || [])
    ];
  }

  function findProductExactOrFirst(query) {
    if (!query) return null;
    const all = getAllProductsList();
    const exact = all.find(p => (p.model && p.model.toLowerCase() === query) || (p.id && p.id.toLowerCase() === query));
    if (exact) return exact;
    const starts = all.find(p => p.model && p.model.toLowerCase().startsWith(query));
    if (starts) return starts;
    return all.find(p => p.model && p.model.toLowerCase().includes(query));
  }

  function renderSearchSuggestions(query) {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 1) {
      closeSearchSuggestions();
      return;
    }

    const all = getAllProductsList();
    const matches = all.filter(p => {
      return (
        (p.model && p.model.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q))
      );
    }).slice(0, 7);

    if (matches.length === 0) {
      closeSearchSuggestions();
      return;
    }

    DOM.searchSuggestions.innerHTML = "";
    matches.forEach(product => {
      const item = document.createElement("div");
      item.className = "suggestion-item";

      const categoryLabel = product.type === "keyboards" ? "HE Keyboard" : (product.type === "mousepads" ? "Glass Pad" : "Skates");

      const modelName = product.model;
      const regex = new RegExp(`(${escapeRegExp(q)})`, "gi");
      const highlighted = modelName.replace(regex, `<span class="suggestion-highlight">$1</span>`);

      item.innerHTML = `
        <div class="suggestion-info">
          <div class="suggestion-name">${highlighted}</div>
          <div class="suggestion-meta">#${product.id} • ${product.category || product.clothSpeed || ""}</div>
        </div>
        <span class="suggestion-badge">${categoryLabel}</span>
      `;

      item.addEventListener("click", () => {
        closeSearchSuggestions();
        DOM.searchInput.value = product.model;
        state.searchQuery = product.model;
        if (DOM.searchClearBtn) DOM.searchClearBtn.classList.add("visible");
        
        // Open the full product modal
        openProductModal(product);
      });

      DOM.searchSuggestions.appendChild(item);
    });

    DOM.searchSuggestions.classList.add("open");
  }

  function closeSearchSuggestions() {
    if (DOM.searchSuggestions) {
      DOM.searchSuggestions.classList.remove("open");
      DOM.searchSuggestions.innerHTML = "";
    }
  }

  // ==========================================================================
  // Product Detail Modal Popup
  // ==========================================================================

  function openProductModal(product) {
    if (!DOM.productModal || !DOM.modalBody) return;
    state.modalProduct = product;

    const images = Array.isArray(product.images) ? product.images : [];
    let modalImageIndex = 0;

    let previewHTML = "";
    if (images.length === 0) {
      previewHTML = `
        <div class="preview-placeholder">
          <div class="preview-placeholder-name">${escapeHTML(product.model)}</div>
        </div>
      `;
    } else {
      previewHTML = `
        <img id="modalPreviewImg" class="preview-image" src="${images[0]}" alt="${escapeHTML(product.model)}" />
        ${images.length > 1 ? `
          <div class="carousel-controls has-multiple">
            <button id="modalPrevImgBtn" class="carousel-btn">‹</button>
            <button id="modalNextImgBtn" class="carousel-btn">›</button>
          </div>
          <div id="modalCarouselDots" class="carousel-dots has-multiple">
            ${images.map((_, i) => `<span class="carousel-dot ${i === 0 ? "active" : ""}"></span>`).join("")}
          </div>
        ` : ""}
      `;
    }

    let tagsHTML = "";
    if (product.category) tagsHTML += `<span class="tag">${escapeHTML(product.category)}</span>`;
    if (product.size) tagsHTML += `<span class="tag">${escapeHTML(product.size)}</span>`;
    if (product.tier) tagsHTML += `<span class="tag tag-tier">Tier ${escapeHTML(product.tier)}</span>`;
    if (product.coating) tagsHTML += `<span class="tag">${escapeHTML(product.coating)}</span>`;
    if (product.availability) {
      const avail = product.availability.toLowerCase();
      let availClass = avail.startsWith("no") ? "tag-avail-no" : (avail.includes("region") ? "tag-avail-region" : "tag-avail-yes");
      tagsHTML += `<span class="tag ${availClass}">${escapeHTML(product.availability)}</span>`;
    }
    if (product.clothSpeed) tagsHTML += `<span class="tag tag-speed-cloth">Cloth: ${escapeHTML(product.clothSpeed)}</span>`;
    if (product.glassSpeed) tagsHTML += `<span class="tag tag-speed-glass">Glass: ${escapeHTML(product.glassSpeed)}</span>`;
    if (product.material) tagsHTML += `<span class="tag">${escapeHTML(product.material)}</span>`;

    let specsRows = "";
    if (product.caseMaterial) specsRows += `<tr><th>Case Material</th><td>${escapeHTML(product.caseMaterial)}</td></tr>`;
    if (product.format) specsRows += `<tr><th>Format</th><td>${escapeHTML(product.format)}</td></tr>`;
    if (product.texture) specsRows += `<tr><th>Texture</th><td>${escapeHTML(product.texture)}</td></tr>`;
    if (product.foam) specsRows += `<tr><th>Foam</th><td>${escapeHTML(product.foam)}</td></tr>`;
    if (product.lastUpdate) specsRows += `<tr><th>Last Updated</th><td>${escapeHTML(product.lastUpdate)}</td></tr>`;

    const refCode = product.referralCode || window.KEETYPE_CONFIG.defaultReferralCode;
    const refLink = product.referralLink || "";

    DOM.modalBody.innerHTML = `
      <div class="modal-preview-area">
        ${previewHTML}
      </div>
      <div class="modal-info">
        <div class="modal-title-row">
          <h2 class="modal-title">${escapeHTML(product.model)}</h2>
          <span class="modal-id-badge">#${escapeHTML(product.id)}</span>
        </div>
        <div class="modal-tags">${tagsHTML}</div>
        ${specsRows ? `<table class="modal-specs-table"><tbody>${specsRows}</tbody></table>` : ""}
        ${product.notes ? `<div class="modal-notes-box"><strong>Notes:</strong><br>${escapeHTML(product.notes)}</div>` : ""}
        <div class="modal-actions">
          ${refLink ? `
            <a href="${refLink}" target="_blank" rel="noopener noreferrer" class="btn-tile btn-referral">
              Buy / Store Link
            </a>
          ` : `
            <button class="btn-tile btn-referral disabled">No Link Configured</button>
          `}
          <button id="modalCopyCodeBtn" class="btn-tile btn-copy-code">
            Copy Code (${escapeHTML(refCode)})
          </button>
        </div>
      </div>
    `;

    if (images.length > 1) {
      const modalImg = document.getElementById("modalPreviewImg");
      const prevBtn = document.getElementById("modalPrevImgBtn");
      const nextBtn = document.getElementById("modalNextImgBtn");
      const dotsEl = document.getElementById("modalCarouselDots");

      function updateModalImg() {
        modalImg.src = images[modalImageIndex];
        if (dotsEl) {
          dotsEl.querySelectorAll(".carousel-dot").forEach((d, i) => {
            d.classList.toggle("active", i === modalImageIndex);
          });
        }
      }

      if (prevBtn) {
        prevBtn.onclick = () => {
          modalImageIndex = (modalImageIndex - 1 + images.length) % images.length;
          updateModalImg();
        };
      }
      if (nextBtn) {
        nextBtn.onclick = () => {
          modalImageIndex = (modalImageIndex + 1) % images.length;
          updateModalImg();
        };
      }
    }

    const copyBtn = document.getElementById("modalCopyCodeBtn");
    if (copyBtn) {
      copyBtn.onclick = () => copyReferralCode(refCode, product.model);
    }

    DOM.productModal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeProductModal() {
    if (!DOM.productModal) return;
    DOM.productModal.classList.remove("open");
    document.body.style.overflow = "";
    state.modalProduct = null;
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  function setupEventListeners() {
    setupSearchLogic();

    if (DOM.sortSelect) {
      DOM.sortSelect.addEventListener("change", (e) => {
        state.currentSort = e.target.value;
        applyAndRenderProducts();
      });
    }

    // Reset all filters button
    if (DOM.resetFiltersBtn) {
      DOM.resetFiltersBtn.addEventListener("click", () => {
        state.activeFilters = {};
        state.currentSort = "default";
        state.searchQuery = "";
        if (DOM.searchInput) DOM.searchInput.value = "";
        if (DOM.searchClearBtn) DOM.searchClearBtn.classList.remove("visible");
        closeSearchSuggestions();
        renderFilterControls();
        renderSortOptions();
        applyAndRenderProducts();
        showToast("Filters cleared");
      });
    }

    // Database Source Selection
    if (DOM.dbSourceSelect) {
      DOM.dbSourceSelect.addEventListener("change", async (e) => {
        const newSource = e.target.value;
        try {
          state.data = await window.KeetypeFetcher.setSource(newSource);
          if (state.pageType === "home") {
            updateHomeLiveCounts();
          } else {
            applyAndRenderProducts();
          }
          showToast(`Active DB: ${newSource === "google_sheets" ? "Google Sheets" : "Fallback DB"}`);
        } catch (err) {
          console.error("Failed to switch database:", err);
          showToast("Failed to switch database: " + err.message);
        }
      });
    }

    // Sync button
    if (DOM.syncDbBtn) {
      DOM.syncDbBtn.addEventListener("click", async () => {
        DOM.syncDbBtn.classList.add("spinning");
        try {
          state.data = await window.KeetypeFetcher.loadData("google_sheets");
          if (state.pageType === "home") {
            updateHomeLiveCounts();
          } else {
            applyAndRenderProducts();
          }
          showToast("Synced from Google Sheets");
        } catch (err) {
          console.error("Sync failed:", err);
          showToast("Sync failed: " + err.message);
        } finally {
          DOM.syncDbBtn.classList.remove("spinning");
        }
      });
    }

    // Modal Close button & backdrop click
    if (DOM.modalCloseBtn) {
      DOM.modalCloseBtn.addEventListener("click", closeProductModal);
    }
    if (DOM.productModal) {
      DOM.productModal.addEventListener("click", (e) => {
        if (e.target === DOM.productModal) closeProductModal();
      });
    }

    // Keyboard ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeProductModal();
      }
    });
  }

  // ==========================================================================
  // Helper Utilities
  // ==========================================================================

  function escapeHTML(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
