/**
 * Fetches the footer fragment. Metadata-independent dual fetch:
 * /content/footer.plain.html (local preview) first, then /footer.plain.html (DA/EDS).
 * @returns {Promise<{html: string, baseUrl: string}|null>}
 */
async function fetchFooter() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  return { html: await resp.text(), baseUrl: resp.url };
}

/**
 * Resolves relative image paths against the fragment URL.
 * @param {Element} root fragment root
 * @param {string} baseUrl URL the fragment was fetched from
 */
function resolveImages(root, baseUrl) {
  root.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (!/^(https?:|data:|\/)/.test(src)) img.src = new URL(src, baseUrl).href;
    img.loading = 'lazy';
  });
}

/**
 * Links that point to another site open in a new tab (as on the source).
 * Image-only links get an accessible name from the image alt text.
 * @param {Element} root footer root
 */
function decorateLinks(root) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const img = a.querySelector('img');
    if (img && !a.textContent.trim()) a.setAttribute('aria-label', img.alt);
    try {
      const url = new URL(a.href, window.location.href);
      if (img && url.origin !== window.location.origin) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
    } catch { /* ignore invalid URLs */ }
  });
}

/**
 * Wraps children of a section in a content container (max-width inset).
 * @param {Element} section footer section
 * @returns {Element} the inner container
 */
function wrapInner(section) {
  const inner = document.createElement('div');
  inner.className = 'footer-inner';
  inner.append(...section.childNodes);
  section.append(inner);
  return inner;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const fragment = await fetchFooter();
  block.textContent = '';
  if (!fragment) return;

  const tmp = document.createElement('div');
  tmp.innerHTML = fragment.html;
  resolveImages(tmp, fragment.baseUrl);
  decorateLinks(tmp);

  const sections = [...tmp.children].filter((el) => el.tagName === 'DIV');
  const [brand, info, legal] = sections;

  // main band: brand row (logo + social) and info (text + partner logos)
  const main = document.createElement('div');
  main.className = 'footer-main';
  const mainInner = document.createElement('div');
  mainInner.className = 'footer-inner';
  main.append(mainInner);

  if (brand) {
    brand.className = 'footer-brand';
    const logo = brand.querySelector(':scope > p');
    if (logo) logo.classList.add('footer-logo');
    const social = brand.querySelector(':scope > ul');
    if (social) social.classList.add('footer-social');
    mainInner.append(brand);
  }

  if (info) {
    info.className = 'footer-info';
    const paras = [...info.querySelectorAll(':scope > p')];
    paras.forEach((p) => {
      const imgs = [...p.querySelectorAll('img')];
      if (imgs.length && !p.textContent.trim()) {
        p.classList.add('footer-partners');
        // spread partner logos to the row edges
        p.textContent = '';
        imgs.forEach((img) => {
          const span = document.createElement('span');
          span.className = 'footer-partner';
          span.append(img);
          p.append(span);
        });
      } else {
        p.classList.add('footer-text');
      }
    });
    mainInner.append(info);
  }

  block.append(main);

  if (legal) {
    legal.className = 'footer-legal';
    wrapInner(legal);
    block.append(legal);
  }
}
