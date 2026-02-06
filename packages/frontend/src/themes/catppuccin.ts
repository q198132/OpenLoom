import type { editor } from 'monaco-editor';

export const catppuccinMocha: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'cba6f7' },
    { token: 'string', foreground: 'a6e3a1' },
    { token: 'number', foreground: 'fab387' },
    { token: 'type', foreground: 'f9e2af' },
    { token: 'function', foreground: '89b4fa' },
    { token: 'variable', foreground: 'cdd6f4' },
    { token: 'operator', foreground: '94e2d5' },
    { token: 'delimiter', foreground: '9399b2' },
    { token: 'tag', foreground: 'cba6f7' },
    { token: 'attribute.name', foreground: 'f9e2af' },
    { token: 'attribute.value', foreground: 'a6e3a1' },
  ],
  colors: {
    'editor.background': '#1e1e2e',
    'editor.foreground': '#cdd6f4',
    'editor.lineHighlightBackground': '#313244',
    'editor.selectionBackground': '#585b70',
    'editorCursor.foreground': '#f5e0dc',
    'editorLineNumber.foreground': '#6c7086',
    'editorLineNumber.activeForeground': '#cba6f7',
    'editorIndentGuide.background': '#313244',
    'editorIndentGuide.activeBackground': '#45475a',
    'editor.selectionHighlightBackground': '#45475a80',
  },
};

export const catppuccinLatte: editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '9ca0b0', fontStyle: 'italic' },
    { token: 'keyword', foreground: '8839ef' },
    { token: 'string', foreground: '40a02b' },
    { token: 'number', foreground: 'fe640b' },
    { token: 'type', foreground: 'df8e1d' },
    { token: 'function', foreground: '1e66f5' },
    { token: 'variable', foreground: '4c4f69' },
    { token: 'operator', foreground: '179299' },
    { token: 'delimiter', foreground: '7c7f93' },
  ],
  colors: {
    'editor.background': '#eff1f5',
    'editor.foreground': '#4c4f69',
    'editor.lineHighlightBackground': '#e6e9ef',
    'editor.selectionBackground': '#acb0be',
    'editorCursor.foreground': '#dc8a78',
    'editorLineNumber.foreground': '#9ca0b0',
    'editorLineNumber.activeForeground': '#8839ef',
  },
};
