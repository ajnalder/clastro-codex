const root = document.querySelector<HTMLElement>('[data-joe-edit-root]');
const toolbar = document.querySelector<HTMLElement>('[data-joe-toolbar]');
const status = document.querySelector<HTMLElement>('[data-joe-edit-status]');
const publishButton = document.querySelector<HTMLButtonElement>('[data-joe-publish]');
const editableRegions = document.querySelectorAll<HTMLElement>('[data-editable]');
const editModeEnabled = new URLSearchParams(window.location.search).get('clastro-edit') === '1';
const siteId = root?.dataset.siteId ?? 'joes-plumbing';
const pageId = root?.dataset.pageId ?? 'home';
const saveTimers = new Map<string, number>();

interface PageRegionResponse {
  regions: Array<{
    regionId: string;
    value: string;
    status: 'draft' | 'published';
  }>;
}

function setStatusLabel(label: string): void {
  if (status) {
    status.textContent = label;
  }
}

function setDraftState(label = 'Draft changes'): void {
  setStatusLabel(label);
  if (publishButton) {
    publishButton.disabled = false;
  }
  root?.setAttribute('data-dirty', 'true');
}

function setPublishedState(): void {
  setStatusLabel('Published');
  if (publishButton) {
    publishButton.disabled = true;
  }
  root?.setAttribute('data-dirty', 'false');
}

function setErrorState(): void {
  setDraftState('Save failed');
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

async function loadDrafts(): Promise<void> {
  const response = await fetch(`/api/page-regions/draft?siteId=${encodeURIComponent(siteId)}&pageId=${encodeURIComponent(pageId)}`);
  if (!response.ok) {
    return;
  }
  const payload = (await response.json()) as PageRegionResponse;
  if (payload.regions.length > 0) {
    applyRegions(payload.regions);
    setDraftState('Draft changes');
    return;
  }

  const publishedResponse = await fetch(
    `/api/page-regions/published?siteId=${encodeURIComponent(siteId)}&pageId=${encodeURIComponent(pageId)}`,
  );
  if (!publishedResponse.ok) {
    return;
  }
  const publishedPayload = (await publishedResponse.json()) as PageRegionResponse;
  applyRegions(publishedPayload.regions);
  setPublishedState();
}

function applyRegions(regions: PageRegionResponse['regions']): void {
  for (const region of regions) {
    const target = document.querySelector<HTMLElement>(`[data-editable="${CSS.escape(region.regionId)}"]`);
    if (target) {
      target.innerHTML = region.value;
    }
  }
}

async function saveRegion(region: HTMLElement): Promise<void> {
  const regionId = region.dataset.editable;
  if (!regionId) {
    return;
  }

  const response = await fetch('/api/page-regions/draft', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      siteId,
      pageId,
      regionId,
      value: region.innerHTML,
      updatedBy: 'owner',
    }),
  });

  if (!response.ok) {
    throw new Error('Unable to save page region draft');
  }
}

function scheduleSave(region: HTMLElement): void {
  const regionId = region.dataset.editable;
  if (!regionId) {
    return;
  }
  window.clearTimeout(saveTimers.get(regionId));
  setDraftState('Saving draft');
  saveTimers.set(
    regionId,
    window.setTimeout(() => {
      saveRegion(region)
        .then(() => setDraftState('Draft changes'))
        .catch(setErrorState);
    }, 300),
  );
}

async function publishDrafts(): Promise<void> {
  setStatusLabel('Publishing');
  const response = await fetch('/api/page-regions/publish', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      siteId,
      pageId,
      updatedBy: 'owner',
    }),
  });

  if (!response.ok) {
    setErrorState();
    return;
  }
  setPublishedState();
}

if (editModeEnabled) {
  document.body.classList.add('is-editing');
  if (root) {
    root.hidden = false;
  }
  void loadDrafts();

  editableRegions.forEach((region) => {
    region.contentEditable = 'true';
    region.spellcheck = true;
    region.tabIndex = 0;
    region.addEventListener('focus', () => positionToolbar(region));
    region.addEventListener('input', () => scheduleSave(region));
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
    const activeRegion = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>('[data-editable]') : null;
    if (activeRegion) {
      scheduleSave(activeRegion);
    } else {
      setDraftState();
    }
  });

  publishButton?.addEventListener('click', () => {
    void publishDrafts();
  });

  document.querySelectorAll<HTMLAnchorElement>('[data-editable-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
    });
  });
}

export {};
