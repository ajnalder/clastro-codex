const root = document.querySelector<HTMLElement>('[data-joe-edit-root]');
const toolbar = document.querySelector<HTMLElement>('[data-joe-toolbar]');
const status = document.querySelector<HTMLElement>('[data-joe-edit-status]');
const publishButton = document.querySelector<HTMLButtonElement>('[data-joe-publish]');
const editableRegions = document.querySelectorAll<HTMLElement>('[data-editable]');
const editModeEnabled = new URLSearchParams(window.location.search).get('clastro-edit') === '1';

function setDraftState(): void {
  if (status) {
    status.textContent = 'Draft changes';
  }
  if (publishButton) {
    publishButton.disabled = false;
  }
  root?.setAttribute('data-dirty', 'true');
}

function setPublishedState(): void {
  if (status) {
    status.textContent = 'Published';
  }
  if (publishButton) {
    publishButton.disabled = true;
  }
  root?.setAttribute('data-dirty', 'false');
}

function positionToolbar(target: HTMLElement): void {
  if (!toolbar) {
    return;
  }
  const rect = target.getBoundingClientRect();
  toolbar.hidden = false;
  toolbar.style.left = `${Math.max(16, rect.left)}px`;
  toolbar.style.top = `${Math.max(62, rect.top - 48 + window.scrollY)}px`;
}

if (editModeEnabled) {
  document.body.classList.add('is-editing');
  if (root) {
    root.hidden = false;
  }

  editableRegions.forEach((region) => {
    region.contentEditable = 'true';
    region.spellcheck = true;
    region.tabIndex = 0;
    region.addEventListener('focus', () => positionToolbar(region));
    region.addEventListener('input', setDraftState);
  });

  toolbar?.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });

  toolbar?.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-command]');
    if (!button) {
      return;
    }
    document.execCommand(button.dataset.command ?? '');
    setDraftState();
  });

  publishButton?.addEventListener('click', setPublishedState);

  document.querySelectorAll<HTMLAnchorElement>('[data-editable-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
    });
  });
}

export {};
