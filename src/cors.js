/* =============================================================================
   cors.js: CORS header generation for dev and production environments.
   ============================================================================= */

const PRODUCTION_ORIGIN = "https://torchtimer.lodesandlanterns.com";

/**
 * Returns CORS headers for a response.
 * In dev mode, allows any origin so local client dev works without friction.
 *
 * @param {boolean} isDev
 * @returns {Record<string, string>}
 */
export function corsHeaders(isDev) {
  return {
    "Access-Control-Allow-Origin": isDev ? "*" : PRODUCTION_ORIGIN,
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
