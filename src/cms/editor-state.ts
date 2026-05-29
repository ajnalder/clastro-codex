export interface EditorState {
  collectionId: string;
  itemId: string;
  dirty: boolean;
  statusLabel: 'Saved draft' | 'Draft changes' | 'Published';
  fields: Record<string, string>;
  extraFields: Record<string, Record<string, string>>;
}

export type EditorAction =
  | { type: 'fieldChanged'; fieldId: string; value: string }
  | { type: 'extraFieldChanged'; sectionId: string; fieldId: string; value: string }
  | { type: 'saved' }
  | { type: 'published' };

export function createInitialEditorState(collectionId: string, itemId: string): EditorState {
  return {
    collectionId,
    itemId,
    dirty: false,
    statusLabel: 'Saved draft',
    fields: {},
    extraFields: {},
  };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === 'fieldChanged') {
    return {
      ...state,
      dirty: true,
      statusLabel: 'Draft changes',
      fields: {
        ...state.fields,
        [action.fieldId]: action.value,
      },
    };
  }

  if (action.type === 'extraFieldChanged') {
    return {
      ...state,
      dirty: true,
      statusLabel: 'Draft changes',
      extraFields: {
        ...state.extraFields,
        [action.sectionId]: {
          ...state.extraFields[action.sectionId],
          [action.fieldId]: action.value,
        },
      },
    };
  }

  if (action.type === 'published') {
    return {
      ...state,
      dirty: false,
      statusLabel: 'Published',
    };
  }

  return {
    ...state,
    dirty: false,
    statusLabel: 'Saved draft',
  };
}
