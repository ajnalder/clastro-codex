const root = document.querySelector<HTMLElement>('[data-cms-root]');
const statusText = document.querySelector<HTMLElement>('[data-status-text]');
const statusPill = document.querySelector<HTMLElement>('[data-status-pill]');
const statusHelper = document.querySelector<HTMLElement>('[data-status-helper]');
const publishButton = document.querySelector<HTMLButtonElement>('[data-publish-button]');
const editorForm = document.querySelector<HTMLFormElement>('[data-editor-form]');

function setStatus(label: string, helper: string, dirty: boolean): void {
  if (statusText) {
    statusText.textContent = label;
  }
  if (statusPill) {
    statusPill.textContent = label;
  }
  if (statusHelper) {
    statusHelper.textContent = helper;
  }
  if (publishButton) {
    publishButton.disabled = !dirty;
  }
  root?.setAttribute('data-editor-dirty', String(dirty));
}

editorForm?.addEventListener('input', () => {
  setStatus('Draft changes', 'Autosaved locally. Publish when this content should go live.', true);
});

publishButton?.addEventListener('click', () => {
  setStatus('Published', 'Published in this editor session. A production publish will trigger an Astro rebuild.', false);
});
