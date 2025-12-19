const CHUNK_PUBLIC_PATH = "server/pages/admin/orders.js";
const runtime = require("../../chunks/ssr/[turbopack]_runtime.js");
runtime.loadChunk("server/chunks/ssr/_fc85a4._.js");
runtime.loadChunk("server/chunks/ssr/node_modules_next_be2d44._.js");
runtime.loadChunk("server/chunks/ssr/styles_globals_ff5908.css");
module.exports = runtime.getOrInstantiateRuntimeModule("[project]/node_modules/next/dist/esm/build/templates/pages.js { INNER_PAGE => \"[project]/pages/admin/orders/index.jsx [ssr] (ecmascript)\", INNER_DOCUMENT => \"[project]/pages/_document.jsx [ssr] (ecmascript)\", INNER_APP => \"[project]/pages/_app.jsx [ssr] (ecmascript)\" } [ssr] (ecmascript)", CHUNK_PUBLIC_PATH).exports;
