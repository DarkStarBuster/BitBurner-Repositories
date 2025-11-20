/** Designed to be used by manage_free_ram.js */

/** @param {import("@ns").NS} ns */
export async function main(ns) {

  while(true) {
    await ns.share()
  }
}