/* Folio — frontend (vanilla JS + Bootstrap 5 + Chart.js) */
(() => {
  'use strict';

  /* ======================= helpers ======================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const spinner = '<div class="text-center py-5"><div class="spinner-border text-secondary" role="status"></div></div>';

  const readUser = () => {
    try { return JSON.parse(localStorage.getItem('folio.user')); } catch { return null; }
  };

  const state = {
    token: localStorage.getItem('folio.token'),
    user: readUser(),
    books: [],
    authors: [],
    categories: [],
    favBooks: [],
    favIds: new Set(),
    profile: null,
    filters: { q: '', author: '', category: '', trashed: false, authorQ: '' },
    charts: [],
  };
  const isAdmin = () => state.user?.role === 'admin';

  function toast(message, type = 'dark') {
    const el = document.createElement('div');
    el.className = `toast align-items-center text-bg-${type} border-0`;
    el.role = 'alert';
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    $('#toasts').appendChild(el);
    el.addEventListener('hidden.bs.toast', () => el.remove());
    new bootstrap.Toast(el, { delay: 3500 }).show();
  }

  async function api(path, { method = 'GET', body, form } = {}) {
    const headers = {};
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

    const res = await fetch(path, { method, headers, body: payload });
    if (res.status === 401 && state.token) {
      logout();
      throw new Error('Your session has expired, please sign in again.');
    }
    if (!res.ok) {
      let msg = `Error ${res.status}`;
      try {
        const j = await res.json();
        msg = Array.isArray(j.message) ? j.message.join(' • ') : j.message || msg;
      } catch { /* non-JSON body */ }
      throw new Error(msg);
    }
    return (res.headers.get('content-type') || '').includes('application/json') ? res.json() : res;
  }

  function setSession(token, user) {
    state.token = token; state.user = user;
    localStorage.setItem('folio.token', token);
    localStorage.setItem('folio.user', JSON.stringify(user));
  }
  function logout() {
    state.token = null; state.user = null;
    localStorage.removeItem('folio.token');
    localStorage.removeItem('folio.user');
    location.hash = '#/login';
  }

  // Two-step button: first click arms it, second click confirms.
  function confirmClick(el) {
    if (el.dataset.armed) return true;
    el.dataset.armed = '1';
    el.dataset.label = el.innerHTML;
    el.innerHTML = 'Confirm?';
    el.classList.add('is-armed');
    setTimeout(() => {
      if (!el.isConnected) return;
      delete el.dataset.armed;
      el.innerHTML = el.dataset.label;
      el.classList.remove('is-armed');
    }, 3500);
    return false;
  }

  const hueOf = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; };
  const initialsOf = (...parts) => parts.map((p) => (p || '').trim().charAt(0).toUpperCase()).join('');
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const authorName = (b) => (b.auteur ? `${b.auteur.prenom} ${b.auteur.nom}` : 'Unknown author');

  /* ======================= book covers ======================= */
  const imgCache = new Map();
  async function secureImage(name) {
    if (imgCache.has(name)) return imgCache.get(name);
    const res = await api(`/books/images/${encodeURIComponent(name)}`);
    const url = URL.createObjectURL(await res.blob());
    imgCache.set(name, url);
    return url;
  }
  // Uploaded images are protected by the JWT, so they are fetched as blobs.
  function hydrateImages(root = document) {
    root.querySelectorAll('img[data-secure]').forEach(async (img) => {
      try { img.src = await secureImage(img.dataset.secure); } catch { img.remove(); }
    });
  }
  document.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG' && e.target.closest('.cover')) e.target.remove();
  }, true);

  function cover(b) {
    let img = '';
    if (b.image) {
      img = /^https?:\/\//i.test(b.image)
        ? `<img src="${esc(b.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
        : `<img data-secure="${esc(b.image)}" alt="">`;
    }
    return `<div class="cover" style="--h:${hueOf(b.titre + (b.auteur?.nom || ''))}">
      <div class="cover-spine"></div>
      <div class="cover-body"><span class="cover-title">${esc(b.titre)}</span><span class="cover-author">${esc(authorName(b))}</span></div>
      ${img}</div>`;
  }

  const NONE = 'none';
  function categoryGroups(list) {
    const map = new Map();
    for (const b of list) {
      const k = b.categorie ? b.categorie.id : NONE;
      if (!map.has(k)) map.set(k, { id: k, nom: b.categorie?.nom ?? 'Uncategorized', books: [] });
      map.get(k).books.push(b);
    }
    const groups = [...map.values()];
    groups.forEach((g) => g.books.sort((a, b) => a.titre.localeCompare(b.titre)));
    return groups.sort((a, b) => (a.id === NONE ? 1 : b.id === NONE ? -1 : a.nom.localeCompare(b.nom)));
  }

  function bookCard(b) {
    const trashed = !!b.deletedAt;
    const fav = state.favIds.has(b.id);
    let side;
    if (trashed) {
      side = `<div class="trash-actions">
        <button class="btn btn-sm btn-outline-ink" data-action="recover" data-id="${b.id}"><i class="bi bi-arrow-counterclockwise"></i> Restore</button>
        <button class="btn btn-sm btn-outline-danger" data-action="hard-delete" data-id="${b.id}"><i class="bi bi-x-lg"></i> Delete</button></div>`;
    } else {
      side = `<button class="fav-btn ${fav ? 'on' : ''}" data-action="fav" data-id="${b.id}" aria-pressed="${fav}"
          aria-label="${fav ? 'Remove from favorites' : 'Add to favorites'}"><i class="bi bi-heart${fav ? '-fill' : ''}"></i></button>
        ${isAdmin() ? `<button class="edit-btn" data-action="edit-book" data-id="${b.id}" aria-label="Edit ${esc(b.titre)}"><i class="bi bi-pencil"></i></button>` : ''}`;
    }
    return `<div class="col"><article class="book">
      <button class="book-open" data-action="open" data-id="${b.id}" aria-label="View ${esc(b.titre)}">${cover(b)}</button>
      <div class="book-meta"><h3>${esc(b.titre)}</h3><p>${esc(authorName(b))}</p><p>${esc(b.annee)}</p></div>
      ${side}</article></div>`;
  }

  const findBook = (id) => state.books.find((b) => b.id === id) || state.favBooks.find((b) => b.id === id);

  /* ======================= data loaders ======================= */
  const loadBooks = async () => { state.books = await api('/books/all' + (state.filters.trashed ? '?trashed=true' : '')); };
  const loadAuthors = async () => { state.authors = await api('/authors/all'); };
  const loadCategories = async () => { state.categories = await api('/categories/all'); };
  async function loadFavs() {
    const favs = await api('/favorite/all');
    state.favBooks = favs.map((f) => f.book);
    state.favIds = new Set(state.favBooks.map((b) => b.id));
  }

  /* ======================= modal + form helpers ======================= */
  function openModal(html, size = '') {
    $('#modal .modal-dialog').className = `modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}`.trim();
    $('#modal .modal-content').innerHTML = html;
    bootstrap.Modal.getOrCreateInstance($('#modal')).show();
    hydrateImages($('#modal'));
  }
  const closeModal = () => bootstrap.Modal.getOrCreateInstance($('#modal')).hide();

  // Forms live in a modal and only appear when the user asks for them.
  function formModal({ id, title, hint = '', size = '', body, submit, dataId = '' }) {
    openModal(`<form id="${id}" data-id="${dataId}" novalidate>
      <div class="modal-header border-0 pb-0"><div><h2 class="modal-title">${esc(title)}</h2>
        ${hint ? `<p class="muted small mb-0 mt-1">${esc(hint)}</p>` : ''}</div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
      <div class="modal-body"><div class="row g-3">${body}</div></div>
      <div class="modal-footer border-0">
        <button type="button" class="btn btn-outline-ink" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="btn btn-primary">${esc(submit)}</button></div></form>`, size);
  }

  function field({ name, label, type = 'text', value = '', required = true, maxlength, minlength, min, max, col = 'col-12', help = '', feedback = 'This field is required.', autocomplete, placeholder }) {
    const a = (k, v) => (v === undefined ? '' : ` ${k}="${esc(v)}"`);
    return `<div class="${col}"><label class="form-label" for="f-${name}">${label}</label>
      <input class="form-control" id="f-${name}" name="${name}" type="${type}" value="${esc(value)}"${required ? ' required' : ''}${a('maxlength', maxlength)}${a('minlength', minlength)}${a('min', min)}${a('max', max)}${a('autocomplete', autocomplete)}${a('placeholder', placeholder)}>
      <div class="invalid-feedback">${esc(feedback)}</div>${help ? `<div class="form-text">${esc(help)}</div>` : ''}</div>`;
  }

  async function loadFormData() { await Promise.all([loadAuthors(), loadCategories()]); }

  /* ======================= shell ======================= */
  const NAV = [
    ['#/books', 'bi-book', 'Catalog'],
    ['#/authors', 'bi-people', 'Authors'],
    ['#/categories', 'bi-tags', 'Categories'],
    ['#/favorites', 'bi-heart', 'Favorites'],
    ['#/stats', 'bi-bar-chart-line', 'Statistics'],
  ];

  function renderNav(hash) {
    const u = state.user || {};
    $('#nav').innerHTML = `
      <header class="topbar"><nav class="navbar navbar-expand-md container-xl py-2">
        <a class="brand me-md-4" href="#/books"><i class="bi bi-bookmark-fill"></i> Folio</a>
        <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#menu" aria-label="Menu">
          <i class="bi bi-list text-white fs-2"></i></button>
        <div class="collapse navbar-collapse" id="menu">
          <ul class="navbar-nav me-auto gap-1">
            ${NAV.map(([h, ic, label]) => `<li class="nav-item"><a class="nav-link ${h === hash ? 'active' : ''}" href="${h}"><i class="bi ${ic} me-1"></i>${label}</a></li>`).join('')}
          </ul>
          <div class="dropdown mt-2 mt-md-0">
            <button class="user-btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <span class="avatar sm" style="--h:${hueOf(u.username)}">${esc(initialsOf(u.username))}</span>
              <span>${esc(u.username)}</span>
              ${isAdmin() ? '<span class="badge role-badge">Admin</span>' : ''}
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm">
              <li><a class="dropdown-item" href="#/profile"><i class="bi bi-person me-2"></i>My profile</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><button class="dropdown-item" data-action="logout"><i class="bi bi-box-arrow-right me-2"></i>Sign out</button></li>
            </ul>
          </div>
        </div>
      </nav></header>`;
  }

  const routes = {
    '#/login': viewLogin, '#/signup': viewSignup, '#/books': viewBooks, '#/authors': viewAuthors,
    '#/categories': viewCategories, '#/favorites': viewFavorites, '#/stats': viewStats, '#/profile': viewProfile,
  };
  const currentView = () => routes[location.hash || '#/books'] || viewBooks;

  async function route() {
    const hash = location.hash || '#/books';
    const isAuthPage = hash === '#/login' || hash === '#/signup';
    if (!state.token && !isAuthPage) { location.hash = '#/login'; return; }
    if (state.token && isAuthPage) { location.hash = '#/books'; return; }

    state.charts.forEach((c) => c.destroy());
    state.charts = [];
    document.body.classList.toggle('is-auth', isAuthPage);
    if (!isAuthPage) renderNav(hash);
    try { await currentView()(); } catch (e) { toast(e.message, 'danger'); }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  // Re-render the current page after a change (keeps filters, no scroll jump).
  async function refreshView() {
    if ($('#grid')) { await loadBooks(); syncControls(); paintFilters(); paintBooks(); return; }
    await currentView()();
  }

  /* ======================= auth views ======================= */
  function shelfHtml() {
    const hues = [12, 38, 158, 208, 262, 340];
    return Array.from({ length: 18 }, (_, i) => {
      const h = hues[(i * 5 + (i >> 2)) % hues.length];
      const height = 52 + ((i * 37) % 46);
      const width = 24 + ((i * 13) % 24);
      return `<span class="spine" style="--h:${h};height:${height}%;width:${width}px"></span>`;
    }).join('');
  }

  function authLayout(inner) {
    $('#app').innerHTML = `<div class="auth">
      <aside class="auth-aside">
        <div><div class="brand"><i class="bi bi-bookmark-fill"></i> Folio</div>
          <p>Every book in its place, every reader on their page.</p></div>
        <div class="shelf" aria-hidden="true">${shelfHtml()}</div>
      </aside>
      <section class="auth-main"><div class="auth-card">${inner}</div></section></div>`;
  }

  function viewLogin() {
    authLayout(`
      <h1 class="mb-1">Sign in</h1>
      <p class="muted mb-4">Access your library.</p>
      <form id="login-form" novalidate>
        <div class="mb-3"><label class="form-label" for="login">Email or username</label>
          <input class="form-control" id="login" name="login" autocomplete="username" required autofocus>
          <div class="invalid-feedback">Enter your email or username.</div></div>
        <div class="mb-4"><label class="form-label" for="password">Password</label>
          <input class="form-control" id="password" name="password" type="password" autocomplete="current-password" required>
          <div class="invalid-feedback">Enter your password.</div></div>
        <button class="btn btn-primary w-100 py-2" type="submit">Sign in</button>
      </form>
      <p class="mt-4 mb-0 muted">No account yet? <a href="#/signup">Create one</a></p>`);
  }

  function viewSignup() {
    authLayout(`
      <h1 class="mb-1">Create an account</h1>
      <p class="muted mb-4">The very first account becomes the administrator.</p>
      <form id="signup-form" novalidate>
        <div class="mb-3"><label class="form-label" for="email">Email</label>
          <input class="form-control" id="email" name="email" type="email" maxlength="30" autocomplete="email" required autofocus>
          <div class="invalid-feedback">Enter a valid email (30 characters max).</div></div>
        <div class="mb-3"><label class="form-label" for="username">Username</label>
          <input class="form-control" id="username" name="username" minlength="3" maxlength="30" pattern="[A-Za-z0-9_.\\-]+" autocomplete="username" required>
          <div class="invalid-feedback">3–30 characters: letters, numbers, dots, dashes or underscores.</div></div>
        <div class="mb-4"><label class="form-label" for="password">Password</label>
          <input class="form-control" id="password" name="password" type="password" minlength="8" maxlength="64" autocomplete="new-password" required>
          <div class="invalid-feedback">At least 8 characters.</div></div>
        <button class="btn btn-primary w-100 py-2" type="submit">Create my account</button>
      </form>
      <p class="mt-4 mb-0 muted">Already registered? <a href="#/login">Sign in</a></p>`);
  }

  async function signin(login, password) {
    const { accessToken, user } = await api('/auth/signin', { method: 'POST', body: { login, password } });
    setSession(accessToken, user);
    location.hash = '#/books';
  }

  /* ======================= catalog ======================= */
  async function viewBooks() {
    const trash = state.filters.trashed;
    $('#app').innerHTML = `
      <div class="page-head">
        <h1>${trash ? 'Trash' : 'Catalog'}</h1>
        ${isAdmin() ? '<button class="btn btn-brass" data-action="new-book"><i class="bi bi-plus-lg"></i> New book</button>' : ''}
      </div>
      <div class="toolbar-row">
        <div class="search-wrap"><i class="bi bi-search" aria-hidden="true"></i>
          <input id="f-q" class="form-control" type="search" placeholder="Search title, author, publisher…" aria-label="Search"></div>
        <select id="f-category" class="form-select" aria-label="Filter by category"></select>
        <select id="f-author" class="form-select" aria-label="Filter by author"></select>
        ${isAdmin() ? `<button class="btn ${trash ? 'btn-primary' : 'btn-outline-ink'}" data-action="toggle-trash"
          aria-pressed="${trash}" aria-label="Toggle trash"><i class="bi bi-trash3"></i><span class="d-none d-md-inline"> Trash</span></button>` : ''}
      </div>
      <div id="active-filters" class="filter-row"></div>
      <div id="grid">${spinner}</div>`;

    await Promise.all([loadBooks(), loadAuthors(), loadFavs(), loadCategories()]);

    $('#f-category').innerHTML = '<option value="">All categories</option>' +
      categoryGroups(state.books).map((g) => `<option value="${g.id}">${esc(g.nom)} (${g.books.length})</option>`).join('');
    $('#f-author').innerHTML = '<option value="">All authors</option>' +
      state.authors.map((a) => `<option value="${a.id}">${esc(a.prenom)} ${esc(a.nom)}</option>`).join('');
    syncControls();
    paintFilters();
    paintBooks();
  }

  // Put the controls back in line with state.filters (drops values that no longer exist).
  function syncControls() {
    const f = state.filters;
    $('#f-q').value = f.q;
    for (const [sel, key] of [['#f-category', 'category'], ['#f-author', 'author']]) {
      const el = $(sel);
      el.value = f[key];
      if (el.value !== f[key]) f[key] = '';
    }
  }

  function filteredBooks() {
    const f = state.filters;
    const q = f.q.trim().toLowerCase();
    return state.books.filter((b) =>
      (!q || `${b.titre} ${authorName(b)} ${b.editeur}`.toLowerCase().includes(q)) &&
      (!f.author || String(b.auteur?.id) === f.author) &&
      (!f.category || String(b.categorie ? b.categorie.id : NONE) === f.category));
  }

  // Removable pills for the active filters + result count.
  function paintFilters() {
    const box = $('#active-filters');
    if (!box) return;
    const f = state.filters;
    const pills = [];
    if (f.category) {
      pills.push(['category', f.category === NONE ? 'Uncategorized'
        : state.categories.find((c) => String(c.id) === f.category)?.nom ?? 'Category']);
    }
    if (f.author) {
      const a = state.authors.find((x) => String(x.id) === f.author);
      if (a) pills.push(['author', `${a.prenom} ${a.nom}`]);
    }
    if (f.q.trim()) pills.push(['q', `“${f.q.trim()}”`]);
    if (!pills.length) { box.innerHTML = ''; return; }

    box.innerHTML = pills.map(([key, label]) =>
      `<span class="pill">${esc(label)}<button type="button" data-action="clear-filter" data-filter="${key}" aria-label="Remove filter ${esc(label)}"><i class="bi bi-x-lg"></i></button></span>`).join('') +
      `<span class="muted small">${plural(filteredBooks().length, 'book')}</span>
       <button type="button" class="btn btn-link btn-sm ms-auto p-0" data-action="clear-filters">Clear filters</button>`;
  }

  function paintBooks() {
    const grid = $('#grid');
    if (!grid) return;
    const list = filteredBooks();

    if (!list.length) {
      const trash = state.filters.trashed;
      grid.innerHTML = `<div class="empty"><i class="bi ${trash ? 'bi-trash3' : 'bi-journal-x'}"></i>
        <h2>${trash ? 'The trash is empty' : state.books.length ? 'No results' : 'The catalog is empty'}</h2>
        <p>${trash ? 'Deleted books stay here for 30 days.'
          : state.books.length ? 'Try another search or clear the filters.'
          : isAdmin() ? 'Add an author, then your first book.' : 'An administrator has not added any books yet.'}</p></div>`;
      return;
    }
    grid.innerHTML = categoryGroups(list).map((g) => `
      <section class="shelf-section">
        <h2 class="shelf-title">${esc(g.nom)}<span>${plural(g.books.length, 'book')}</span></h2>
        <div class="row row-cols-2 row-cols-sm-3 row-cols-lg-4 row-cols-xl-5 g-4">${g.books.map(bookCard).join('')}</div>
      </section>`).join('');
    hydrateImages(grid);
  }

  function openBook(id) {
    const b = findBook(id);
    if (!b) return;
    const fav = state.favIds.has(b.id);
    openModal(`
      <div class="modal-header border-0 pb-0"><h2 class="modal-title">${esc(b.titre)}</h2>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
      <div class="modal-body"><div class="row g-4">
        <div class="col-5 col-md-4">${cover(b)}</div>
        <div class="col-7 col-md-8">
          <p class="fs-5 serif mb-1">${esc(authorName(b))}</p>
          <p class="muted mb-2">${esc(b.editeur)} — ${esc(b.annee)}</p>
          ${b.categorie ? `<p><span class="chip">${esc(b.categorie.nom)}</span></p>` : ''}
          <p style="white-space:pre-line">${esc(b.description)}</p>
          <p class="muted small mb-0">Added on ${esc(fmtDate(b.createdAt))}</p>
        </div></div></div>
      <div class="modal-footer border-0 flex-wrap justify-content-start gap-2">
        ${b.deletedAt ? '' : `<button class="btn ${fav ? 'btn-outline-ink' : 'btn-primary'}" data-action="fav" data-id="${b.id}">
          <i class="bi bi-heart${fav ? '-fill' : ''}"></i> ${fav ? 'Remove from favorites' : 'Add to favorites'}</button>`}
        ${isAdmin() && !b.deletedAt ? `
          <button class="btn btn-outline-ink" data-action="edit-book" data-id="${b.id}"><i class="bi bi-pencil"></i> Edit</button>
          <button class="btn btn-outline-danger ms-md-auto" data-action="soft-delete" data-id="${b.id}"><i class="bi bi-trash3"></i> Move to trash</button>` : ''}
      </div>`, 'modal-lg');
  }

  function bookForm(b) {
    const editing = !!b;
    if (!state.authors.length) {
      openModal(`<div class="modal-header border-0"><h2 class="modal-title">New book</h2>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
        <div class="modal-body"><div class="alert alert-warning mb-0">Create an author first on the
        <a href="#/authors" data-bs-dismiss="modal">Authors</a> page.</div></div>`);
      return;
    }
    const imageUrl = /^https?:\/\//i.test(b?.image || '') ? b.image : '';
    formModal({
      id: 'book-form', dataId: editing ? b.id : '', size: 'modal-lg',
      title: editing ? 'Edit book' : 'New book',
      hint: editing ? 'Update the details of this book.' : 'Fill in the details of the new book.',
      submit: editing ? 'Save changes' : 'Add book',
      body: `
        ${field({ name: 'titre', label: 'Title', maxlength: 30, value: b?.titre, col: 'col-md-7', feedback: 'A title is required (30 characters max).' })}
        <div class="col-md-5"><label class="form-label" for="f-auteurId">Author</label>
          <select class="form-select" id="f-auteurId" name="auteurId" required>
            ${state.authors.map((a) => `<option value="${a.id}" ${b?.auteur?.id === a.id ? 'selected' : ''}>${esc(a.prenom)} ${esc(a.nom)}</option>`).join('')}
          </select></div>
        ${field({ name: 'editeur', label: 'Publisher', maxlength: 100, value: b?.editeur, col: 'col-md-5', feedback: 'A publisher is required.' })}
        ${field({ name: 'annee', label: 'Year', type: 'number', min: 0, max: 2100, value: b?.annee, col: 'col-md-3', feedback: 'Enter a valid year.' })}
        <div class="col-md-4"><label class="form-label" for="f-categorieId">Category</label>
          <select class="form-select" id="f-categorieId" name="categorieId">
            <option value="">Uncategorized</option>
            ${state.categories.map((c) => `<option value="${c.id}" ${b?.categorie?.id === c.id ? 'selected' : ''}>${esc(c.nom)}</option>`).join('')}
          </select></div>
        <div class="col-12"><label class="form-label" for="f-description">Description</label>
          <textarea class="form-control" id="f-description" name="description" rows="4" maxlength="5000" required>${esc(b?.description)}</textarea>
          <div class="invalid-feedback">A description is required.</div></div>
        <div class="col-12"><label class="form-label" for="f-cover">Cover image ${editing ? '(leave empty to keep the current one)' : '(optional)'}</label>
          <input class="form-control" id="f-cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp,image/gif">
          <div class="form-text">JPEG, PNG, WebP or GIF — 2 MB maximum.</div></div>
        ${field({ name: 'imageUrl', label: '… or an image URL', type: 'url', required: false, maxlength: 500, value: imageUrl, placeholder: 'https://…', feedback: 'Enter a valid URL.', help: 'Without an image, a cover is generated from the title.' })}`,
    });
  }

  /* ======================= authors ======================= */
  async function viewAuthors() {
    $('#app').innerHTML = `
      <div class="page-head"><div><h1>Authors</h1><p class="muted mb-0" id="a-sub"></p></div>
        ${isAdmin() ? '<button class="btn btn-brass" data-action="new-author"><i class="bi bi-plus-lg"></i> New author</button>' : ''}</div>
      <div class="toolbar-row">
        <div class="search-wrap"><i class="bi bi-search" aria-hidden="true"></i>
          <input id="a-q" class="form-control" type="search" placeholder="Search an author…" aria-label="Search authors"></div>
      </div>
      <div id="authors-list">${spinner}</div>`;
    state.filters.authorQ = '';
    await loadAuthors();
    paintAuthors();
  }

  function paintAuthors() {
    const box = $('#authors-list');
    if (!box) return;
    if (!state.authors.length) {
      box.innerHTML = `<div class="empty"><i class="bi bi-people"></i><h2>No authors yet</h2>
        <p>${isAdmin() ? 'Use “New author” to add the first one.' : 'An administrator has not added any authors yet.'}</p></div>`;
      return;
    }
    const q = state.filters.authorQ.trim().toLowerCase();
    const list = state.authors.filter((a) =>
      !q || `${a.prenom} ${a.nom} ${a.nom} ${a.prenom}`.toLowerCase().includes(q));
    $('#a-sub').textContent = q ? `${list.length} of ${plural(state.authors.length, 'author')}` : plural(state.authors.length, 'author');
    if (!list.length) {
      box.innerHTML = `<div class="empty"><i class="bi bi-search"></i><h2>No author found</h2>
        <p>No author matches “${esc(state.filters.authorQ.trim())}”. Check the spelling or try a shorter name.</p></div>`;
      return;
    }
    box.innerHTML = `<div class="row row-cols-1 row-cols-lg-2 g-3">${list.map((a) => {
      const titles = a.listeLivres || [];
      return `<div class="col"><article class="author-card">
        <div class="avatar" style="--h:${hueOf(a.prenom + a.nom)}">${esc(initialsOf(a.prenom, a.nom))}</div>
        <div class="flex-fill" style="min-width:0">
          <h3>${esc(a.prenom)} ${esc(a.nom)}</h3>
          <div class="muted small">${plural(titles.length, 'book')}</div>
          <div>${titles.slice(0, 5).map((b) => `<span class="chip">${esc(b.titre)}</span>`).join('')}${titles.length > 5 ? `<span class="chip chip-more">+${titles.length - 5}</span>` : ''}</div>
        </div>
        ${isAdmin() ? `<div class="card-actions">
          <button class="icon-btn" data-action="edit-author" data-id="${a.id}" title="Edit" aria-label="Edit author"><i class="bi bi-pencil"></i></button>
          <button class="icon-btn danger" data-action="delete-author" data-id="${a.id}" title="Delete" aria-label="Delete author"><i class="bi bi-trash3"></i></button></div>` : ''}
      </article></div>`;
    }).join('')}</div>`;
  }

  function authorForm(a) {
    const editing = !!a;
    formModal({
      id: 'author-form', dataId: editing ? a.id : '',
      title: editing ? 'Edit author' : 'New author',
      submit: editing ? 'Save changes' : 'Add author',
      body: `${field({ name: 'prenom', label: 'First name', maxlength: 20, value: a?.prenom, col: 'col-sm-6', feedback: 'First name is required (20 characters max).' })}
             ${field({ name: 'nom', label: 'Last name', maxlength: 20, value: a?.nom, col: 'col-sm-6', feedback: 'Last name is required (20 characters max).' })}`,
    });
  }

  /* ======================= categories ======================= */
  async function viewCategories() {
    $('#app').innerHTML = `
      <div class="page-head"><div><h1>Categories</h1></div>
        ${isAdmin() ? '<button class="btn btn-brass" data-action="new-category"><i class="bi bi-plus-lg"></i> New category</button>' : ''}</div>
      <div id="cat-list">${spinner}</div>`;
    const [books] = await Promise.all([api('/books/all'), loadCategories()]);
    state.books = books;
    paintCategories();
  }

  function paintCategories() {
    const box = $('#cat-list');
    if (!box) return;
    const withUncat = state.books.filter((b) => !b.categorie);
    if (!state.categories.length && !withUncat.length) {
      box.innerHTML = `<div class="empty"><i class="bi bi-tags"></i><h2>No categories yet</h2>
        <p>${isAdmin() ? 'Use “New category” to add the first one.' : 'An administrator has not created any categories yet.'}</p></div>`;
      return;
    }
    const card = ({ id, nom, books, editable }) => {
      // books with a real cover image first, so the stack looks good
      const stack = [...books].sort((a, b) => !!b.image - !!a.image).slice(0, 5);
      return `<div class="col"><article class="cat-card" style="--h:${hueOf(nom)}">
        <div class="cat-banner">
          <i class="bi bi-tag-fill cat-ico"></i>
          ${editable && isAdmin() ? `<div class="card-actions on-dark">
            <button class="icon-btn" data-action="edit-category" data-id="${id}" title="Rename" aria-label="Rename category"><i class="bi bi-pencil"></i></button>
            <button class="icon-btn" data-action="delete-category" data-id="${id}" title="Delete" aria-label="Delete category"><i class="bi bi-trash3"></i></button></div>` : ''}
          <h3>${esc(nom)}</h3>
          <span class="cat-count">${plural(books.length, 'book')}</span>
        </div>
        <div class="cat-body">
          <div class="cat-stack">${stack.length ? stack.map((b) => `<div class="mini">${cover(b)}</div>`).join('') : '<span class="muted small">No books yet</span>'}</div>
          <button class="btn btn-sm btn-outline-ink" data-action="browse-cat" data-cat="${id}">Browse <i class="bi bi-arrow-right"></i></button>
        </div></article></div>`;
    };
    const cards = state.categories.map((c) =>
      card({ id: c.id, nom: c.nom, books: state.books.filter((b) => b.categorie?.id === c.id), editable: true }));
    if (withUncat.length) cards.push(card({ id: NONE, nom: 'Uncategorized', books: withUncat, editable: false }));
    box.innerHTML = `<div class="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-4">${cards.join('')}</div>`;
    hydrateImages(box);
  }

  function categoryForm(c) {
    const editing = !!c;
    formModal({
      id: 'category-form', dataId: editing ? c.id : '',
      title: editing ? 'Rename category' : 'New category',
      submit: editing ? 'Save changes' : 'Add category',
      body: field({ name: 'nom', label: 'Name', minlength: 2, maxlength: 40, value: c?.nom, feedback: 'Enter a name (2–40 characters).' }),
    });
  }

  /* ======================= favorites ======================= */
  async function viewFavorites() {
    $('#app').innerHTML = `<div class="page-head"><h1>My favorites</h1></div><div id="fav-grid">${spinner}</div>`;
    await loadFavs();
    paintFavorites();
  }

  function paintFavorites() {
    const grid = $('#fav-grid');
    if (!grid) return;
    if (!state.favBooks.length) {
      grid.innerHTML = `<div class="empty"><i class="bi bi-heart"></i><h2>No favorites yet</h2>
        <p>Tap the heart on a book to find it here later.</p>
        <a class="btn btn-primary" href="#/books">Browse the catalog</a></div>`;
      return;
    }
    grid.innerHTML = `<div class="row row-cols-2 row-cols-sm-3 row-cols-lg-4 row-cols-xl-5 g-4">${state.favBooks.map(bookCard).join('')}</div>`;
    hydrateImages(grid);
  }

  /* ======================= statistics (Chart.js) ======================= */
  const PALETTE = ['#1b2a41', '#c58b24', '#2f6f5e', '#b4443a', '#5b7aa6', '#7a4e7e', '#3c8d93', '#c9b27c', '#8c6a4f', '#6c7a89'];

  function chartPanel(title, canvasId, hasData) {
    return `<div class="panel"><h2>${title}</h2>
      ${hasData ? `<div class="chart-box"><canvas id="${canvasId}"></canvas></div>` : '<p class="muted mb-0">No data yet.</p>'}</div>`;
  }
  function makeChart(id, config) {
    const el = document.getElementById(id);
    if (el) state.charts.push(new Chart(el, config));
  }

  async function viewStats() {
    $('#app').innerHTML = `<div class="page-head"><h1>Statistics</h1></div><div id="stats">${spinner}</div>`;
    const s = await api('/books/stats');
    const tile = (icon, n, label, tone) => `<div class="col-6 col-lg-3"><div class="stat">
      <span class="stat-ico ${tone}"><i class="bi ${icon}"></i></span>
      <div><div class="n">${n}</div><div class="l">${label}</div></div></div></div>`;

    $('#stats').innerHTML = `
      <div class="row g-3 mb-3">
        ${tile('bi-book', s.totalBooks, 'Books', 'ink')}
        ${tile('bi-people', s.totalAuthors, 'Authors', 'moss')}
        ${tile('bi-tags', s.totalCategories, 'Categories', 'brass')}
        ${tile('bi-heart', s.totalFavorites, 'Favorites', 'brick')}
      </div>
      <div class="row g-3">
        <div class="col-lg-5">${chartPanel('Books by category', 'ch-cat', s.booksPerCategory.length)}</div>
        <div class="col-lg-7">${chartPanel('Top authors', 'ch-auth', s.booksPerAuthor.length)}</div>
        <div class="col-lg-7">${chartPanel('Books by decade', 'ch-dec', s.byDecade.length)}</div>
        <div class="col-lg-5">${chartPanel('Most favorited', 'ch-fav', s.mostFavorited.length)}</div>
      </div>`;

    if (typeof Chart === 'undefined') {
      toast('Chart.js could not be loaded (check your internet connection).', 'warning');
      return;
    }
    Chart.defaults.font.family = "'Public Sans', system-ui, sans-serif";
    Chart.defaults.color = '#667085';

    const grid = { color: '#eef1f6' };
    const hBar = (labels, data, color) => ({
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: color, borderRadius: 6, maxBarThickness: 22 }] },
      options: {
        indexAxis: 'y', maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid }, y: { grid: { display: false } } },
      },
    });

    const centerText = {
      id: 'centerText',
      afterDraw(chart) {
        const { ctx, chartArea: { left, right, top, bottom } } = chart;
        const x = (left + right) / 2, y = (top + bottom) / 2;
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1b2a41'; ctx.font = "600 32px Newsreader, Georgia, serif";
        ctx.fillText(String(s.totalBooks), x, y - 8);
        ctx.fillStyle = '#667085'; ctx.font = "13px 'Public Sans', sans-serif";
        ctx.fillText('books', x, y + 16);
        ctx.restore();
      },
    };

    makeChart('ch-cat', {
      type: 'doughnut',
      data: {
        labels: s.booksPerCategory.map((r) => r.categorie),
        datasets: [{
          data: s.booksPerCategory.map((r) => r.total),
          backgroundColor: s.booksPerCategory.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor: '#fff', borderWidth: 3, hoverOffset: 6,
        }],
      },
      options: {
        maintainAspectRatio: false, cutout: '64%',
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 14 } } },
      },
      plugins: [centerText],
    });

    makeChart('ch-auth', hBar(s.booksPerAuthor.map((r) => r.auteur), s.booksPerAuthor.map((r) => r.total), '#1b2a41'));

    makeChart('ch-dec', {
      type: 'line',
      data: {
        labels: s.byDecade.map((r) => `${r.decade}s`),
        datasets: [{
          data: s.byDecade.map((r) => r.total), fill: true, tension: 0.35,
          borderColor: '#c58b24', backgroundColor: 'rgba(197,139,36,.16)', borderWidth: 2.5,
          pointBackgroundColor: '#c58b24', pointRadius: 4, pointHoverRadius: 6,
        }],
      },
      options: {
        maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid }, x: { grid: { display: false } } },
      },
    });

    makeChart('ch-fav', hBar(s.mostFavorited.map((r) => r.titre), s.mostFavorited.map((r) => r.total), '#b4443a'));
  }

  /* ======================= profile ======================= */
  async function viewProfile() {
    $('#app').innerHTML = `<div class="page-head"><h1>My profile</h1></div><div id="profile">${spinner}</div>`;
    const p = await api('/profile');
    state.profile = p;
    // keep the stored session in sync with the server
    setSession(state.token, { id: p.id, email: p.email, username: p.username, role: p.role });
    renderNav('#/profile');

    $('#profile').innerHTML = `<div class="row g-4">
      <div class="col-lg-4"><div class="profile-card">
        <div class="avatar xl" style="--h:${hueOf(p.username)}">${esc(initialsOf(p.username))}</div>
        <h2>${esc(p.username)}</h2>
        <p class="muted mb-2">${esc(p.email)}</p>
        <span class="badge role-badge">${p.role === 'admin' ? 'Administrator' : 'Reader'}</span>
        <div class="profile-stats">
          <div><div class="n">${p.favoritesCount}</div><div class="l">Favorites</div></div>
          <div><div class="n">${esc(new Date(p.createdAt).getFullYear())}</div><div class="l">Member since</div></div>
        </div></div></div>
      <div class="col-lg-8">
        <div class="panel mb-4">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <h2 class="mb-0">Account information</h2>
            <button class="btn btn-outline-ink btn-sm" data-action="edit-profile"><i class="bi bi-pencil"></i> Edit</button></div>
          <dl class="info-list">
            <div><dt>Username</dt><dd>${esc(p.username)}</dd></div>
            <div><dt>Email</dt><dd>${esc(p.email)}</dd></div>
            <div><dt>Role</dt><dd>${p.role === 'admin' ? 'Administrator' : 'Reader'}</dd></div>
            <div><dt>Member since</dt><dd>${esc(fmtDate(p.createdAt))}</dd></div>
          </dl></div>
        <div class="panel">
          <div class="d-flex justify-content-between align-items-center gap-3 flex-wrap">
            <div><h2 class="mb-1">Security</h2><p class="muted mb-0">Choose a strong password you do not use anywhere else.</p></div>
            <button class="btn btn-outline-ink btn-sm" data-action="change-password"><i class="bi bi-key"></i> Change password</button></div>
        </div>
      </div></div>`;
  }

  function profileForm() {
    const p = state.profile;
    formModal({
      id: 'profile-form', title: 'Edit profile', hint: 'Update your username or email address.', submit: 'Save changes',
      body: `${field({ name: 'username', label: 'Username', minlength: 3, maxlength: 30, value: p.username, autocomplete: 'username', feedback: '3–30 characters.' })}
             ${field({ name: 'email', label: 'Email', type: 'email', maxlength: 30, value: p.email, autocomplete: 'email', feedback: 'Enter a valid email (30 characters max).' })}`,
    });
  }

  function passwordForm() {
    formModal({
      id: 'password-form', title: 'Change password', hint: 'You will stay signed in on this device.', submit: 'Update password',
      body: `${field({ name: 'currentPassword', label: 'Current password', type: 'password', autocomplete: 'current-password', feedback: 'Enter your current password.' })}
             ${field({ name: 'newPassword', label: 'New password', type: 'password', minlength: 8, maxlength: 64, autocomplete: 'new-password', feedback: 'At least 8 characters.' })}
             ${field({ name: 'confirm', label: 'Confirm new password', type: 'password', autocomplete: 'new-password', feedback: 'Passwords do not match.' })}`,
    });
  }

  /* ======================= events ======================= */
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const id = Number(el.dataset.id);
    try {
      switch (el.dataset.action) {
        case 'logout': logout(); break;
        case 'open': openBook(id); break;

        case 'new-book': await loadFormData(); bookForm(null); break;
        case 'edit-book': await loadFormData(); bookForm(findBook(id)); break;
        case 'new-author': authorForm(null); break;
        case 'edit-author': authorForm(state.authors.find((a) => a.id === id)); break;
        case 'new-category': categoryForm(null); break;
        case 'edit-category': categoryForm(state.categories.find((c) => c.id === id)); break;
        case 'edit-profile': profileForm(); break;
        case 'change-password': passwordForm(); break;

        case 'fav': {
          if (state.favIds.has(id)) {
            await api(`/favorite/delete/${id}`, { method: 'DELETE' });
            toast('Removed from favorites');
          } else {
            await api(`/favorite/add/${id}`, { method: 'POST' });
            toast('Added to favorites', 'success');
          }
          await loadFavs();
          closeModal();
          if ($('#grid')) paintBooks();
          if ($('#fav-grid')) paintFavorites();
          break;
        }
        case 'toggle-trash':
          state.filters.trashed = !state.filters.trashed;
          await viewBooks();
          break;
        case 'clear-filter':
          state.filters[el.dataset.filter] = '';
          syncControls(); paintFilters(); paintBooks();
          break;
        case 'clear-filters':
          Object.assign(state.filters, { q: '', author: '', category: '' });
          syncControls(); paintFilters(); paintBooks();
          break;
        case 'browse-cat':
          state.filters.category = el.dataset.cat;
          state.filters.trashed = false;
          location.hash = '#/books';
          break;

        case 'soft-delete':
          if (!confirmClick(el)) return;
          await api(`/books/softdelete/${id}`, { method: 'DELETE' });
          closeModal(); toast('Book moved to the trash');
          await refreshView();
          break;
        case 'recover':
          await api(`/books/recover/${id}`, { method: 'PATCH' });
          toast('Book restored', 'success');
          await refreshView();
          break;
        case 'hard-delete':
          if (!confirmClick(el)) return;
          await api(`/books/delete/${id}`, { method: 'DELETE' });
          toast('Book permanently deleted');
          await refreshView();
          break;
        case 'delete-author':
          if (!confirmClick(el)) return;
          await api(`/authors/delete/${id}`, { method: 'DELETE' });
          toast('Author deleted');
          await loadAuthors(); paintAuthors();
          break;
        case 'delete-category':
          if (!confirmClick(el)) return;
          await api(`/categories/delete/${id}`, { method: 'DELETE' });
          toast('Category deleted — its books are now uncategorized');
          await viewCategories();
          break;
      }
    } catch (err) { toast(err.message, 'danger'); }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'f-q') { state.filters.q = e.target.value; paintFilters(); paintBooks(); }
    if (e.target.id === 'a-q') { state.filters.authorQ = e.target.value; paintAuthors(); }
    if (e.target.name === 'confirm') e.target.setCustomValidity('');
  });

  document.addEventListener('change', async (e) => {
    if (e.target.id === 'f-category') { state.filters.category = e.target.value; paintFilters(); paintBooks(); }
    if (e.target.id === 'f-author') { state.filters.author = e.target.value; paintFilters(); paintBooks(); }
  });

  document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (!form.id) return;
    e.preventDefault();

    if (form.id === 'password-form') {
      const same = form.elements.newPassword.value === form.elements.confirm.value;
      form.elements.confirm.setCustomValidity(same ? '' : 'mismatch');
    }
    if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

    const btn = form.querySelector('[type="submit"]');
    const label = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }
    const data = Object.fromEntries(new FormData(form).entries());
    const editId = form.dataset.id;

    try {
      switch (form.id) {
        case 'login-form':
          await signin(data.login, data.password);
          break;

        case 'signup-form': {
          const user = await api('/auth/signup', { method: 'POST', body: data });
          await signin(data.email, data.password);
          toast(user.role === 'admin' ? 'Administrator account created — welcome!' : 'Account created — welcome!', 'success');
          break;
        }

        case 'book-form': {
          const body = {
            titre: data.titre, editeur: data.editeur, annee: Number(data.annee),
            description: data.description, auteurId: Number(data.auteurId),
          };
          if (data.categorieId) body.categorieId = Number(data.categorieId);
          const file = form.elements.cover.files[0];
          if (!file && data.imageUrl && data.imageUrl.trim()) body.image = data.imageUrl.trim();
          if (file) {
            const fd = new FormData();
            fd.append('file', file);
            body.image = (await api('/books/upload', { method: 'POST', form: fd })).filename;
          }
          await api(editId ? `/books/edit/${editId}` : '/books/add', { method: editId ? 'PUT' : 'POST', body });
          closeModal();
          toast(editId ? 'Book updated' : 'Book added', 'success');
          await refreshView();
          break;
        }

        case 'author-form':
          await api(editId ? `/authors/edit/${editId}` : '/authors/add', {
            method: editId ? 'PUT' : 'POST', body: { prenom: data.prenom, nom: data.nom },
          });
          closeModal();
          toast(editId ? 'Author updated' : 'Author added', 'success');
          await loadAuthors(); paintAuthors();
          break;

        case 'category-form':
          await api(editId ? `/categories/edit/${editId}` : '/categories/add', {
            method: editId ? 'PUT' : 'POST', body: { nom: data.nom },
          });
          closeModal();
          toast(editId ? 'Category updated' : 'Category added', 'success');
          await viewCategories();
          break;

        case 'profile-form': {
          const p = await api('/profile', { method: 'PATCH', body: { username: data.username, email: data.email } });
          setSession(state.token, { ...state.user, username: p.username, email: p.email });
          closeModal();
          toast('Profile updated', 'success');
          await viewProfile();
          break;
        }

        case 'password-form':
          await api('/profile/password', {
            method: 'PATCH', body: { currentPassword: data.currentPassword, newPassword: data.newPassword },
          });
          closeModal();
          toast('Password updated', 'success');
          break;
      }
    } catch (err) {
      toast(err.message, 'danger');
      if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = label; }
    }
  });

  route();
})();
