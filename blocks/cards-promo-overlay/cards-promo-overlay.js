import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-promo-overlay-card';
    const cells = [...row.children];
    cells.forEach((cell) => {
      const hasText = cell.textContent.trim().length > 0;
      if (cell.querySelector('picture') && !hasText) {
        cell.className = 'cards-promo-overlay-card-image';
      } else if (hasText || cell.children.length) {
        cell.className = 'cards-promo-overlay-card-body';
      } else {
        return;
      }
      li.append(cell);
    });
    if (!li.querySelector('.cards-promo-overlay-card-image')) li.classList.add('cards-promo-overlay-card-no-image');
    // buttonize paragraphs that contain nothing but a single link (outline pill CTA)
    li.querySelectorAll('.cards-promo-overlay-card-body p').forEach((p) => {
      const links = p.querySelectorAll('a');
      if (links.length !== 1) return;
      const a = links[0];
      if (p.textContent.trim() !== a.textContent.trim() || p.querySelector('picture, img')) return;
      p.classList.add('button-wrapper');
      a.classList.add('button');
      if (!a.classList.contains('primary') && !a.classList.contains('accent')) a.classList.add('secondary');
    });
    if (li.children.length) ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '1200' }]));
  });
  block.replaceChildren(ul);
}
