// media query match that indicates desktop width
const isDesktop = window.matchMedia('(width >= 900px)');

/**
 * Fetches the nav fragment. Metadata-independent dual fetch:
 * /content/nav.plain.html (local preview) first, then /nav.plain.html (DA/EDS).
 * @returns {Promise<{html: string, baseUrl: string}|null>}
 */
async function fetchNav() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  return { html: await resp.text(), baseUrl: resp.url };
}

/**
 * Resolves relative image paths in the fragment against the fragment URL,
 * so "images/x.png" works wherever the page lives.
 * @param {Element} root fragment root
 * @param {string} baseUrl URL the fragment was fetched from
 */
function resolveImages(root, baseUrl) {
  root.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (!/^(https?:|data:|\/)/.test(src)) img.src = new URL(src, baseUrl).href;
  });
}

/**
 * Closes every open dropdown in the nav.
 * @param {Element} nav nav element
 * @param {Element} [except] dropdown toggle to leave alone
 */
function closeDropdowns(nav, except) {
  nav.querySelectorAll('.nav-drop > button[aria-expanded="true"]').forEach((btn) => {
    if (btn !== except) btn.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Keeps an open desktop dropdown inside the viewport: if it would overflow on the
 * right, align it to the trigger's right edge instead of its left edge.
 * @param {Element} item nav item (li.nav-drop)
 */
function containDropdown(item) {
  const panel = item.querySelector(':scope > ul');
  if (!panel) return;
  item.classList.remove('nav-drop-align-end');
  if (!isDesktop.matches) return;
  const { right } = panel.getBoundingClientRect();
  if (right > document.documentElement.clientWidth) item.classList.add('nav-drop-align-end');
}

/**
 * Opens/closes the mobile menu.
 * @param {Element} nav nav element
 * @param {boolean|null} force true = open, false = close, null = toggle
 */
function toggleMenu(nav, force = null) {
  const open = force !== null ? force : nav.getAttribute('aria-expanded') !== 'true';
  const button = nav.querySelector('.nav-hamburger button');
  // source menu pushes the page down (no overlay, no scroll lock)
  if (isDesktop.matches) nav.removeAttribute('aria-expanded');
  else nav.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (button) {
    button.setAttribute('aria-expanded', open && !isDesktop.matches ? 'true' : 'false');
    button.setAttribute('aria-label', open && !isDesktop.matches ? 'Close navigation' : 'Open navigation');
  }
  if (!open) closeDropdowns(nav);
}

/**
 * Turns each list item that has a label and a nested list into a dropdown:
 * the label becomes a toggle button, the nested list becomes the panel.
 * @param {Element} nav nav element
 * @param {Element} list top-level list
 */
function buildDropdowns(nav, list) {
  [...list.children].forEach((item) => {
    item.classList.add('nav-item');
    const panel = item.querySelector(':scope > ul');
    if (!panel) return;
    item.classList.add('nav-drop');
    panel.classList.add('nav-drop-panel');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-drop-toggle';
    button.setAttribute('aria-expanded', 'false');
    [...item.childNodes].forEach((node) => {
      if (node === panel) return;
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'P') {
        button.append(...node.childNodes);
        node.remove();
      } else if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
        node.remove();
      } else {
        button.append(node);
      }
    });
    item.prepend(button);
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const expanded = button.getAttribute('aria-expanded') === 'true';
      // one dropdown open at a time (desktop and mobile, as on the source)
      closeDropdowns(nav, button);
      button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      if (!expanded) containDropdown(item);
    });
  });
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNav();
  block.textContent = '';
  if (!fragment) return;

  const tmp = document.createElement('div');
  tmp.innerHTML = fragment.html;
  resolveImages(tmp, fragment.baseUrl);

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main');
  const sections = [...tmp.children].filter((el) => el.tagName === 'DIV');
  ['brand', 'sections', 'tools'].forEach((name, i) => {
    if (sections[i]) {
      sections[i].classList.add(`nav-${name}`);
      nav.append(sections[i]);
    }
  });

  const brandLink = nav.querySelector('.nav-brand a');
  if (brandLink) {
    brandLink.classList.add('nav-brand-link');
    const img = brandLink.querySelector('img');
    if (img) {
      img.loading = 'eager';
      if (!brandLink.getAttribute('aria-label')) brandLink.setAttribute('aria-label', img.alt || 'Home');
    }
  }

  const list = nav.querySelector('.nav-sections > ul');
  if (list) {
    list.classList.add('nav-list');
    buildDropdowns(nav, list);
  }

  // hamburger (visible below the desktop breakpoint only)
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav-menu" aria-expanded="false" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.querySelector('button').addEventListener('click', () => toggleMenu(nav));
  const navSections = nav.querySelector('.nav-sections');
  if (navSections) navSections.id = 'nav-menu';
  nav.querySelector('.nav-brand')?.after(hamburger);

  // close dropdowns on outside click and Escape
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) closeDropdowns(nav);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = nav.querySelector('.nav-drop > button[aria-expanded="true"]');
    if (open) {
      closeDropdowns(nav);
      open.focus();
    } else if (!isDesktop.matches && nav.getAttribute('aria-expanded') === 'true') {
      toggleMenu(nav, false);
      hamburger.querySelector('button').focus();
    }
  });

  // reset state when crossing the desktop breakpoint
  toggleMenu(nav, false);
  isDesktop.addEventListener('change', () => {
    closeDropdowns(nav);
    nav.querySelectorAll('.nav-drop-align-end').forEach((el) => el.classList.remove('nav-drop-align-end'));
    toggleMenu(nav, false);
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);

  // skip link (first focusable element on the page); target id is set in scripts.js
  const skip = document.createElement('a');
  skip.className = 'skip-link';
  skip.href = '#main';
  skip.textContent = 'Skip to main content';
  block.append(skip, navWrapper);
}
