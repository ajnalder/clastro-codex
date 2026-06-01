import {
  normalizePageRegionFormat,
  resolvePageRegionFormatChange,
  type PageRegionElementType,
  type PageRegionSize,
} from '../content-store/page-region-format';
import { calculateFloatingToolbarPosition } from './toolbar-position';

const root = document.querySelector<HTMLElement>('[data-joe-edit-root]');
const toolbar = document.querySelector<HTMLElement>('[data-joe-toolbar]');
const status = document.querySelector<HTMLElement>('[data-joe-edit-status]');
const publishButton = document.querySelector<HTMLButtonElement>('[data-joe-publish]');
const elementSelect = toolbar?.querySelector('[data-editor-element]') as HTMLSelectElement | null | undefined;
const sizeSelect = toolbar?.querySelector('[data-editor-size]') as HTMLSelectElement | null | undefined;
const editModeEnabled = new URLSearchParams(window.location.search).get('clastro-edit') === '1';
const siteId = root?.dataset.siteId ?? 'joes-plumbing';
const pageId = root?.dataset.pageId ?? 'home';
const saveTimers = new Map<string, number>();
let activeRegion: HTMLElement | null = null;

interface PageRegionResponse {
  regions: Array<{
    regionId: string;
    value: string;
    elementType?: PageRegionElementType;
    size?: PageRegionSize;
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
  activeRegion = target;
  toolbar.hidden = false;
  updateToolbarState(target);
  requestAnimationFrame(() => {
    if (!toolbar || !activeRegion) {
      return;
    }
    const targetRect = activeRegion.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    const position = calculateFloatingToolbarPosition({
      targetRect,
      toolbarSize: {
        width: toolbarRect.width,
        height: toolbarRect.height,
      },
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
    toolbar.style.left = `${position.left}px`;
    toolbar.style.top = `${position.top}px`;
    toolbar.dataset.placement = position.placement;
  });
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
      const format = normalizePageRegionFormat({
        elementType: region.elementType ?? target.dataset.elementType ?? target.tagName.toLowerCase(),
        size: region.size ?? target.dataset.editorSize,
      });
      const formattedTarget = setRegionFormat(target, format.elementType, format.size, false);
      formattedTarget.innerHTML = region.value;
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
      elementType: getRegionElementType(region),
      size: getRegionSize(region),
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

function getRegionElementType(region: HTMLElement): PageRegionElementType {
  return normalizePageRegionFormat({
    elementType: region.dataset.elementType ?? region.tagName.toLowerCase(),
    size: region.dataset.editorSize,
  }).elementType;
}

function getRegionSize(region: HTMLElement): PageRegionSize {
  return normalizePageRegionFormat({
    elementType: region.dataset.elementType ?? region.tagName.toLowerCase(),
    size: region.dataset.editorSize,
  }).size;
}

function updateToolbarState(region: HTMLElement): void {
  if (elementSelect) {
    elementSelect.value = getRegionElementType(region);
  }
  if (sizeSelect) {
    sizeSelect.value = getRegionSize(region);
  }
}

function bindEditableRegion(region: HTMLElement): void {
  if (region.dataset.editorBound === 'true') {
    return;
  }

  region.dataset.editorBound = 'true';
  region.contentEditable = 'true';
  region.spellcheck = true;
  region.tabIndex = 0;
  region.dataset.elementType = getRegionElementType(region);
  region.dataset.editorSize = getRegionSize(region);
  region.addEventListener('focus', () => positionToolbar(region));
  region.addEventListener('click', () => positionToolbar(region));
  region.addEventListener('input', () => scheduleSave(region));
}

function setRegionFormat(
  region: HTMLElement,
  elementType: PageRegionElementType,
  size: PageRegionSize,
  shouldSave = true,
): HTMLElement {
  let formattedRegion = region;
  if (region.tagName.toLowerCase() !== elementType) {
    const replacement = document.createElement(elementType);
    for (const attribute of Array.from(region.attributes)) {
      if (attribute.name === 'data-editor-bound') {
        continue;
      }
      replacement.setAttribute(attribute.name, attribute.value);
    }
    replacement.innerHTML = region.innerHTML;
    region.replaceWith(replacement);
    formattedRegion = replacement;
  }

  formattedRegion.dataset.elementType = elementType;
  formattedRegion.dataset.editorSize = size;
  bindEditableRegion(formattedRegion);
  activeRegion = formattedRegion;
  updateToolbarState(formattedRegion);

  if (shouldSave) {
    formattedRegion.focus();
    positionToolbar(formattedRegion);
    scheduleSave(formattedRegion);
  }

  return formattedRegion;
}

function applyToolbarFormat(control: HTMLSelectElement): void {
  const region = activeRegion ?? (document.activeElement instanceof HTMLElement
    ? document.activeElement.closest<HTMLElement>('[data-editable]')
    : null);
  if (!region) {
    return;
  }

  const currentFormat = {
    elementType: getRegionElementType(region),
    size: getRegionSize(region),
  };
  const format = resolvePageRegionFormatChange(currentFormat, {
    elementType: control.matches('[data-editor-element]') ? control.value : undefined,
    size: control.matches('[data-editor-size]') ? control.value : undefined,
  });
  setRegionFormat(region, format.elementType, format.size);
}

function runEditorCommand(command: string): void {
  if (command === 'createLink') {
    const href = window.prompt('Paste the link URL');
    if (!href) {
      return;
    }
    document.execCommand(command, false, href);
    return;
  }

  document.execCommand(command);
}

if (editModeEnabled) {
  document.body.classList.add('is-editing');
  if (root) {
    root.hidden = false;
  }
  void loadDrafts();

  document.querySelectorAll<HTMLElement>('[data-editable]').forEach(bindEditableRegion);

  toolbar?.addEventListener('mousedown', (event) => {
    if ((event.target as HTMLElement).closest('button')) {
      event.preventDefault();
    }
  });

  toolbar?.addEventListener('change', (event) => {
    const control = (event.target as HTMLElement).closest('[data-editor-element], [data-editor-size]') as HTMLSelectElement | null;
    if (!control) {
      return;
    }
    applyToolbarFormat(control);
  });

  toolbar?.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-command]');
    if (!button) {
      return;
    }
    runEditorCommand(button.dataset.command ?? '');
    const region = activeRegion ?? (document.activeElement instanceof HTMLElement
      ? document.activeElement.closest<HTMLElement>('[data-editable]')
      : null);
    if (region) {
      scheduleSave(region);
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

  window.addEventListener('scroll', () => {
    if (activeRegion && toolbar && !toolbar.hidden) {
      positionToolbar(activeRegion);
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (activeRegion && toolbar && !toolbar.hidden) {
      positionToolbar(activeRegion);
    }
  });
}

export {};
