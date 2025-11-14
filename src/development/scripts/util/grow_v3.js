/** Designed to work with scripts/manage_server_<hack/prep>_v3 */

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  await ns.grow(ns.args[0],{additionalMsec:ns.args[1]})
}