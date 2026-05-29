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
