import type { Palette } from './themes';
import { referenceRules } from '@bhope/shared';
import { editorRuntimeSource, referenceFactorySource } from './editor-runtime.generated';
export function createEditorDocument(config: {
  html?: string;
  text: string;
  placeholder: string;
  colors: Palette;
}) {
  const data = JSON.stringify(config).replace(/</g, '\\u003c');
  const rules = JSON.stringify(referenceRules).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>
  :root{--background:${config.colors.background};--ink:${config.colors.ink};--muted:${config.colors.muted};--green:${config.colors.green};--gold:${config.colors.gold};--scripture:${config.colors.scripture};--soft:${config.colors.soft}}
  *{box-sizing:border-box}html,body{margin:0;background:var(--background);color:var(--ink);font-family:system-ui,-apple-system,sans-serif;font-size:17px;line-height:1.8}body{padding:4px 0 84px}#editor{outline:none;min-height:320px;overflow-wrap:anywhere;-webkit-user-select:text;user-select:text}#editor[data-empty="true"]:before{content:attr(data-placeholder);color:var(--muted);pointer-events:none}p,div{margin:0 0 14px}h1,h2,h3{font-family:Georgia,serif;line-height:1.4;font-weight:400;color:var(--ink);margin:20px 0 12px}h1{font-size:30px}h2{font-size:26px}h3{font-size:22px}ul,ol{padding-left:25px;margin:12px 0}li{padding-left:4px;margin:5px 0}input[type=checkbox]{width:18px;height:18px;vertical-align:middle;accent-color:var(--green);margin-right:9px}blockquote{border-left:3px solid var(--gold);margin:16px 0;padding-left:16px;color:var(--muted)}.scripture{color:var(--scripture);text-decoration:underline;text-decoration-color:var(--scripture);text-underline-offset:4px;border-radius:3px;cursor:text}::selection{background:var(--soft)}
  </style></head><body><div id="editor" contenteditable="true" role="textbox" aria-label="Note body" aria-multiline="true" spellcheck="true"></div><script>(${editorRuntimeSource})(${data},(${referenceFactorySource})(${rules}));</script></body></html>`;
}
