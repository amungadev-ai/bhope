import type { Reference } from '@bhope/shared';
export type EditorCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'heading'
  | 'paragraph'
  | 'ordered'
  | 'unordered'
  | 'checkbox'
  | 'undo'
  | 'redo';
export interface RichEditorHandle {
  command: (command: EditorCommand) => void;
  appendText: (text: string) => void;
}
export interface RichEditorProps {
  initialHtml?: string;
  initialText: string;
  placeholder: string;
  onChange: (html: string, text: string) => void;
  onSelection: (text: string) => void;
  onReference: (reference: Reference, intent: 'preview' | 'actions') => void;
}
