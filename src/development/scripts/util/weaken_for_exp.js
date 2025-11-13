/** Designed to be used by manage_free_ram.js */

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const arg_flags = ns.flags([
    ["target",""],
    ["threads",0]
  ])

  while(true) {
    await ns.weaken(arg_flags.target,{threads:arg_flags.threads})
  }
}