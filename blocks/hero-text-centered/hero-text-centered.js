import { createOptimizedPicture } from '../../scripts/aem.js';

function optimize(block) {
  block.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, true, [{ width: '2000' }]));
  });
}

/**
 * Returns the link when the paragraph holds a single link and nothing else.
 * @param {Element} p paragraph
 * @returns {HTMLAnchorElement|null}
 */
function getSoleLink(p) {
  if (p.tagName !== 'P') return null;
  const links = p.querySelectorAll('a[href]');
  if (links.length !== 1) return null;
  const [a] = links;
  if (a.querySelector('img, picture')) return null;
  const text = p.textContent.trim();
  return text && text === a.textContent.trim() ? a : null;
}

/**
 * Buttonizes standalone CTA paragraphs and groups them in one centered row.
 * Source order: first CTA is the outline pill (secondary), the rest are solid (primary).
 * Links already buttonized globally (authored bold/italic) keep their variant.
 * @param {Element} content block content wrapper
 */
function decorateActions(content) {
  const ctas = [...content.children]
    .map((p) => ({ p, a: getSoleLink(p) }))
    .filter(({ a }) => a);
  if (!ctas.length) return;

  const group = document.createElement('div');
  group.className = 'hero-text-centered-actions';
  ctas[0].p.before(group);

  ctas.forEach(({ p, a }, i) => {
    if (!a.classList.contains('button')) {
      // unwrap <strong>/<em> around the link so the label is plain button text
      const wrapper = a.parentElement !== p ? a.parentElement.closest('p > *') : null;
      if (wrapper) wrapper.replaceWith(a);
      a.className = `button ${i === 0 ? 'secondary' : 'primary'}`;
    }
    p.classList.add('button-wrapper');
    group.append(p);
  });
}

/**
 * Source highlights a word in the heading with <mark>; the import authors it as <em>.
 * @param {Element} content block content wrapper
 */
function decorateHighlights(content) {
  content.querySelectorAll('h1 em, h2 em').forEach((em) => {
    const mark = document.createElement('mark');
    mark.append(...em.childNodes);
    em.replaceWith(mark);
  });
}

export default function decorate(block) {
  const rows = [...block.children];
  const media = document.createElement('div');
  media.className = 'hero-text-centered-media';
  const content = document.createElement('div');
  content.className = 'hero-text-centered-content';

  rows.forEach((row) => {
    [...row.children].forEach((cell) => {
      const hasText = cell.textContent.trim().length > 0;
      const pic = cell.querySelector('picture');
      if (pic && !hasText) {
        media.append(...cell.childNodes);
      } else if (hasText || cell.children.length) {
        content.append(...cell.childNodes);
      }
    });
  });

  decorateHighlights(content);
  decorateActions(content);

  block.replaceChildren();
  if (media.children.length) {
    block.classList.add('hero-text-centered-has-media');
    block.append(media);
  }
  block.append(content);
  optimize(block);
}
