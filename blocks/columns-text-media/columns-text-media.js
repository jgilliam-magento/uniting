export default function decorate(block) {
  const firstRow = block.firstElementChild;
  const cols = firstRow ? [...firstRow.children] : [];
  block.classList.add(`columns-text-media-${cols.length}-cols`);

  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pics = col.querySelectorAll('picture');
      const hasText = [...col.childNodes].some((n) => {
        if (n.nodeType === Node.TEXT_NODE) return n.textContent.trim().length > 0;
        if (n.nodeType !== Node.ELEMENT_NODE) return false;
        const clone = n.cloneNode(true);
        clone.querySelectorAll('picture').forEach((p) => p.remove());
        return clone.textContent.trim().length > 0;
      });
      if (pics.length && !hasText) {
        col.classList.add('columns-text-media-media-col');
      } else {
        col.classList.add('columns-text-media-text-col');
      }
    });
  });
}
