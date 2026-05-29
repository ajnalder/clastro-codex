# CMS Structured Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable Clastro CMS admin surface: a contract-driven structured editor for collections, items, fields, per-item extra sections, draft state, and publish actions.

**Architecture:** The CMS UI is an Astro page that renders from pure TypeScript view models. Behaviour that needs testing lives in small framework-agnostic modules; the Astro page consumes those modules and a lightweight browser script manages local editor state for the demo. This slice does not add auth, real D1 writes from the browser, media uploads, or inline WYSIWYG editing.

**Tech Stack:** Astro, TypeScript, CSS, Vitest, existing content contract modules.

---

## Scope Check

This plan implements the first structured CMS editor slice only:

- CMS admin route at `/cms`
- content-contract-driven navigation
- sample collection items for procedure and service examples
- selected collection and selected item view model
- generated editor fields for core fields and item-specific extra sections
- local draft/publish UI state in the browser
- responsive dashboard styling

Later plans will add:

- authenticated sessions
- real Worker API persistence from the browser
- inline static page editing
- media library uploads
- rich text editor integration
- publish-triggered Astro rebuild orchestration
- analytics and AI blog workflows

## File Structure

- Create: `src/cms/sample-content.ts` - sample content items that demonstrate per-item extras.
- Create: `src/cms/view-model.ts` - pure functions that convert contracts and items into CMS navigation/editor view models.
- Create: `src/cms/editor-state.ts` - pure reducer for local draft/publish state.
- Create: `src/cms/client.ts` - lightweight browser interactions for the CMS demo.
- Create: `src/styles/cms.css` - admin interface styling.
- Create: `src/pages/cms.astro` - CMS admin page.
- Create: `tests/cms/view-model.test.ts` - view-model tests.
- Create: `tests/cms/editor-state.test.ts` - editor-state tests.

## Task 1: CMS View Model

**Files:**
- Create: `tests/cms/view-model.test.ts`
- Create: `src/cms/sample-content.ts`
- Create: `src/cms/view-model.ts`

- [ ] **Step 1: Write failing view-model tests**

Create `tests/cms/view-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { plasticSurgeonContract, plumberContract } from '../../src/contracts';
import { plasticSurgeonItems, plumberItems } from '../../src/cms/sample-content';
import { createCmsViewModel } from '../../src/cms/view-model';

describe('createCmsViewModel', () => {
  it('creates collection navigation from the contract labels', () => {
    const model = createCmsViewModel(plasticSurgeonContract, plasticSurgeonItems, {
      selectedCollectionId: 'procedures',
      selectedItemId: 'aft',
    });

    expect(model.navigation.map((item) => item.label)).toEqual(['Procedures', 'Blog']);
    expect(model.activeCollection?.label).toBe('Procedures');
  });

  it('shows item-specific extra sections only for the selected item', () => {
    const model = createCmsViewModel(plasticSurgeonContract, plasticSurgeonItems, {
      selectedCollectionId: 'procedures',
      selectedItemId: 'aft',
    });

    expect(model.activeItem?.extraSections.map((section) => section.label)).toEqual([
      'Recovery Timeline',
      'Comparison Table',
    ]);
  });

  it('supports a different client model using the same plumbing', () => {
    const model = createCmsViewModel(plumberContract, plumberItems, {
      selectedCollectionId: 'services',
      selectedItemId: 'emergency',
    });

    expect(model.activeCollection?.itemLabel).toBe('Service');
    expect(model.activeItem?.extraSections.map((section) => section.label)).toEqual([
      'Service Area List',
      'Price Guide',
      'Urgency Callout',
    ]);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/cms/view-model.test.ts`

Expected: FAIL because `src/cms/sample-content` and `src/cms/view-model` do not exist.

- [ ] **Step 3: Implement sample content**

Create `src/cms/sample-content.ts` with published sample items for `procedures`, `blogPosts`, and `services`. Include an AFT procedure with `recoveryTimeline` and `comparisonTable` extra sections, a breast reduction procedure with `faqCluster`, and an emergency plumbing service with `serviceAreaList`, `priceGuide`, and `urgencyCallout`.

- [ ] **Step 4: Implement view model**

Create `src/cms/view-model.ts` with:

- `CmsSampleItem`
- `CmsFieldView`
- `CmsExtraSectionView`
- `CmsItemView`
- `CmsCollectionView`
- `CmsViewModel`
- `createCmsViewModel(contract, items, selection)`

The function must:

- create navigation from contract collections
- choose the requested collection or the first collection
- choose the requested item or the first item in the active collection
- map core fields from the active collection schema to current item values
- map extra sections from the selected item by looking up section definitions in `extraSectionTypes`
- omit extra sections not present on the selected item

- [ ] **Step 5: Run tests and verify pass**

Run: `npm test -- tests/cms/view-model.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/cms/sample-content.ts src/cms/view-model.ts tests/cms/view-model.test.ts
git commit -m "feat: add CMS view model"
```

## Task 2: Editor State Reducer

**Files:**
- Create: `tests/cms/editor-state.test.ts`
- Create: `src/cms/editor-state.ts`

- [ ] **Step 1: Write failing editor-state tests**

Create `tests/cms/editor-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createInitialEditorState, editorReducer } from '../../src/cms/editor-state';

describe('editorReducer', () => {
  it('marks the editor dirty when a field changes', () => {
    const state = createInitialEditorState('procedures', 'aft');
    const next = editorReducer(state, {
      type: 'fieldChanged',
      fieldId: 'title',
      value: 'AFT Fat Transfer Updated',
    });

    expect(next.dirty).toBe(true);
    expect(next.statusLabel).toBe('Draft changes');
    expect(next.fields.title).toBe('AFT Fat Transfer Updated');
  });

  it('marks changes as published when publish succeeds', () => {
    const state = editorReducer(createInitialEditorState('procedures', 'aft'), {
      type: 'fieldChanged',
      fieldId: 'title',
      value: 'Published title',
    });

    const next = editorReducer(state, { type: 'published' });

    expect(next.dirty).toBe(false);
    expect(next.statusLabel).toBe('Published');
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/cms/editor-state.test.ts`

Expected: FAIL because `src/cms/editor-state` does not exist.

- [ ] **Step 3: Implement reducer**

Create `src/cms/editor-state.ts` with `createInitialEditorState(collectionId, itemId)` and `editorReducer(state, action)`. Support `fieldChanged`, `extraFieldChanged`, `saved`, and `published` actions.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- tests/cms/editor-state.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/cms/editor-state.ts tests/cms/editor-state.test.ts
git commit -m "feat: add CMS editor state reducer"
```

## Task 3: CMS Admin Page

**Files:**
- Create: `src/pages/cms.astro`
- Create: `src/styles/cms.css`
- Create: `src/cms/client.ts`

- [ ] **Step 1: Create CMS page**

Create `src/pages/cms.astro`. It should render the plastic surgeon example by default, using `createCmsViewModel`. The first viewport must be the actual CMS interface, not a landing page.

Required interface regions:

- left sidebar with collection navigation
- item list for the active collection
- main editor panel with core fields
- extra sections panel for item-specific sections
- right rail showing draft/publish status and content contract notes

- [ ] **Step 2: Create CSS**

Create `src/styles/cms.css`. Use a restrained dashboard palette, dense but readable layout, 8px maximum border radii on cards and controls, responsive single-column collapse on mobile, and no decorative gradient/orb background.

- [ ] **Step 3: Create client script**

Create `src/cms/client.ts`. It should:

- update the status text to `Draft changes` when an input changes
- enable the publish button after edits
- update the status text to `Published` when the publish button is clicked
- disable the publish button after publish

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: PASS and `/cms/index.html` appears in the build output.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/pages/cms.astro src/styles/cms.css src/cms/client.ts
git commit -m "feat: add structured CMS admin page"
```

## Task 4: Full Verification And Push

**Files:**
- Modify only if verification exposes errors.

- [ ] **Step 1: Run tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run TypeScript**

Run: `npx tsc --noEmit`

Expected: no type errors.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: Astro build succeeds.

- [ ] **Step 4: Run local browser verification**

Run: `npm run dev -- --host 127.0.0.1`

Open `/cms` and confirm:

- CMS page renders nonblank
- collection sidebar is visible
- item list is visible
- core fields are editable
- extra sections are visible for AFT
- changing a field marks the state as draft changes
- clicking Publish marks the state as published
- mobile viewport does not overlap text or controls

- [ ] **Step 5: Push branch**

Run:

```bash
git status --short
git push -u origin feat/cms-structured-editor
```

Expected: working tree is clean and branch is pushed.

## Self-Review

Spec coverage in this plan:

- Structured collections: Task 1 and Task 3.
- Per-item extra sections: Task 1 and Task 3.
- Reusable content primitives: Task 1 and Task 3.
- Client-comprehensible CMS navigation: Task 1 and Task 3.
- Draft/publish UI concept: Task 2 and Task 3.

Intentional gaps:

- Real persistence from browser to Worker.
- Auth.
- Inline WYSIWYG editing.
- Media uploads.
- Rich text package integration.
- Analytics and AI.

Scope scan result: no deferred implementation notes or unspecified validation steps remain in this plan.
