const CHUNK_PUBLIC_PATH = "server/pages/new-arrivals.js";
const runtime = require("../chunks/ssr/[turbopack]_runtime.js");
runtime.loadChunk("server/chunks/ssr/_f4abe0._.js");
runtime.loadChunk("server/chunks/ssr/node_modules_next_5536ac._.js");
runtime.loadChunk("server/chunks/ssr/styles_globals_ff5908.css");
module.exports = runtime.getOrInstantiateRuntimeModule("[project]/node_modules/next/dist/esm/build/templates/pages.js { INNER_PAGE => \"[project]/pages/new-arrivals.jsx [ssr] (ecmascript)\", INNER_DOCUMENT => \"[project]/pages/_document.jsx [ssr] (ecmascript)\", INNER_APP => \"[project]/pages/_app.jsx [ssr] (ecmascript)\" } [ssr] (ecmascript)", CHUNK_PUBLIC_PATH).exports;
