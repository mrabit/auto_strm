/**
 * ANSI escape code to HTML converter.
 * Supports basic SGR (Select Graphic Rendition) codes:
 * - Colors: 30-37 (foreground), 40-47 (background), 90-97 (bright fg), 100-107 (bright bg)
 * - Styles: 0 (reset), 1 (bold), 2 (dim), 3 (italic), 4 (underline)
 * - 256-color and RGB are not supported (stripped)
 */

const ANSI_COLORS: Record<number, string> = {
  30: '#1a1a2e',
  31: '#ff4d4f',
  32: '#52c41a',
  33: '#faad14',
  34: '#1890ff',
  35: '#eb2f96',
  36: '#13c2c2',
  37: '#e0e0e0',
  90: '#666666',
  91: '#ff7875',
  92: '#95de64',
  93: '#ffd666',
  94: '#69b1ff',
  95: '#f759ab',
  96: '#5cdbd3',
  97: '#ffffff',
};

const ANSI_BG_COLORS: Record<number, string> = {
  40: '#1a1a2e',
  41: '#ff4d4f',
  42: '#52c41a',
  43: '#faad14',
  44: '#1890ff',
  45: '#eb2f96',
  46: '#13c2c2',
  47: '#e0e0e0',
  100: '#666666',
  101: '#ff7875',
  102: '#95de64',
  103: '#ffd666',
  104: '#69b1ff',
  105: '#f759ab',
  106: '#5cdbd3',
  107: '#ffffff',
};

interface AnsiState {
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  color: string | null;
  bgColor: string | null;
}

function buildStyle(state: AnsiState): string {
  const styles: string[] = [];
  if (state.bold) styles.push('font-weight:bold');
  if (state.dim) styles.push('opacity:0.7');
  if (state.italic) styles.push('font-style:italic');
  if (state.underline) styles.push('text-decoration:underline');
  if (state.color) styles.push(`color:${state.color}`);
  if (state.bgColor) styles.push(`background-color:${state.bgColor}`);
  return styles.join(';');
}

export function ansiToHtml(text: string): string {
  // Match ANSI escape sequences: ESC[ ... m
  const regex = /\x1b\[([0-9;]*)m/g;

  let result = '';
  let lastIndex = 0;
  const state: AnsiState = {
    bold: false,
    dim: false,
    italic: false,
    underline: false,
    color: null,
    bgColor: null,
  };
  let hasOpenSpan = false;

  function closeSpan() {
    if (hasOpenSpan) {
      result += '</span>';
      hasOpenSpan = false;
    }
  }

  function openSpan() {
    const style = buildStyle(state);
    if (style) {
      result += `<span style="${style}">`;
      hasOpenSpan = true;
    }
  }

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    // Add text before this escape sequence
    if (match.index > lastIndex) {
      result += text.slice(lastIndex, match.index);
    }

    // Parse SGR parameters
    const params = match[1].split(';').map(Number);
    for (const param of params) {
      if (param === 0) {
        // Reset
        closeSpan();
        state.bold = false;
        state.dim = false;
        state.italic = false;
        state.underline = false;
        state.color = null;
        state.bgColor = null;
      } else if (param === 1) {
        closeSpan();
        state.bold = true;
        openSpan();
      } else if (param === 2) {
        closeSpan();
        state.dim = true;
        openSpan();
      } else if (param === 3) {
        closeSpan();
        state.italic = true;
        openSpan();
      } else if (param === 4) {
        closeSpan();
        state.underline = true;
        openSpan();
      } else if (param === 22) {
        closeSpan();
        state.bold = false;
        state.dim = false;
        openSpan();
      } else if (param === 23) {
        closeSpan();
        state.italic = false;
        openSpan();
      } else if (param === 24) {
        closeSpan();
        state.underline = false;
        openSpan();
      } else if (param >= 30 && param <= 37) {
        closeSpan();
        state.color = ANSI_COLORS[param];
        openSpan();
      } else if (param >= 40 && param <= 47) {
        closeSpan();
        state.bgColor = ANSI_BG_COLORS[param];
        openSpan();
      } else if (param >= 90 && param <= 97) {
        closeSpan();
        state.color = ANSI_COLORS[param];
        openSpan();
      } else if (param >= 100 && param <= 107) {
        closeSpan();
        state.bgColor = ANSI_BG_COLORS[param];
        openSpan();
      } else if (param === 39) {
        closeSpan();
        state.color = null;
        openSpan();
      } else if (param === 49) {
        closeSpan();
        state.bgColor = null;
        openSpan();
      }
      // 256-color and RGB are not supported, just skip
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result += text.slice(lastIndex);
  }

  // Close any open span
  closeSpan();

  return result;
}
