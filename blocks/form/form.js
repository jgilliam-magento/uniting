/*
 * Self-contained form block.
 *
 * Authored as a table. Field rows:
 *   | Label | Type | Name | Placeholder | Required | Group |
 * - Type: text, email, tel, number, url, textarea, checkbox, select, hidden, submit
 *   (unknown or empty types fall back to text).
 * - For select, put the options comma separated in the Placeholder cell.
 * - Required: "yes", "true", "required" or "x".
 * - Group: consecutive rows sharing a Group value render in one fieldset with
 *   that value as the legend (e.g. "Name" for first + last name).
 * - A "submit" row uses the Label as the button text.
 * Settings rows (two cells, key in the first): action, method, success, error.
 * An optional header row whose first cell is "Label"/"Field" is ignored.
 */

const FIELD_TYPES = ['text', 'email', 'tel', 'number', 'url', 'textarea', 'checkbox', 'select', 'hidden', 'submit', 'date'];
const SETTINGS = ['action', 'method', 'success', 'error'];
const TRUTHY = ['yes', 'true', 'required', 'x', 'y', '1'];

const toName = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function cellText(cell) {
  return cell ? cell.textContent.trim() : '';
}

function parseRows(block) {
  const settings = {};
  const fields = [];
  [...block.children].forEach((row, idx) => {
    const cells = [...row.children];
    const first = cellText(cells[0]);
    const key = first.toLowerCase();
    if (!first && !cellText(cells[1])) return;
    if (idx === 0 && ['label', 'field', 'field label'].includes(key)) return;
    if (cells.length === 2 && SETTINGS.includes(key)) {
      const link = cells[1].querySelector('a');
      settings[key] = link ? link.getAttribute('href') : cellText(cells[1]);
      return;
    }
    let type = cellText(cells[1]).toLowerCase();
    if (!FIELD_TYPES.includes(type)) type = 'text';
    fields.push({
      label: first,
      type,
      name: cellText(cells[2]) || toName(first) || `field-${idx}`,
      placeholder: cellText(cells[3]),
      required: TRUTHY.includes(cellText(cells[4]).toLowerCase()),
      group: cellText(cells[5]),
    });
  });
  return { settings, fields };
}

let uid = 0;

function buildField(field) {
  uid += 1;
  const id = `form-${toName(field.name) || 'field'}-${uid}`;
  const wrapper = document.createElement('div');
  wrapper.className = `form-field form-field-${field.type}`;

  if (field.type === 'submit') {
    const button = document.createElement('button');
    button.type = 'submit';
    button.className = 'button';
    button.textContent = field.label || 'Submit';
    wrapper.append(button);
    return wrapper;
  }

  let input;
  if (field.type === 'textarea') {
    input = document.createElement('textarea');
  } else if (field.type === 'select') {
    input = document.createElement('select');
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = field.label ? `Select ${field.label.toLowerCase()}` : 'Select';
    input.append(blank);
    field.placeholder.split(',').map((o) => o.trim()).filter(Boolean).forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o;
      opt.textContent = o;
      input.append(opt);
    });
  } else {
    input = document.createElement('input');
    input.type = field.type;
  }
  input.id = id;
  input.name = field.name;
  if (field.placeholder && field.type !== 'select' && field.type !== 'checkbox') {
    input.placeholder = field.placeholder;
  }
  // autofill hints from common field names (WCAG 1.3.5 identify input purpose)
  const AUTOCOMPLETE = {
    firstname: 'given-name',
    givenname: 'given-name',
    lastname: 'family-name',
    surname: 'family-name',
    familyname: 'family-name',
    name: 'name',
    fullname: 'name',
    email: 'email',
    phone: 'tel',
    tel: 'tel',
    postcode: 'postal-code',
    zip: 'postal-code',
    zipcode: 'postal-code',
    postalcode: 'postal-code',
  };
  const token = AUTOCOMPLETE[String(field.name).toLowerCase().replace(/[^a-z]/g, '')];
  if (token) input.autocomplete = token;
  else if (field.type === 'email') input.autocomplete = 'email';
  if (field.required) {
    input.required = true;
    wrapper.classList.add('form-field-required');
  }
  if (field.type === 'hidden') {
    input.value = field.placeholder;
    wrapper.append(input);
    return wrapper;
  }

  const label = document.createElement('label');
  label.htmlFor = id;
  label.className = 'form-label';
  label.textContent = field.label;
  if (field.required) {
    const req = document.createElement('span');
    req.className = 'form-required';
    req.textContent = ' (Required)';
    label.append(req);
  }

  if (field.type === 'checkbox') wrapper.append(input, label);
  else wrapper.append(label, input);
  return wrapper;
}

function buildForm(fields) {
  const form = document.createElement('form');
  form.noValidate = false;
  let currentGroup = null;
  fields.forEach((field) => {
    const el = buildField(field);
    if (field.group && field.type !== 'submit') {
      if (!currentGroup || currentGroup.dataset.group !== field.group) {
        currentGroup = document.createElement('fieldset');
        currentGroup.className = 'form-group';
        currentGroup.dataset.group = field.group;
        const legend = document.createElement('legend');
        legend.className = 'form-label';
        legend.textContent = field.group;
        if (field.required) {
          const req = document.createElement('span');
          req.className = 'form-required';
          req.textContent = ' (Required)';
          legend.append(req);
        }
        const row = document.createElement('div');
        row.className = 'form-group-fields';
        currentGroup.append(legend, row);
        form.append(currentGroup);
      }
      el.classList.add('form-field-grouped');
      currentGroup.querySelector('.form-group-fields').append(el);
    } else {
      currentGroup = null;
      form.append(el);
    }
  });
  if (!form.querySelector('button[type="submit"]')) {
    form.append(buildField({ type: 'submit', label: 'Submit' }));
  }
  return form;
}

function showMessage(form, text, type) {
  let msg = form.querySelector('.form-message');
  if (!msg) {
    msg = document.createElement('p');
    msg.className = 'form-message';
    msg.setAttribute('role', 'status');
    form.append(msg);
  }
  msg.className = `form-message form-message-${type}`;
  msg.textContent = text;
}

export default function decorate(block) {
  const { settings, fields } = parseRows(block);
  const form = buildForm(fields);
  const method = (settings.method || 'POST').toUpperCase();
  const success = settings.success || 'Thank you for signing up.';
  const error = settings.error || 'Sorry, something went wrong. Please try again.';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const submit = form.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(form).entries());
    if (submit) submit.disabled = true;
    try {
      if (settings.action) {
        const resp = await fetch(settings.action, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        });
        if (!resp.ok) throw new Error(`Form submission failed: ${resp.status}`);
      }
      form.reset();
      showMessage(form, success, 'success');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      showMessage(form, error, 'error');
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  block.replaceChildren(form);
}
