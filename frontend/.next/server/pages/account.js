const CHUNK_PUBLIC_PATH = "server/pages/account.js";
const runtime = require("../chunks/ssr/[turbopack]_runtime.js");
runtime.loadChunk("server/chunks/ssr/_b49a90._.js");
runtime.loadChunk("server/chunks/ssr/node_modules_next_544e1f._.js");
runtime.loadChunk("server/chunks/ssr/styles_globals_ff5908.css");
module.exports = runtime.getOrInstantiateRuntimeModule("[project]/node_modules/next/dist/esm/build/templates/pages.js { INNER_PAGE => \"[project]/pages/account.jsx [ssr] (ecmascript)\", INNER_DOCUMENT => \"[project]/pages/_document.jsx [ssr] (ecmascript)\", INNER_APP => \"[project]/pages/_app.jsx [ssr] (ecmascript)\" } [ssr] (ecmascript)", CHUNK_PUBLIC_PATH).exports;
