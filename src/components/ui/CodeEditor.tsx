/**
 * CodeEditor.tsx
 * Wraps @uiw/react-codemirror with sensible defaults for DevHub.
 * Supports read-only viewing (response viewer) and editable input.
 */

import React, { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { sql } from '@codemirror/lang-sql';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

export type EditorLanguage =
  | 'json'
  | 'javascript'
  | 'typescript'
  | 'sql'
  | 'html'
  | 'css'
  | 'python'
  | 'text';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: EditorLanguage;
  readOnly?: boolean;
  height?: string;
  minHeight?: string;
  placeholder?: string;
  className?: string;
}

/** Map language name → CodeMirror extension. */
function getExtensions(lang: EditorLanguage): Extension[] {
  switch (lang) {
    case 'json':
      return [json()];
    case 'javascript':
    case 'typescript':
      return [javascript({ typescript: lang === 'typescript', jsx: true })];
    case 'sql':
      return [sql()];
    case 'html':
      return [html()];
    case 'css':
      return [css()];
    case 'python':
      return [python()];
    default:
      return [];
  }
}

/** Detect language from a MIME type or content string for response rendering. */
export function detectLanguage(contentType: string): EditorLanguage {
  if (contentType.includes('json')) return 'json';
  if (contentType.includes('html')) return 'html';
  if (contentType.includes('css')) return 'css';
  if (contentType.includes('javascript') || contentType.includes('ecmascript'))
    return 'javascript';
  if (contentType.includes('xml')) return 'html'; // close enough
  return 'text';
}

export function CodeEditor({
  value,
  onChange,
  language = 'text',
  readOnly = false,
  height = '100%',
  minHeight,
  placeholder,
  className = '',
}: CodeEditorProps) {
  const handleChange = useCallback(
    (val: string) => {
      onChange?.(val);
    },
    [onChange],
  );

  const extensions: Extension[] = [
    ...getExtensions(language),
    EditorView.lineWrapping,
    // Override default white background in one-dark when inside panels
    EditorView.theme({
      '&': {
        backgroundColor: 'transparent !important',
      },
      '&.cm-editor': {
        height: '100%',
        minHeight: '0',
      },
      '.cm-scroller': {
        height: '100%',
        overflowY: 'auto !important',
        overflowX: 'auto !important',
      },
      '.cm-content, .cm-gutter': {
        minHeight: '100%',
      },
      '.cm-gutters': {
        backgroundColor: 'transparent !important',
        borderRight: '1px solid #30363d',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'rgba(88,166,255,0.06) !important',
      },
      '.cm-selectionBackground': {
        backgroundColor: 'rgba(88,166,255,0.2) !important',
      },
    }),
  ];

  return (
    <div
      className={[
        'flex h-full min-h-0 overflow-hidden rounded-md border border-gh-border',
        'bg-gh-canvas font-mono text-sm',
        className,
      ].join(' ')}
      style={{ height, minHeight }}
    >
      <CodeMirror
        className="h-full min-h-0 w-full"
        value={value}
        height={height}
        minHeight={minHeight}
        theme={oneDark}
        extensions={extensions}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={handleChange}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: !readOnly,
          autocompletion: !readOnly,
          highlightActiveLine: !readOnly,
          searchKeymap: true,
        }}
      />
    </div>
  );
}
