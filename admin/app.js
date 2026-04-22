/* Knowledge Base — top-bar menu editor.
 * Pure browser app. No build step. No backend.
 * - Loads config/menu.json (relative path; works on file://, mkdocs serve, GH Pages).
 * - Drag-drop edit, then either download the JSON or open a PR via GitHub REST API
 *   using a user-supplied PAT (kept in browser only).
 */
(() => {
  "use strict";

  // ---------- Repo target ----------
  // Defaults can be overridden in the dialog. These match the IDSA upstream.
  const DEFAULT_OWNER  = "International-Data-Spaces-Association";
  const DEFAULT_REPO   = "knowledge-base";
  const DEFAULT_BRANCH = "main";
  const MENU_PATH      = "config/menu.json";

  // localStorage keys (token only persists if the user opts in).
  const LS_TOKEN = "kb-admin:gh-token";
  const LS_DRAFT = "kb-admin:menu-draft";

  // ---------- DOM refs ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const tree = $("#kb-tree");
  const tpl = $("#kb-item-template");
  const statusEl = $("#kb-status");
  const previewPane = $("#kb-preview-pane");
  const previewJson = $("#kb-preview-json");
  const repoLabel = $("#kb-repo-label");

  // PR dialog refs
  const dlg = $("#kb-pr-dialog");
  const prRepoLabel = $("#kb-pr-repo-label");
  const prBaseLabel = $("#kb-pr-base-label");
  const prRepoHint = $("#kb-pr-repo-hint");
  const prToken = $("#kb-pr-token");
  const prRemember = $("#kb-pr-remember");
  const prBranch = $("#kb-pr-branch");
  const prTitle = $("#kb-pr-title");
  const prBody = $("#kb-pr-body");
  const prOwner = $("#kb-pr-owner");
  const prRepo = $("#kb-pr-repo");
  const prBase = $("#kb-pr-base");
  const prSubmit = $("#kb-pr-submit");
  const prCancel = $("#kb-pr-cancel");
  const prForm = $("#kb-pr-form");

  // ---------- Status helpers ----------
  function setStatus(kind, html) {
    if (!html) {
      statusEl.hidden = true;
      statusEl.innerHTML = "";
      return;
    }
    statusEl.hidden = false;
    statusEl.className = `kb-status kb-status--${kind}`;
    statusEl.innerHTML = html;
  }

  // ---------- Render ----------
  function makeItemEl(item = { label: "", url: "" }) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    const labelInput = $(".kb-item__label", node);
    const urlInput = $(".kb-item__url", node);
    const kindSelect = $(".kb-item__kind", node);
    const externalSelect = $(".kb-item__external", node);
    const childrenList = $(".kb-children", node);

    labelInput.value = item.label ?? "";

    let kind = "link";
    if (Array.isArray(item.children)) kind = "dropdown";
    else if (item.external_section) kind = "external";

    kindSelect.value = kind;
    if (kind === "link") {
      urlInput.value = item.url ?? "";
    } else if (kind === "external") {
      externalSelect.value = item.external_section || "rulebook";
    }
    applyKind(node, kind);

    if (kind === "dropdown" && Array.isArray(item.children)) {
      for (const c of item.children) childrenList.appendChild(makeItemEl(c));
    }

    wireItem(node);
    return node;
  }

  function applyKind(node, kind) {
    node.dataset.kind = kind;
    const urlInput = $(".kb-item__url", node);
    const externalSelect = $(".kb-item__external", node);
    const childrenList = $(".kb-children", node);
    const addChildBtn = $(".kb-btn--add-child", node);

    urlInput.hidden = kind !== "link";
    externalSelect.hidden = kind !== "external";
    childrenList.hidden = kind !== "dropdown";
    addChildBtn.hidden = kind !== "dropdown";

    if (kind === "dropdown" && childrenList.children.length === 0) {
      // Auto-add one child so the dropdown isn't empty.
      childrenList.appendChild(makeItemEl({ label: "", url: "" }));
    }
  }

  function wireItem(node) {
    const kindSelect = $(".kb-item__kind", node);
    const deleteBtn = $(".kb-btn--delete", node);
    const addChildBtn = $(".kb-btn--add-child", node);
    const childrenList = $(".kb-children", node);

    kindSelect.addEventListener("change", () => {
      applyKind(node, kindSelect.value);
      saveDraft();
    });

    deleteBtn.addEventListener("click", () => {
      if (confirm(`Delete "${$(".kb-item__label", node).value || "(untitled)"}"?`)) {
        node.remove();
        saveDraft();
      }
    });

    addChildBtn.addEventListener("click", () => {
      childrenList.appendChild(makeItemEl({ label: "", url: "" }));
      childrenList.hidden = false;
      saveDraft();
    });

    // Save draft on any field change.
    node.addEventListener("input", () => saveDraft());

    // Make the children list sortable too.
    initSortable(childrenList);
  }

  function initSortable(list) {
    if (!window.Sortable || list.dataset.kbSortable) return;
    list.dataset.kbSortable = "1";
    new Sortable(list, {
      group: "kb-menu",
      handle: ".kb-handle",
      animation: 150,
      ghostClass: "kb-ghost",
      dragClass: "kb-drag",
      fallbackOnBody: true,
      invertSwap: true,
      onEnd: () => saveDraft(),
    });
  }

  // ---------- Serialize ----------
  function serializeList(listEl) {
    return Array.from(listEl.children).map(serializeItem);
  }

  function serializeItem(node) {
    const label = $(".kb-item__label", node).value.trim();
    const kind = node.dataset.kind || "link";
    if (kind === "external") {
      return { label, external_section: $(".kb-item__external", node).value };
    }
    if (kind === "dropdown") {
      const children = serializeList($(".kb-children", node));
      return { label, children };
    }
    return { label, url: $(".kb-item__url", node).value.trim() };
  }

  function buildConfig() {
    return {
      $schema: "./menu.schema.json",
      _comment: "Source of truth for the top-bar navigation. Edited via /admin/. Read by scripts/build_summary.py at CI time. Each item becomes a top-level tab; items with `children` become dropdowns. Use `external_section` on a child to expand it from the upstream SUMMARY.md of that section (rulebook, ram5, glossary).",
      items: serializeList(tree),
    };
  }

  // ---------- Validation ----------
  function validate(cfg) {
    const errors = [];
    function walk(items, path) {
      items.forEach((it, i) => {
        const p = `${path}[${i}] (${it.label || "untitled"})`;
        if (!it.label) errors.push(`${p}: missing label`);
        const hasUrl = "url" in it;
        const hasKids = Array.isArray(it.children);
        const hasExt = "external_section" in it;
        const flags = [hasUrl, hasKids, hasExt].filter(Boolean).length;
        if (flags === 0) errors.push(`${p}: needs a URL, children, or external_section`);
        if (flags > 1) errors.push(`${p}: only one of url / children / external_section`);
        if (hasKids) walk(it.children, `${p}.children`);
      });
    }
    walk(cfg.items, "items");
    return errors;
  }

  // ---------- Draft persistence ----------
  let draftSaveTimer = null;
  function saveDraft() {
    clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(LS_DRAFT, JSON.stringify(buildConfig()));
      } catch (_) { /* quota — ignore */ }
    }, 250);
  }

  function loadDraft() {
    try {
      const s = localStorage.getItem(LS_DRAFT);
      return s ? JSON.parse(s) : null;
    } catch (_) { return null; }
  }

  function clearDraft() {
    try { localStorage.removeItem(LS_DRAFT); } catch (_) {}
  }

  // ---------- Initial load ----------
  async function loadInitial() {
    const draft = loadDraft();
    if (draft && draft.items?.length) {
      renderConfig(draft);
      setStatus("warn",
        "Loaded unsaved local edits. <button id=\"kb-discard-draft\" class=\"kb-btn kb-btn--ghost\">Discard and reload original</button>");
      $("#kb-discard-draft")?.addEventListener("click", async () => {
        clearDraft();
        await fetchAndRender();
        setStatus("info", "Reloaded from <code>config/menu.json</code>.");
      });
      return;
    }
    await fetchAndRender();
  }

  async function fetchAndRender() {
    setStatus("info", "Loading <code>config/menu.json</code>…");
    try {
      // Relative path: works under /admin/ on any host (mkdocs, GH Pages, file://).
      const res = await fetch("../config/menu.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cfg = await res.json();
      renderConfig(cfg);
      setStatus("success", "Loaded current menu.");
      setTimeout(() => setStatus(null), 1500);
    } catch (err) {
      // Fallback: minimal stub so the UI is still usable.
      renderConfig({ items: [{ label: "Home", url: "index.md" }] });
      setStatus("warn",
        `Couldn't load <code>config/menu.json</code> (${err.message}). Started with a stub. ` +
        `If you opened this file directly with <code>file://</code>, run <code>python -m http.server</code> ` +
        `from the repo root and open <code>http://localhost:8000/admin/</code>.`);
    }
  }

  function renderConfig(cfg) {
    tree.innerHTML = "";
    for (const item of (cfg.items || [])) {
      tree.appendChild(makeItemEl(item));
    }
    initSortable(tree);
  }

  // ---------- Toolbar wiring ----------
  $("#kb-btn-add-item").addEventListener("click", () => {
    tree.appendChild(makeItemEl({ label: "New item", url: "" }));
    saveDraft();
  });

  $("#kb-btn-reset").addEventListener("click", async () => {
    if (!confirm("Discard all local edits and reload from disk?")) return;
    clearDraft();
    await fetchAndRender();
  });

  $("#kb-btn-preview").addEventListener("click", () => {
    previewJson.textContent = JSON.stringify(buildConfig(), null, 2);
    previewPane.hidden = false;
    previewPane.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  $("#kb-btn-preview-close").addEventListener("click", () => { previewPane.hidden = true; });

  $("#kb-btn-download").addEventListener("click", () => {
    const cfg = buildConfig();
    const errors = validate(cfg);
    if (errors.length) {
      setStatus("error", "Cannot download — validation errors:<br>" + errors.map(e => `• ${e}`).join("<br>"));
      return;
    }
    const blob = new Blob([JSON.stringify(cfg, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  $("#kb-btn-pr").addEventListener("click", () => openPrDialog());

  // ---------- PR dialog ----------
  function openPrDialog() {
    const cfg = buildConfig();
    const errors = validate(cfg);
    if (errors.length) {
      setStatus("error", "Fix these before opening a PR:<br>" + errors.map(e => `• ${e}`).join("<br>"));
      return;
    }

    // Defaults
    prOwner.value = DEFAULT_OWNER;
    prRepo.value  = DEFAULT_REPO;
    prBase.value  = DEFAULT_BRANCH;
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    prBranch.value = `menu-edit-${ts}`;
    prTitle.value  = "Update top-bar menu";
    prBody.value   = "Edited via /admin/. See diff in `config/menu.json`.";
    updateDialogLabels();

    // Restore remembered token
    const remembered = localStorage.getItem(LS_TOKEN);
    prToken.value = remembered || "";
    prRemember.checked = !!remembered;

    [prOwner, prRepo, prBase].forEach(el =>
      el.addEventListener("input", updateDialogLabels));

    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
  }

  function updateDialogLabels() {
    const slug = `${prOwner.value}/${prRepo.value}`;
    prRepoLabel.textContent = slug;
    prBaseLabel.textContent = prBase.value;
    prRepoHint.textContent = slug;
  }

  prCancel.addEventListener("click", () => dlg.close());

  prForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const token = prToken.value.trim();
    if (!token) return;

    if (prRemember.checked) localStorage.setItem(LS_TOKEN, token);
    else localStorage.removeItem(LS_TOKEN);

    const owner = prOwner.value.trim();
    const repo = prRepo.value.trim();
    const base = prBase.value.trim() || "main";
    const branch = prBranch.value.trim();
    const title = prTitle.value.trim();
    const body = prBody.value.trim();

    prSubmit.disabled = true;
    prSubmit.textContent = "Working…";
    setStatus("info", `Opening PR against <code>${owner}/${repo}</code>…`);

    try {
      const cfg = buildConfig();
      const url = await openPullRequest({
        token, owner, repo, base, branch, title, body,
        path: MENU_PATH,
        content: JSON.stringify(cfg, null, 2) + "\n",
      });
      setStatus("success",
        `PR opened: <a href="${url}" target="_blank" rel="noopener">${url}</a>`);
      clearDraft();
      dlg.close();
    } catch (err) {
      setStatus("error", `Failed: ${escapeHtml(err.message)}`);
    } finally {
      prSubmit.disabled = false;
      prSubmit.textContent = "Open PR";
    }
  });

  // ---------- GitHub REST helpers ----------
  async function gh(token, method, path, body) {
    const res = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try {
        const j = await res.json();
        if (j.message) msg += ` — ${j.message}`;
      } catch (_) {}
      throw new Error(`GitHub API ${method} ${path}: ${msg}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  function b64utf8(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  async function openPullRequest({ token, owner, repo, base, branch, title, body, path, content }) {
    // 1. Resolve base SHA.
    const ref = await gh(token, "GET", `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(base)}`);
    const baseSha = ref.object.sha;

    // 2. Create the new branch (or fail if it already exists).
    await gh(token, "POST", `/repos/${owner}/${repo}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: baseSha,
    });

    // 3. Get current file SHA (if it exists) so we can update rather than create-fail.
    let existingSha = null;
    try {
      const existing = await gh(token, "GET",
        `/repos/${owner}/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(base)}`);
      if (existing && existing.sha) existingSha = existing.sha;
    } catch (e) {
      // 404 = file doesn't exist yet, that's fine; everything else rethrows.
      if (!/404/.test(e.message)) throw e;
    }

    // 4. Commit the new file content on the branch.
    await gh(token, "PUT", `/repos/${owner}/${repo}/contents/${encodeURI(path)}`, {
      message: title,
      content: b64utf8(content),
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    });

    // 5. Open the PR.
    const pr = await gh(token, "POST", `/repos/${owner}/${repo}/pulls`, {
      title,
      body,
      head: branch,
      base,
    });
    return pr.html_url;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // ---------- Header label ----------
  repoLabel.textContent = `${DEFAULT_OWNER}/${DEFAULT_REPO}`;

  // ---------- Boot ----------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadInitial);
  } else {
    loadInitial();
  }
})();
