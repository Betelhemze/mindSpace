import {
  createEmptyDocument,
  documentToPlainText,
  plainTextToDocument,
  documentToMarkdown,
  serializeDocument,
  deserializeDocument,
  parseInlineMarkdown,
} from '@/utils/richText';
import { RichTextDocument } from '@/types/richText';

describe('Rich Text Document Engine', () => {
  it('creates an empty document with a valid paragraph block', () => {
    const doc = createEmptyDocument();
    expect(doc.version).toBe(1);
    expect(doc.blocks.length).toBe(1);
    expect(doc.blocks[0].type).toBe('paragraph');
  });

  it('extracts clean plain text from structured blocks', () => {
    const doc: RichTextDocument = {
      version: 1,
      blocks: [
        {
          id: '1',
          type: 'h1',
          spans: [{ text: 'Journal Entry' }],
        },
        {
          id: '2',
          type: 'paragraph',
          spans: [{ text: 'Reflecting on today with ' }, { text: 'gratitude', bold: true }],
        },
        {
          id: '3',
          type: 'bullet-list',
          spans: [{ text: 'Fresh morning breeze' }],
        },
        {
          id: '4',
          type: 'numbered-list',
          spans: [{ text: 'First task completed' }],
        },
      ],
    };

    const plain = documentToPlainText(doc);
    expect(plain).toContain('Journal Entry');
    expect(plain).toContain('Reflecting on today with gratitude');
    expect(plain).toContain('• Fresh morning breeze');
    expect(plain).toContain('1. First task completed');
  });

  it('parses headings and lists from plain text lines', () => {
    const raw = '# Top Heading\n## Sub Heading\n- First item\n1. Numbered item\nA normal thought.';
    const doc = plainTextToDocument(raw);

    expect(doc.blocks[0].type).toBe('h1');
    expect(doc.blocks[0].spans[0].text).toBe('Top Heading');

    expect(doc.blocks[1].type).toBe('h2');
    expect(doc.blocks[1].spans[0].text).toBe('Sub Heading');

    expect(doc.blocks[2].type).toBe('bullet-list');
    expect(doc.blocks[2].spans[0].text).toBe('First item');

    expect(doc.blocks[3].type).toBe('numbered-list');
    expect(doc.blocks[3].spans[0].text).toBe('Numbered item');

    expect(doc.blocks[4].type).toBe('paragraph');
    expect(doc.blocks[4].spans[0].text).toBe('A normal thought.');
  });

  it('parses inline markdown tokens into rich text spans', () => {
    const text = 'Hello **bold** and *italic* plus <u>underlined</u> and ~~strike~~ text!';
    const spans = parseInlineMarkdown(text);

    const boldSpan = spans.find((s) => s.bold);
    expect(boldSpan?.text).toBe('bold');

    const italicSpan = spans.find((s) => s.italic);
    expect(italicSpan?.text).toBe('italic');

    const underlineSpan = spans.find((s) => s.underline);
    expect(underlineSpan?.text).toBe('underlined');

    const strikeSpan = spans.find((s) => s.strikethrough);
    expect(strikeSpan?.text).toBe('strike');
  });

  it('converts structured document to clean Markdown for export', () => {
    const doc: RichTextDocument = {
      version: 1,
      blocks: [
        {
          id: 'b1',
          type: 'h1',
          spans: [{ text: 'Mindful Morning' }],
        },
        {
          id: 'b2',
          type: 'paragraph',
          spans: [{ text: 'Staying ' }, { text: 'calm', bold: true }, { text: ' today.' }],
        },
        {
          id: 'b3',
          type: 'bullet-list',
          spans: [{ text: 'Drink warm tea' }],
        },
      ],
    };

    const md = documentToMarkdown(doc);
    expect(md).toContain('# Mindful Morning');
    expect(md).toContain('Staying **calm** today.');
    expect(md).toContain('- Drink warm tea');
  });

  it('serializes and deserializes documents with backward compatibility for raw strings', () => {
    const doc = createEmptyDocument();
    doc.blocks[0].spans = [{ text: 'Testing persistence', bold: true }];

    const json = serializeDocument(doc);
    const restored = deserializeDocument(json);

    expect(restored.blocks[0].spans[0].text).toBe('Testing persistence');
    expect(restored.blocks[0].spans[0].bold).toBe(true);

    // Old v1 plain-text fallback:
    const legacyText = 'This is an old plain-text journal entry from version 1.';
    const backwardDoc = deserializeDocument(legacyText);
    expect(backwardDoc.blocks.length).toBeGreaterThan(0);
    expect(documentToPlainText(backwardDoc)).toContain(legacyText);
  });
});

