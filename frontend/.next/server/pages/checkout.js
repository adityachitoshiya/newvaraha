const CHUNK_PUBLIC_PATH = "server/pages/checkout.js";
const runtime = require("../chunks/ssr/[turbopack]_runtime.js");
runtime.loadChunk("server/chunks/ssr/_ae348b._.js");
runtime.loadChunk("server/chunks/ssr/node_modules_next_22c3c4._.js");
runtime.loadChunk("server/chunks/ssr/styles_globals_ff5908.css");
module.exports = runtime.getOrInstantiateRuntimeModule("[project]/node_modules/next/dist/esm/build/templates/pages.js { INNER_PAGE => \"[project]/pages/checkout.jsx [ssr] (ecmascript)\", INNER_DOCUMENT => \"[project]/pages/_document.jsx [ssr] (ecmascript)\", INNER_APP => \"[project]/pages/_app.jsx [ssr] (ecmascript)\" } [ssr] (ecmascript)", CHUNK_PUBLIC_PATH).exports;
