/**
 * Strip ANSI escape codes from text.
 * Logs are rendered as plain text; color is applied via log level styling.
 */
export default function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}
