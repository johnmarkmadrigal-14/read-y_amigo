import source from './bundle.generated';

// Documents arrive as base64 through the bridge, never as executable HTML.
// Block all network access from document content and disable eval via CSP.
export const DOCUMENT_HTML = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data: blob:; connect-src 'none'; worker-src 'none'" />
<style>body{margin:0;background:#fff;color:#222;font-family:sans-serif;font-size:18px;line-height:1.6}#content{padding:12px;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #ccc;padding:6px}canvas{display:block;width:100%;height:auto;margin-bottom:8px}</style>
</head><body><div id="content"></div><script>${source.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
