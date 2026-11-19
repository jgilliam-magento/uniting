import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-news-card';
    [...row.children].forEach((cell) => {
      const hasText = cell.textContent.trim().length > 0;
      if (cell.querySelector('picture') && !hasText) {
        cell.className = 'cards-news-card-image';
      } else if (hasText || cell.children.length) {
        cell.className = 'cards-news-card-body';
      } else {
        return;
      }
      li.append(cell);
    });
    if (!li.children.length) return;

    // make the whole card clickable via the title link
    const titleLink = li.querySelector('.cards-news-card-body :is(h2, h3, h4) a')
      || li.querySelector('.cards-news-card-body a');
    const image = li.querySelector('.cards-news-card-image');
    if (titleLink && image && !image.querySelector('a')) {
      const a = document.createElement('a');
      a.href = titleLink.href;
      a.setAttribute('aria-hidden', 'true');
      a.tabIndex = -1;
      a.append(...image.childNodes);
      image.append(a);
    }
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
  });
  block.replaceChildren(ul);
}
