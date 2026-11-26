import { referenceRules } from '@bhope/shared';
import { editorRuntimeSource, referenceFactorySource } from './editor-runtime.generated';
export function createEditorDocument(config: { html?: string; text: string; placeholder: string }) {
  const data = JSON.stringify(config).replace(/</g, '\\u003c');
  const rules = JSON.stringify(referenceRules).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>
  *{box-sizing:border-box}html,body{margin:0;background:#F7F7F0;color:#193B32;font-family:system-ui,-apple-system,sans-serif;font-size:17px;line-height:1.8}body{padding:4px 0 40px}#editor{outline:none;min-height:320px;overflow-wrap:anywhere;-webkit-user-select:text;user-select:text}#editor[data-empty="true"]:before{content:attr(data-placeholder);color:#8b938a;pointer-events:none}p,div{margin:0 0 14px}h1,h2,h3{font-family:Georgia,serif;line-height:1.4;font-weight:400;color:#193B32;margin:20px 0 12px}h1{font-size:30px}h2{font-size:26px}h3{font-size:22px}ul,ol{padding-left:25px;margin:12px 0}li{padding-left:4px;margin:5px 0}input[type=checkbox]{width:18px;height:18px;vertical-align:middle;accent-color:#315f49;margin-right:9px}blockquote{border-left:3px solid #cfad63;margin:16px 0;padding-left:16px;color:#607760}.scripture{color:#2B69B2;text-decoration:underline;text-decoration-color:#7CA8D1;text-underline-offset:4px;border-radius:3px;cursor:pointer}::selection{background:#dbe7cf}
  </style></head><body><div id="editor" contenteditable="true" role="textbox" aria-label="Note body" aria-multiline="true" spellcheck="true"></div><script>(${editorRuntimeSource})(${data},(${referenceFactorySource})(${rules}));</script></body></html>`;
}
