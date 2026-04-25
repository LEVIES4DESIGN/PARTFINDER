(function () {
  const pageMode = (document.body.dataset.mode || "user").toLowerCase();
  const urlParams = new URLSearchParams(window.location.search);
  const state = {
    datasetName: "Sample Parts",
    datasetSource: "",
    datasetResolvedSource: "",
    availableProjects: [],
    activeProjectKey: "",
    projectPdfs: [],
    parts: [],
    results: [],
    activeToken: null,
    activePdfUrl: ""
  };

  const els = {
    query: document.getElementById("part-query"),
    results: document.getElementById("results"),
    status: document.getElementById("status-message"),
    detailsGrid: document.getElementById("details-grid"),
    detailTitle: document.getElementById("detail-title"),
    detailSubtitle: document.getElementById("detail-subtitle"),
    pdfTitle: document.getElementById("pdf-title"),
    pdfSubtitle: document.getElementById("pdf-subtitle"),
    pdfStatus: document.getElementById("pdf-status"),
    pdfViewer: document.getElementById("pdf-viewer"),
    pdfFrame: document.getElementById("pdf-frame"),
    pdfOpenLink: document.getElementById("pdf-open-link"),
    datasetName: document.getElementById("dataset-name"),
    datasetMeta: document.getElementById("dataset-meta"),
    sourceSummary: document.getElementById("source-summary"),
    projectSelect: document.getElementById("project-select"),
    projectHelp: document.getElementById("project-help"),
    projectFolder: document.getElementById("project-folder"),
    cleanSlateButton: document.getElementById("clean-slate-button"),
    clearProjectsButton: document.getElementById("clear-projects-button"),
    githubOwner: document.getElementById("github-owner"),
    githubRepo: document.getElementById("github-repo"),
    githubBranch: document.getElementById("github-branch"),
    githubToken: document.getElementById("github-token"),
    publishGithubButton: document.getElementById("publish-github-button"),
    githubPublishStatus: document.getElementById("github-publish-status"),
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

  const STORAGE_DB_NAME = "legno-part-finder-web";
  const STORAGE_DB_VERSION = 1;
  const STORAGE_STORE_NAME = "projects";
  const DEFAULT_PROJECT_REGISTRY = "./projects.json";
  const GITHUB_SETTINGS_KEY = "legno-part-finder-github-settings";
  const DEFAULT_GITHUB_OWNER = "levies4design";
  const DEFAULT_GITHUB_REPO = "PARTFINDER";
  const DEFAULT_GITHUB_BRANCH = "main";

  function supportsIndexedDb() {
    return typeof window.indexedDB !== "undefined";
  }

  function setGithubStatus(text) {
    if (els.githubPublishStatus) els.githubPublishStatus.textContent = text;
  }

  function loadGithubSettings() {
    try {
      const raw = window.localStorage.getItem(GITHUB_SETTINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_error) {
      return {};
    }
  }

  function saveGithubSettings() {
    try {
      const payload = {
        owner: els.githubOwner ? els.githubOwner.value.trim() : "",
        repo: els.githubRepo ? els.githubRepo.value.trim() : "",
        branch: els.githubBranch ? els.githubBranch.value.trim() : ""
      };
      window.localStorage.setItem(GITHUB_SETTINGS_KEY, JSON.stringify(payload));
    } catch (_error) {
      // Non-blocking
    }
  }

  function inferGithubPagesRepo() {
    try {
      const current = new URL(window.location.href);
      if (!/github\.io$/i.test(current.hostname)) return null;
      const owner = current.hostname.split(".")[0] || "";
      const repo = current.pathname.split("/").filter(Boolean)[0] || "";
      if (!owner || !repo) return null;
      return { owner, repo, branch: "main" };
    } catch (_error) {
      return null;
    }
  }

  function applyGithubDefaults() {
    const stored = loadGithubSettings();
    const inferred = inferGithubPagesRepo() || {};

    if (els.githubOwner) els.githubOwner.value = stored.owner || inferred.owner || DEFAULT_GITHUB_OWNER;
    if (els.githubRepo) els.githubRepo.value = stored.repo || inferred.repo || DEFAULT_GITHUB_REPO;
    if (els.githubBranch) els.githubBranch.value = stored.branch || inferred.branch || DEFAULT_GITHUB_BRANCH;
  }

  function openStorageDb() {
    return new Promise((resolve, reject) => {
      if (!supportsIndexedDb()) {
        reject(new Error("This browser does not support local project storage."));
        return;
      }

      const request = window.indexedDB.open(STORAGE_DB_NAME, STORAGE_DB_VERSION);
      request.onerror = () => reject(request.error || new Error("Could not open local storage."));
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORAGE_STORE_NAME)) {
          db.createObjectStore(STORAGE_STORE_NAME, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
  }

  async function readAllStoredProjects() {
    const db = await openStorageDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORAGE_STORE_NAME, "readonly");
      const store = tx.objectStore(STORAGE_STORE_NAME);
      const request = store.getAll();
      request.onerror = () => reject(request.error || new Error("Could not read stored projects."));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async function readStoredProject(key) {
    const db = await openStorageDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORAGE_STORE_NAME, "readonly");
      const store = tx.objectStore(STORAGE_STORE_NAME);
      const request = store.get(key);
      request.onerror = () => reject(request.error || new Error("Could not read stored project."));
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async function saveStoredProjects(records) {
    const db = await openStorageDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORAGE_STORE_NAME, "readwrite");
      const store = tx.objectStore(STORAGE_STORE_NAME);
      records.forEach((record) => store.put(record));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Could not save stored projects."));
      tx.onabort = () => reject(tx.error || new Error("Could not save stored projects."));
    });
  }

  async function clearStoredProjects() {
    const db = await openStorageDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORAGE_STORE_NAME, "readwrite");
      const store = tx.objectStore(STORAGE_STORE_NAME);
      const request = store.clear();
      request.onerror = () => reject(request.error || new Error("Could not clear stored projects."));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Could not clear stored projects."));
    });
  }

  function clearActivePdfUrl() {
    if (state.activePdfUrl && /^blob:/i.test(state.activePdfUrl)) {
      try {
        URL.revokeObjectURL(state.activePdfUrl);
      } catch (_error) {
        // Best effort cleanup only.
      }
    }
    state.activePdfUrl = "";
  }

  function normalizeRelativePath(value) {
    return String(value || "").replace(/\\/g, "/").trim();
  }

  function parentDirectoryPath(value) {
    const normalized = normalizeRelativePath(value);
    const index = normalized.lastIndexOf("/");
    return index >= 0 ? normalized.slice(0, index) : "";
  }

  function projectStem(value) {
    return String(value || "").replace(/\.[^.]+$/, "").trim();
  }

  function extractCabinetKey(value) {
    const stem = projectStem(value);
    const directMatch = stem.match(/^[A-Za-z]+(?:[=\-_]?\d+)+/);
    if (directMatch) return normalizeKey(directMatch[0]);

    const firstToken = stem.split(".")[0].split(/\s+/)[0];
    return normalizeKey(firstToken || stem);
  }

  function slugifyFileStem(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "file";
  }

  function buildPdfRecord(file) {
    return {
      cabinet_key: extractCabinetKey(file.name),
      name: file.name,
      source: normalizeRelativePath(file.webkitRelativePath || file.name),
      blob: file,
      published_name: `${slugifyFileStem(projectStem(file.name))}.pdf`
    };
  }

  function collectRelatedPdfRecords(jsonFile, pdfFiles) {
    const jsonDirectory = parentDirectoryPath(jsonFile.webkitRelativePath || jsonFile.name);
    const normalizedDirectory = jsonDirectory ? `${normalizeRelativePath(jsonDirectory)}/` : "";

    return pdfFiles
      .filter((pdfFile) => {
        const pdfPath = normalizeRelativePath(pdfFile.webkitRelativePath || pdfFile.name);
        if (!normalizedDirectory) return true;
        return pdfPath.startsWith(normalizedDirectory);
      })
      .map((pdfFile) => buildPdfRecord(pdfFile));
  }

  function resetAdminLoadedState(message) {
    state.datasetSource = "";
    state.datasetResolvedSource = "";
    state.availableProjects = [];
    state.activeProjectKey = "";
    state.projectPdfs = [];
    state.parts = [];
    state.results = [];
    state.activeToken = null;

    if (els.datasetName) els.datasetName.textContent = "No dataset loaded";
    if (els.datasetMeta) els.datasetMeta.textContent = "Choose a local project folder";
    if (els.generatedLink) els.generatedLink.value = "";
    if (els.projectFolder) els.projectFolder.value = "";
    if (els.query) els.query.value = "";

    updateProjectSelect();
    refreshSourceSummary();
    resetSearchUi(message || "Choose a project folder to continue.");
  }

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

  async function encodeGitHubContent(content) {
    let bytes;
    if (typeof content === "string") {
      bytes = new TextEncoder().encode(content);
    } else if (content instanceof Blob) {
      bytes = new Uint8Array(await content.arrayBuffer());
    } else if (content instanceof ArrayBuffer) {
      bytes = new Uint8Array(content);
    } else if (ArrayBuffer.isView(content)) {
      bytes = new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
    } else {
      bytes = new TextEncoder().encode(String(content || ""));
    }

    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
  }

  async function githubApiRequest(path, token, options) {
    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options && options.headers ? options.headers : {})
      }
    });

    if (response.status === 404) return { notFound: true, response, data: null };

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    if (!response.ok) {
      const message = data && data.message ? data.message : `HTTP ${response.status}`;
      throw new Error(message);
    }

    return { response, data };
  }

  async function githubGetExistingSha(owner, repo, branch, path, token) {
    const result = await githubApiRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`, token, {
      method: "GET"
    });
    if (result.notFound) return null;
    return result.data && result.data.sha ? result.data.sha : null;
  }

  async function githubPutFile(owner, repo, branch, path, content, token, message) {
    const sha = await githubGetExistingSha(owner, repo, branch, path, token);
    const body = {
      message,
      branch,
      content: await encodeGitHubContent(content)
    };
    if (sha) body.sha = sha;

    return githubApiRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`, token, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
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

  function slugifyProjectKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project";
  }

  function setProjectHelp(text) {
    if (els.projectHelp) els.projectHelp.textContent = text;
  }

  function updateProjectSelect() {
    if (!els.projectSelect) return;

    const projects = state.availableProjects || [];
    els.projectSelect.innerHTML = "";

    if (!projects.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Waiting for project source";
      els.projectSelect.appendChild(option);
      els.projectSelect.disabled = true;
      setProjectHelp("Select a project to load its shared dataset.");
      return;
    }

    projects.forEach((project) => {
      const option = document.createElement("option");
      option.value = project.key;
      option.textContent = project.name;
      if (project.key === state.activeProjectKey) option.selected = true;
      els.projectSelect.appendChild(option);
    });

    els.projectSelect.disabled = projects.length === 1 && !projects[0].source;
    if (projects.length === 1) {
      setProjectHelp(`Current project: ${projects[0].name}`);
    } else {
      setProjectHelp("Select a project name to load its shared dataset.");
    }
  }

  function setSingleProject(name, source) {
    state.availableProjects = [{
      key: slugifyProjectKey(name || "project"),
      name: name || "Loaded Project",
      source: source || ""
    }];
    state.activeProjectKey = state.availableProjects[0].key;
    updateProjectSelect();
  }

  function setProjects(projects) {
    state.availableProjects = projects.map((project, index) => ({
      key: project.key || slugifyProjectKey(project.name || `project-${index + 1}`),
      name: project.name || `Project ${index + 1}`,
      source: String(project.source || "").trim(),
      storage: project.storage || "remote"
    })).filter((project) => project.name);

    state.activeProjectKey = state.availableProjects[0] ? state.availableProjects[0].key : "";
    updateProjectSelect();
  }

  function activeProject() {
    return (state.availableProjects || []).find((project) => project.key === state.activeProjectKey) || null;
  }

  async function readJsonFile(file) {
    const text = await file.text();
    return JSON.parse(text);
  }

  function buildStoredProjectRecord(payload, file, index, usedKeys, pdfs) {
    const parsed = Array.isArray(payload) ? { meta: {}, parts: payload } : payload || {};
    const projectName = (parsed.meta && parsed.meta.model_name) || file.name.replace(/\.json$/i, "") || `Project ${index + 1}`;
    let key = slugifyProjectKey(projectName);
    let suffix = 2;
    while (usedKeys.has(key)) {
      key = `${slugifyProjectKey(projectName)}-${suffix}`;
      suffix += 1;
    }
    usedKeys.add(key);

    return {
      key,
      name: projectName,
      source: file.webkitRelativePath || file.name,
      storage: "browser",
      payload: parsed,
      pdfs: Array.isArray(pdfs) ? pdfs : []
    };
  }

  function normalizeProjectPdfEntry(entry) {
    if (!entry) return null;
    const cabinetKey = extractCabinetKey(entry.cabinet_key || entry.name || entry.source || "");
    if (!cabinetKey) return null;

    return {
      cabinet_key: cabinetKey,
      name: entry.name || "Linked PDF",
      source: String(entry.source || "").trim(),
      blob: entry.blob || null
    };
  }

  function setProjectPdfs(pdfEntries) {
    clearActivePdfUrl();
    state.projectPdfs = Array.isArray(pdfEntries)
      ? pdfEntries.map(normalizeProjectPdfEntry).filter(Boolean)
      : [];
  }

  async function getProjectsForPublishing() {
    const records = await readAllStoredProjects();
    return records.filter((record) => record && record.payload && record.key && record.name);
  }

  async function loadProjectFolder(files) {
    const allFiles = Array.from(files || []);
    const jsonFiles = allFiles.filter((file) => /\.json$/i.test(file.name));
    const pdfFiles = allFiles.filter((file) => /\.pdf$/i.test(file.name));
    if (!jsonFiles.length) {
      resetSearchUi("No JSON files were found in that folder.");
      return;
    }

    try {
      const usedKeys = new Set();
      const records = [];
      for (let index = 0; index < jsonFiles.length; index += 1) {
        const file = jsonFiles[index];
        const payload = await readJsonFile(file);
        const relatedPdfs = collectRelatedPdfRecords(file, pdfFiles);
        records.push(buildStoredProjectRecord(payload, file, index, usedKeys, relatedPdfs));
      }

      await clearStoredProjects();
      await saveStoredProjects(records);

      setProjects(records.map((record) => ({
        key: record.key,
        name: record.name,
        source: record.source,
        storage: "browser"
      })));

      state.activeProjectKey = state.availableProjects[0] ? state.availableProjects[0].key : "";
      updateProjectSelect();

      const firstRecord = records[0];
      state.datasetSource = `Local browser storage (${records.length} project${records.length === 1 ? "" : "s"}, ${pdfFiles.length} PDF${pdfFiles.length === 1 ? "" : "s"})`;
      state.datasetResolvedSource = "";
      loadDataset(firstRecord.payload, firstRecord.name, { projectPdfs: firstRecord.pdfs });

      if (els.generatedLink) {
        els.generatedLink.value = buildUserLinkForBrowserRegistry();
      }
      setProjectHelp(records.length === 1
        ? `Current project: ${firstRecord.name}`
        : `Loaded ${records.length} projects from the selected folder.`);
    } catch (error) {
      resetSearchUi(`Could not load the selected folder: ${error.message}`);
    }
  }

  function loadDataset(payload, fallbackName, options) {
    const settings = options || {};
    const parsed = Array.isArray(payload) ? { meta: {}, parts: payload } : payload || {};
    const modelName = (parsed.meta && parsed.meta.model_name) || fallbackName || "Loaded Parts";
    const parts = Array.isArray(parsed.parts) ? parsed.parts : [];
    const embeddedPdfs = parsed.meta && Array.isArray(parsed.meta.pdfs) ? parsed.meta.pdfs : [];

    state.datasetName = modelName;
    state.parts = parts.map(normalizeRecord);
    state.results = [];
    state.activeToken = null;
    state.datasetResolvedSource = settings.datasetResolvedSource || state.datasetResolvedSource || "";
    setProjectPdfs(settings.projectPdfs || embeddedPdfs);

    els.datasetName.textContent = modelName;
    els.datasetMeta.textContent = `${state.parts.length} searchable parts${state.projectPdfs.length ? ` | ${state.projectPdfs.length} linked PDFs` : ""}`;
    refreshSourceSummary();
    resetSearchUi(pageMode === "user" ? "Enter a part number or Persistent ID to search." : "Dataset loaded. Try a preview search.");

    if (pageMode === "user" && !(state.availableProjects || []).length) {
      setSingleProject(modelName, state.datasetSource);
    }
  }

  function resetSearchUi(message) {
    els.results.innerHTML = "";
    els.detailsGrid.innerHTML = "";
    els.detailTitle.textContent = "Part Details";
    els.detailSubtitle.textContent = pageMode === "user"
      ? "Search for a Part Number or Persistent ID to inspect it here."
      : "Load a dataset and preview the same Part Number / Persistent ID search that users will see.";
    els.status.textContent = message || "Enter a part number to search.";
    resetPdfUi("No linked PDF selected yet.");
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

  function resolveAssetSource(source) {
    const raw = String(source || "").trim();
    if (!raw) return "";
    try {
      const base = state.datasetResolvedSource || window.location.href;
      return new URL(raw, base).toString();
    } catch (_error) {
      return raw;
    }
  }

  function pdfLookupKeysForRecord(item) {
    const keys = [
      extractCabinetKey(item.display_code),
      extractCabinetKey(item.assembly_no),
      extractCabinetKey(item.sub),
      extractCabinetKey(item.full_label)
    ].filter(Boolean);

    return Array.from(new Set(keys));
  }

  function findLinkedPdfForRecord(item) {
    const lookupKeys = pdfLookupKeysForRecord(item);
    if (!lookupKeys.length) return null;
    return state.projectPdfs.find((pdf) => lookupKeys.includes(pdf.cabinet_key)) || null;
  }

  function resetPdfUi(message) {
    clearActivePdfUrl();
    if (els.pdfTitle) els.pdfTitle.textContent = "Linked PDF";
    if (els.pdfSubtitle) {
      els.pdfSubtitle.textContent = pageMode === "user"
        ? "When a part is selected, the related project PDF will appear here."
        : "Preview the linked PDF that users will see when they search for a matching part.";
    }
    if (els.pdfStatus) els.pdfStatus.textContent = message || "No linked PDF selected yet.";
    if (els.pdfViewer) els.pdfViewer.classList.add("is-hidden");
    if (els.pdfFrame) els.pdfFrame.src = "about:blank";
    if (els.pdfOpenLink) els.pdfOpenLink.removeAttribute("href");
  }

  function renderPdfForRecord(item) {
    if (!els.pdfViewer || !els.pdfFrame || !els.pdfOpenLink) return;

    clearActivePdfUrl();
    const linkedPdf = findLinkedPdfForRecord(item);
    if (!linkedPdf) {
      resetPdfUi(`No linked PDF found for ${item.display_code}.`);
      return;
    }

    const sourceUrl = linkedPdf.blob ? URL.createObjectURL(linkedPdf.blob) : resolveAssetSource(linkedPdf.source);
    if (!sourceUrl) {
      resetPdfUi(`Linked PDF metadata was found for ${item.display_code}, but the file source is missing.`);
      return;
    }

    state.activePdfUrl = sourceUrl;
    if (els.pdfTitle) els.pdfTitle.textContent = linkedPdf.name;
    if (els.pdfSubtitle) els.pdfSubtitle.textContent = `${item.display_code} linked to ${linkedPdf.name}`;
    if (els.pdfStatus) els.pdfStatus.textContent = `Showing linked PDF for ${item.display_code}.`;
    els.pdfViewer.classList.remove("is-hidden");
    els.pdfFrame.src = sourceUrl;
    els.pdfOpenLink.href = sourceUrl;
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
    if (item) {
      renderDetails(item);
      renderPdfForRecord(item);
    }
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
      resetPdfUi(`No linked PDF found for "${query}".`);
      return;
    }

    state.activeToken = state.results[0].token;
    els.status.textContent = `Found ${results.length} matching part${results.length === 1 ? "" : "s"} for "${query}".`;
    renderResults();
    renderDetails(state.results[0]);
    renderPdfForRecord(state.results[0]);
  }

  function clearSearch() {
    els.query.value = "";
    state.results = [];
    state.activeToken = null;
    resetSearchUi(pageMode === "user" ? "Enter a part number or Persistent ID to search." : "Enter a part number or Persistent ID to preview.");
  }

  function refreshSourceSummary() {
    if (!els.sourceSummary) return;
    const pdfSummary = state.projectPdfs.length ? ` | Linked PDFs: ${state.projectPdfs.length}` : "";

    if (!state.datasetSource) {
      els.sourceSummary.textContent = "No shared dataset connected yet.";
      return;
    }

    const currentProject = activeProject();
    if (currentProject) {
      els.sourceSummary.textContent = `Project: ${currentProject.name} | Shared source: ${state.datasetSource}${pdfSummary}`;
      return;
    }

    els.sourceSummary.textContent = `Shared source: ${state.datasetSource}${pdfSummary}`;
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
      state.datasetResolvedSource = resolved;
      loadDataset(payload, "Shared Parts", { datasetResolvedSource: resolved });
      if (pageMode === "user") setSingleProject(state.datasetName, raw);

      if (els.sourceUrl) els.sourceUrl.value = raw;
      if (els.generatedLink) els.generatedLink.value = buildUserLink(raw);
    } catch (error) {
      state.datasetSource = raw;
      state.datasetResolvedSource = "";
      setProjectPdfs([]);
      refreshSourceSummary();
      resetSearchUi(`Could not load shared JSON: ${error.message}`);
    }
  }

  async function loadProjectRegistry(source) {
    const raw = String(source || "").trim();
    if (!raw) return false;

    try {
      const resolved = resolveSourceUrl(raw);
      const response = await fetch(resolved, { method: "GET" });
      if (!response.ok) return false;

      const payload = await response.json();
      if (!payload || !Array.isArray(payload.projects) || !payload.projects.length) {
        return false;
      }

      setProjects(payload.projects);

      if (payload.default_project) {
        const found = state.availableProjects.find((project) => project.key === payload.default_project || project.name === payload.default_project);
        if (found) state.activeProjectKey = found.key;
      }

      updateProjectSelect();

      const project = activeProject();
      if (project && project.source) {
        await loadDatasetFromSource(project.source);
      } else {
        resetSearchUi("Select a project to load its shared dataset.");
      }

      return true;
    } catch (_error) {
      return false;
    }
  }

  function buildUserLink(source) {
    const userUrl = new URL("./index.html", window.location.href);
    userUrl.searchParams.set("source", source);
    return userUrl.toString();
  }

  function buildUserHomeLink() {
    return new URL("./index.html", window.location.href).toString();
  }

  function buildUserLinkForBrowserRegistry() {
    const userUrl = new URL("./index.html", window.location.href);
    userUrl.searchParams.set("registry", "browser");
    return userUrl.toString();
  }

  async function loadHostedRegistryOrFallback() {
    const loaded = await loadProjectRegistry(DEFAULT_PROJECT_REGISTRY);
    if (loaded) return;

    loadBrowserStoredProjectsAndSelectFirst(
      "No shared hosted projects found yet. Ask the admin to publish projects.json, or load a project folder on this device."
    );
  }

  function generateUserLink() {
    if (els.projectFolder || pageMode === "admin") {
      const projectsLoaded = (state.availableProjects || []).length > 0;
      if (projectsLoaded) {
        const link = buildUserLinkForBrowserRegistry();
        if (els.generatedLink) els.generatedLink.value = link;
        els.status.textContent = "User link generated. The main user page will auto-load the stored projects in this browser.";
        return;
      }
    }

    const source = els.sourceUrl ? els.sourceUrl.value.trim() : "";
    if (!source) {
      resetSearchUi("Choose a project folder first.");
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
        state.datasetResolvedSource = "";
        loadDataset(payload, file.name.replace(/\.json$/i, ""), { datasetResolvedSource: "" });
        if (pageMode === "user") setSingleProject(file.name.replace(/\.json$/i, ""), file.name);
      } catch (error) {
        resetSearchUi(`Could not read JSON: ${error.message}`);
      }
    };
    reader.readAsText(file);
  }

  async function onProjectFolderSelected(event) {
    const files = event.target.files || [];
    await loadProjectFolder(files);
  }

  async function onClearProjects() {
    try {
      await clearStoredProjects();
      resetAdminLoadedState("Stored local projects cleared. Choose a project folder to continue.");
    } catch (error) {
      resetSearchUi(`Could not clear stored projects: ${error.message}`);
    }
  }

  async function onCleanSlate() {
    try {
      await clearStoredProjects();
      resetAdminLoadedState("Clean slate ready. Choose a project folder to start again.");
      setGithubStatus("Clean slate ready. Load a project folder when you are ready to publish again.");
    } catch (error) {
      resetSearchUi(`Could not reset the admin page: ${error.message}`);
    }
  }

  async function publishProjectsToGitHub() {
    const owner = els.githubOwner ? els.githubOwner.value.trim() : "";
    const repo = els.githubRepo ? els.githubRepo.value.trim() : "";
    const branch = els.githubBranch ? els.githubBranch.value.trim() : "main";
    const token = els.githubToken ? els.githubToken.value.trim() : "";

    if (!owner || !repo || !branch || !token) {
      setGithubStatus("Enter GitHub owner, repository, branch, and token before publishing.");
      return;
    }

    let records;
    try {
      records = await getProjectsForPublishing();
    } catch (error) {
      setGithubStatus(`Could not read stored projects: ${error.message}`);
      return;
    }

    if (!records.length) {
      setGithubStatus("Choose a project folder first so there are JSON files ready to publish.");
      return;
    }

    saveGithubSettings();
    setGithubStatus(`Publishing ${records.length} project${records.length === 1 ? "" : "s"} to GitHub...`);

    try {
      for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        const pdfEntries = Array.isArray(record.pdfs) ? record.pdfs : [];

        for (let pdfIndex = 0; pdfIndex < pdfEntries.length; pdfIndex += 1) {
          const pdf = pdfEntries[pdfIndex];
          if (!pdf.blob) continue;

          await githubPutFile(
            owner,
            repo,
            branch,
            `part-finder-web/data/${record.key}/pdfs/${pdf.published_name}`,
            pdf.blob,
            token,
            `Update PDF for ${record.name} - ${pdf.name}`
          );
        }

        const publishedPayload = JSON.parse(JSON.stringify(record.payload || {}));
        publishedPayload.meta = publishedPayload.meta || {};
        publishedPayload.meta.pdfs = pdfEntries.map((pdf) => ({
          cabinet_key: pdf.cabinet_key,
          name: pdf.name,
          source: `./pdfs/${pdf.published_name}`
        }));

        const targetPath = `part-finder-web/data/${record.key}/project.json`;
        const payloadText = JSON.stringify(publishedPayload, null, 2);
        await githubPutFile(
          owner,
          repo,
          branch,
          targetPath,
          payloadText,
          token,
          `Update project data for ${record.name}`
        );
        setGithubStatus(`Uploaded ${index + 1}/${records.length}: ${record.name}`);
      }

      const registry = {
        default_project: records[0].key,
        projects: records.map((record) => ({
          key: record.key,
          name: record.name,
          source: `./data/${record.key}/project.json`
        }))
      };

      await githubPutFile(
        owner,
        repo,
        branch,
        "part-finder-web/projects.json",
        JSON.stringify(registry, null, 2),
        token,
        "Update shared projects registry"
      );

      const publishedHome = `https://${owner}.github.io/${repo}/`;
      if (els.generatedLink) els.generatedLink.value = publishedHome;
      setGithubStatus(`Publish complete. Shared site ready at ${publishedHome}`);
      if (els.githubToken) els.githubToken.value = "";
    } catch (error) {
      setGithubStatus(`GitHub publish failed: ${error.message}`);
    }
  }

  function loadBrowserStoredProjectsAndSelectFirst(emptyMessage) {
    readAllStoredProjects().then((records) => {
      if (!records.length) {
        updateProjectSelect();
        resetSearchUi(emptyMessage);
        return;
      }

      setProjects(records.map((record) => ({
        key: record.key,
        name: record.name,
        source: record.source,
        storage: "browser"
      })));

      const firstRecord = records[0];
      state.activeProjectKey = firstRecord.key;
      updateProjectSelect();
      state.datasetSource = firstRecord.source || "Local browser storage";
      state.datasetResolvedSource = "";
      loadDataset(firstRecord.payload, firstRecord.name, { projectPdfs: firstRecord.pdfs || [], datasetResolvedSource: "" });
      if (els.generatedLink) els.generatedLink.value = buildUserLinkForBrowserRegistry();
    }).catch((error) => {
      updateProjectSelect();
      resetSearchUi(`Could not load stored projects: ${error.message}`);
    });
  }

  els.findButton.addEventListener("click", performSearch);
  els.clearButton.addEventListener("click", clearSearch);
  applyGithubDefaults();
  setGithubStatus("Load a project folder first, then publish it to GitHub.");
  if (els.githubOwner) els.githubOwner.addEventListener("input", saveGithubSettings);
  if (els.githubRepo) els.githubRepo.addEventListener("input", saveGithubSettings);
  if (els.githubBranch) els.githubBranch.addEventListener("input", saveGithubSettings);
  if (els.sampleButton) {
    els.sampleButton.addEventListener("click", async () => {
      state.datasetSource = "Sample Parts";
      state.datasetResolvedSource = "";
      loadDataset(window.LEGNO_SAMPLE_PARTS, "Sample Parts", { datasetResolvedSource: "", projectPdfs: [] });
      if (pageMode === "admin") {
        const sampleRecord = {
          key: "sample-parts",
          name: "Sample Parts",
          source: "Sample Parts",
          storage: "browser",
          payload: { meta: { model_name: "Sample Parts" }, parts: window.LEGNO_SAMPLE_PARTS }
        };
        try {
          await clearStoredProjects();
          await saveStoredProjects([sampleRecord]);
        } catch (_error) {
          // Keep the preview working even if local storage is unavailable.
        }
        setProjects([sampleRecord]);
        if (els.generatedLink) els.generatedLink.value = buildUserLinkForBrowserRegistry();
      }
    });
  }
  if (els.projectFolder) els.projectFolder.addEventListener("change", onProjectFolderSelected);
  if (els.cleanSlateButton) els.cleanSlateButton.addEventListener("click", onCleanSlate);
  if (els.clearProjectsButton) els.clearProjectsButton.addEventListener("click", onClearProjects);
  if (els.publishGithubButton) els.publishGithubButton.addEventListener("click", publishProjectsToGitHub);
  if (els.fileInput) els.fileInput.addEventListener("change", onFileSelected);
  if (els.loadSourceButton) els.loadSourceButton.addEventListener("click", () => loadDatasetFromSource(els.sourceUrl.value));
  if (els.generateLinkButton) els.generateLinkButton.addEventListener("click", generateUserLink);
  if (els.copyLinkButton) els.copyLinkButton.addEventListener("click", copyUserLink);
  if (els.projectSelect) {
    els.projectSelect.addEventListener("change", async (event) => {
      state.activeProjectKey = event.target.value;
      const project = activeProject();
      if (project && project.storage === "browser") {
        try {
          const stored = await readStoredProject(project.key);
          if (stored && stored.payload) {
            state.datasetSource = stored.source || "Local browser storage";
            state.datasetResolvedSource = "";
            loadDataset(stored.payload, stored.name || project.name, { projectPdfs: stored.pdfs || [], datasetResolvedSource: "" });
          } else {
            resetSearchUi("Could not load the selected stored project.");
          }
        } catch (error) {
          resetSearchUi(`Could not load the selected stored project: ${error.message}`);
        }
      } else if (project && project.source) {
        await loadDatasetFromSource(project.source);
      } else {
        resetSearchUi("Select a project with a valid shared dataset.");
      }
    });
  }
  els.query.addEventListener("keydown", (event) => {
    if (event.key === "Enter") performSearch();
  });

  const sharedSource = urlParams.get("source");
  const projectRegistry = urlParams.get("projects");
  const localRegistry = urlParams.get("registry");
  if (pageMode === "user") {
    if (localRegistry === "browser") {
      loadBrowserStoredProjectsAndSelectFirst("No stored local projects found in this browser. Ask the admin to choose the project folder first.");
    } else if (projectRegistry) {
      loadProjectRegistry(projectRegistry).then((loaded) => {
        if (!loaded) resetSearchUi("Could not load the project list. Ask the admin for the correct shared link.");
      });
    } else if (sharedSource) {
      setSingleProject("Shared Project", sharedSource);
      loadDatasetFromSource(sharedSource);
    } else {
      loadHostedRegistryOrFallback();
    }
  } else {
    if (localRegistry === "browser") {
      loadBrowserStoredProjectsAndSelectFirst("Choose a project folder to load local projects into this browser.");
    } else if (sharedSource && els.sourceUrl) {
      els.sourceUrl.value = sharedSource;
      loadDatasetFromSource(sharedSource);
    } else {
      loadBrowserStoredProjectsAndSelectFirst("Choose a project folder to load local projects into this browser.");
    }
  }
})();
