export default function ansiToHtml(text: string): string {
  let result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const map: [string, string][] = [
    ['\x1b[1m', '<span style="font-weight:bold">'],
    ['\x1b[2m', '<span style="opacity:0.5">'],
    ['\x1b[31m', '<span style="color:#ff4d4f">'],
    ['\x1b[32m', '<span style="color:#52c41a">'],
    ['\x1b[33m', '<span style="color:#faad14">'],
    ['\x1b[36m', '<span style="color:#36cfc9">'],
    ['\x1b[0m', '</span>'],
  ];

  for (const [code, html] of map) {
    result = result.split(code).join(html);
  }

  return result;
}
