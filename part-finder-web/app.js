(function () {
  const pageMode = (document.body.dataset.mode || "user").toLowerCase();
  const urlParams = new URLSearchParams(window.location.search);
  const state = {
    datasetName: "Sample Parts",
    datasetSource: "",
    parts: [],
    results: [],
    activeToken: null
  };

  const els = {
    query: document.getElementById("part-query"),
    results: document.getElementById("results"),
    status: document.getElementById("status-message"),
    detailsGrid: document.getElementById("details-grid"),
    detailTitle: document.getElementById("detail-title"),
    detailSubtitle: document.getElementById("detail-subtitle"),
    datasetName: document.getElementById("dataset-name"),
    datasetMeta: document.getElementById("dataset-meta"),
    sourceSummary: document.getElementById("source-summary"),
    fileInput: document.getElementById("json-file"),
    findButton: document.getElementById("find-button"),
    clearButton: document.getElementById("clear-button"),
    sampleButton: document.getElementById("sample-button"),
    sourceUrl: document.getElementById("source-url"),
    loadSourceButton: document.getElementById("load-source-button"),
    generateLinkButton: document.getElementById("generate-link-button"),
    generatedLink: document.getElementById("generated-link"),
    copyLinkButton: document.getElementById("copy-link-button")
  };

  function normalizeKey(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/[^A-Z0-9.]/g, "");
  }

  function presentOrDash(value) {
    const text = String(value == null ? "" : value).trim();
    return text === "" ? "-" : text;
  }

  function searchableValuesForMode(record) {
    return [record.display_code, record.persistent_id].map(String).filter(Boolean);
  }

  function recordMatchScore(record, rawQuery, normalizedQuery) {
    const searchableValues = searchableValuesForMode(record);

    if (!searchableValues.length) return null;

    const rawUpper = String(rawQuery || "").toUpperCase();

    if (searchableValues.some((value) => normalizeKey(value) === normalizedQuery)) return 0;
    if (searchableValues.some((value) => String(value).toUpperCase() === rawUpper)) return 1;
    if (searchableValues.some((value) => normalizeKey(value).startsWith(normalizedQuery))) return 2;
    if (searchableValues.some((value) => String(value).toUpperCase().startsWith(rawUpper))) return 3;
    if (searchableValues.some((value) => normalizeKey(value).includes(normalizedQuery))) return 4;
    if (searchableValues.some((value) => String(value).toUpperCase().includes(rawUpper))) return 5;

    return null;
  }

  function ensureToken(record, index) {
    if (record.token && String(record.token).trim() !== "") return String(record.token);
    if (record.persistent_id && String(record.persistent_id).trim() !== "") return "pid:" + String(record.persistent_id);
    return "row:" + index;
  }

  function normalizeRecord(record, index) {
    return {
      token: ensureToken(record, index),
      display_code: presentOrDash(record.display_code),
      entity_name: presentOrDash(record.entity_name),
      definition_name: presentOrDash(record.definition_name),
      part_name: presentOrDash(record.part_name),
      item_code: presentOrDash(record.item_code),
      material: presentOrDash(record.material),
      sub: presentOrDash(record.sub),
      assembly_no: presentOrDash(record.assembly_no),
      unit: presentOrDash(record.unit),
      floor: presentOrDash(record.floor),
      room: presentOrDash(record.room),
      path_text: presentOrDash(record.path_text),
      lenx_mm: presentOrDash(record.lenx_mm),
      leny_mm: presentOrDash(record.leny_mm),
      lenz_mm: presentOrDash(record.lenz_mm),
      width_mm: presentOrDash(record.width_mm),
      depth_mm: presentOrDash(record.depth_mm),
      height_mm: presentOrDash(record.height_mm),
      persistent_id: presentOrDash(record.persistent_id),
      full_label: presentOrDash(record.full_label)
    };
  }

  function loadDataset(payload, fallbackName) {
    const parsed = Array.isArray(payload) ? { meta: {}, parts: payload } : payload || {};
    const modelName = (parsed.meta && parsed.meta.model_name) || fallbackName || "Loaded Parts";
    const parts = Array.isArray(parsed.parts) ? parsed.parts : [];

    state.datasetName = modelName;
    state.parts = parts.map(normalizeRecord);
    state.results = [];
    state.activeToken = null;

    els.datasetName.textContent = modelName;
    els.datasetMeta.textContent = `${state.parts.length} searchable parts`;
    refreshSourceSummary();
    resetSearchUi(pageMode === "user" ? "Enter a part number or Persistent ID to search." : "Dataset loaded. Try a preview search.");
  }

  function resetSearchUi(message) {
    els.results.innerHTML = "";
    els.detailsGrid.innerHTML = "";
    els.detailTitle.textContent = "Part Details";
    els.detailSubtitle.textContent = pageMode === "user"
      ? "Search for a Part Number or Persistent ID to inspect it here."
      : "Load a dataset and preview the same Part Number / Persistent ID search that users will see.";
    els.status.textContent = message || "Enter a part number to search.";
  }

  function renderResults() {
    els.results.innerHTML = "";

    state.results.forEach((item) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "result-card" + (item.token === state.activeToken ? " active" : "");
      card.innerHTML = `
        <div class="result-code">${escapeHtml(item.display_code)}</div>
        <div class="result-line"><strong>Instance:</strong> ${escapeHtml(item.entity_name)}</div>
        <div class="result-line"><strong>Part:</strong> ${escapeHtml(item.part_name)}</div>
        <div class="result-line"><strong>Room:</strong> ${escapeHtml(item.room)}</div>
        <div class="result-line"><strong>Path:</strong> ${escapeHtml(item.path_text)}</div>
      `;
      card.addEventListener("click", () => selectResult(item.token));
      els.results.appendChild(card);
    });
  }

  function renderDetails(item) {
    const fields = [
      ["Display Code", item.display_code],
      ["Instance Name", item.entity_name],
      ["Definition Name", item.definition_name],
      ["Part Name", item.part_name],
      ["Item Code", item.item_code],
      ["Material", item.material],
      ["Sub Assembly", item.sub],
      ["Assembly Number", item.assembly_no],
      ["Unit", item.unit],
      ["Floor", item.floor],
      ["Room", item.room],
      ["Path", item.path_text],
      ["Len X (mm)", item.lenx_mm],
      ["Len Y (mm)", item.leny_mm],
      ["Len Z (mm)", item.lenz_mm],
      ["Width (mm)", item.width_mm],
      ["Depth (mm)", item.depth_mm],
      ["Height (mm)", item.height_mm],
      ["Persistent ID", item.persistent_id]
    ];

    els.detailTitle.textContent = item.display_code;
    els.detailSubtitle.textContent = `${item.entity_name} | ${item.part_name}`;
    els.detailsGrid.innerHTML = fields.map(([key, value]) => `
      <div class="detail-card">
        <div class="detail-key">${escapeHtml(key)}</div>
        <div class="detail-value">${escapeHtml(value)}</div>
      </div>
    `).join("");
  }

  function selectResult(token) {
    state.activeToken = token;
    const item = state.results.find((entry) => entry.token === token);
    renderResults();
    if (item) renderDetails(item);
  }

  function performSearch() {
    const query = els.query.value.trim();
    if (!query) {
      state.results = [];
      state.activeToken = null;
      resetSearchUi(pageMode === "user" ? "Enter a part number or Persistent ID to search." : "Enter a part number or Persistent ID to preview.");
      return;
    }

    const normalizedQuery = normalizeKey(query);
    const results = [];

    state.parts.forEach((record) => {
      const score = recordMatchScore(record, query, normalizedQuery);
      if (score == null) return;
      results.push({ ...record, score });
    });

    results.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.display_code !== b.display_code) return a.display_code.localeCompare(b.display_code);
      if (a.entity_name !== b.entity_name) return a.entity_name.localeCompare(b.entity_name);
      return a.path_text.localeCompare(b.path_text);
    });

    state.results = results.slice(0, 100);

    if (!state.results.length) {
      state.activeToken = null;
      els.results.innerHTML = "";
      els.detailsGrid.innerHTML = "";
      els.detailTitle.textContent = "Part Details";
      els.detailSubtitle.textContent = "No result selected.";
      els.status.textContent = `No parts matched "${query}".`;
      return;
    }

    state.activeToken = state.results[0].token;
    els.status.textContent = `Found ${results.length} matching part${results.length === 1 ? "" : "s"} for "${query}".`;
    renderResults();
    renderDetails(state.results[0]);
  }

  function clearSearch() {
    els.query.value = "";
    state.results = [];
    state.activeToken = null;
    resetSearchUi(pageMode === "user" ? "Enter a part number or Persistent ID to search." : "Enter a part number or Persistent ID to preview.");
  }

  function refreshSourceSummary() {
    if (!els.sourceSummary) return;

    if (!state.datasetSource) {
      els.sourceSummary.textContent = "No shared dataset connected yet.";
      return;
    }

    els.sourceSummary.textContent = `Shared source: ${state.datasetSource}`;
  }

  function extractGoogleDriveFileId(url) {
    try {
      const parsed = new URL(url);
      if (!/drive\.google\.com$/i.test(parsed.hostname)) return null;

      const directId = parsed.searchParams.get("id");
      if (directId) return directId;

      const match = parsed.pathname.match(/\/file\/d\/([^/]+)/i);
      if (match) return match[1];

      return null;
    } catch (_error) {
      return null;
    }
  }

  function isGoogleDriveFolderLink(url) {
    try {
      const parsed = new URL(url);
      if (!/drive\.google\.com$/i.test(parsed.hostname)) return false;
      return /\/drive\/folders\/[^/]+/i.test(parsed.pathname) || /\/folders\/[^/]+/i.test(parsed.pathname);
    } catch (_error) {
      return false;
    }
  }

  function resolveSourceUrl(source) {
    const raw = String(source || "").trim();
    if (!raw) return "";

    if (isGoogleDriveFolderLink(raw)) {
      throw new Error("Google Drive folder links are not supported here. Paste the shared JSON file link from inside that folder.");
    }

    try {
      const parsed = new URL(raw);
      if (/drive\.google\.com$/i.test(parsed.hostname)) {
        const fileId = extractGoogleDriveFileId(raw);
        if (!fileId) return raw;

        const resourceKey = parsed.searchParams.get("resourcekey");
        const direct = new URL("https://drive.google.com/uc");
        direct.searchParams.set("export", "download");
        direct.searchParams.set("id", fileId);
        if (resourceKey) direct.searchParams.set("resourcekey", resourceKey);
        return direct.toString();
      }

      return raw;
    } catch (_error) {
      return raw;
    }
  }

  async function loadDatasetFromSource(source) {
    const raw = String(source || "").trim();
    if (!raw) {
      resetSearchUi("Paste a shared JSON link first.");
      return;
    }

    try {
      const resolved = resolveSourceUrl(raw);
      const response = await fetch(resolved, { method: "GET" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      state.datasetSource = raw;
      loadDataset(payload, "Shared Parts");

      if (els.sourceUrl) els.sourceUrl.value = raw;
      if (els.generatedLink) els.generatedLink.value = buildUserLink(raw);
    } catch (error) {
      state.datasetSource = raw;
      refreshSourceSummary();
      resetSearchUi(`Could not load shared JSON: ${error.message}`);
    }
  }

  function buildUserLink(source) {
    const userUrl = new URL("./index.html", window.location.href);
    userUrl.searchParams.set("source", source);
    return userUrl.toString();
  }

  function generateUserLink() {
    const source = els.sourceUrl ? els.sourceUrl.value.trim() : "";
    if (!source) {
      resetSearchUi("Paste a shared JSON link before generating the user link.");
      return;
    }

    const link = buildUserLink(source);
    if (els.generatedLink) els.generatedLink.value = link;
  }

  async function copyUserLink() {
    const value = els.generatedLink ? els.generatedLink.value.trim() : "";
    if (!value) {
      resetSearchUi("Generate the user link first, then copy it.");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      els.status.textContent = "User link copied to clipboard.";
    } catch (_error) {
      els.status.textContent = "Could not copy automatically. Please copy the generated link manually.";
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function onFileSelected(event) {
    const [file] = event.target.files || [];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || "{}"));
        state.datasetSource = file.name;
        loadDataset(payload, file.name.replace(/\.json$/i, ""));
      } catch (error) {
        resetSearchUi(`Could not read JSON: ${error.message}`);
      }
    };
    reader.readAsText(file);
  }

  els.findButton.addEventListener("click", performSearch);
  els.clearButton.addEventListener("click", clearSearch);
  if (els.sampleButton) {
    els.sampleButton.addEventListener("click", () => {
      state.datasetSource = "Sample Parts";
      loadDataset(window.LEGNO_SAMPLE_PARTS, "Sample Parts");
    });
  }
  if (els.fileInput) els.fileInput.addEventListener("change", onFileSelected);
  if (els.loadSourceButton) els.loadSourceButton.addEventListener("click", () => loadDatasetFromSource(els.sourceUrl.value));
  if (els.generateLinkButton) els.generateLinkButton.addEventListener("click", generateUserLink);
  if (els.copyLinkButton) els.copyLinkButton.addEventListener("click", copyUserLink);
  els.query.addEventListener("keydown", (event) => {
    if (event.key === "Enter") performSearch();
  });

  const sharedSource = urlParams.get("source");
  if (pageMode === "user") {
    if (sharedSource) {
      loadDatasetFromSource(sharedSource);
    } else {
      resetSearchUi("No shared dataset loaded. Ask the admin for the shared search link.");
    }
  } else {
    if (sharedSource && els.sourceUrl) {
      els.sourceUrl.value = sharedSource;
      loadDatasetFromSource(sharedSource);
    } else {
      resetSearchUi("Load local JSON or paste a shared Google Drive link to preview the dataset.");
    }
  }
})();
