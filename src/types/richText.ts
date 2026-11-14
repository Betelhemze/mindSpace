export type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet-list'
  | 'numbered-list';

export interface RichTextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string; // hex color code
  fontSize?: 'small' | 'normal' | 'large' | 'title';
  fontFamily?: 'system' | 'serif' | 'monospace';
}

export interface RichTextBlock {
  id: string;
  type: BlockType;
  spans: RichTextSpan[];
}

export interface RichTextDocument {
  version: 1;
  blocks: RichTextBlock[];
}

export interface ActiveFormatting {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  blockType: BlockType;
  color?: string;
  fontSize?: 'small' | 'normal' | 'large' | 'title';
  fontFamily?: 'system' | 'serif' | 'monospace';
}

