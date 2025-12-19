const CHUNK_PUBLIC_PATH = "server/pages/product/[id].js";
const runtime = require("../../chunks/ssr/[turbopack]_runtime.js");
runtime.loadChunk("server/chunks/ssr/_cea39c._.js");
runtime.loadChunk("server/chunks/ssr/node_modules_next_f12d89._.js");
runtime.loadChunk("server/chunks/ssr/styles_globals_ff5908.css");
module.exports = runtime.getOrInstantiateRuntimeModule("[project]/node_modules/next/dist/esm/build/templates/pages.js { INNER_PAGE => \"[project]/pages/product/[id].jsx [ssr] (ecmascript)\", INNER_DOCUMENT => \"[project]/pages/_document.jsx [ssr] (ecmascript)\", INNER_APP => \"[project]/pages/_app.jsx [ssr] (ecmascript)\" } [ssr] (ecmascript)", CHUNK_PUBLIC_PATH).exports;
