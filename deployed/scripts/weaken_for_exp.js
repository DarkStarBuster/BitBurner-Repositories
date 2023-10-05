/** Designed to be used by manage_free_ram.js */

/** @param {NS} ns */
export async function main(ns) {
  const arg_flags = ns.flags([
    ["target",""],
    ["threads",0]
  ])

  if (arg_flags.target == "") {
    ns.toast("Called weaken_for_exp.js without target", "error")
    do_weaken = false
  }
  if (arg_flags.threads <= 0) {
    ns.toast("Called weaken_for_exp.js with zero or negative threads", "error")
    do_weaken = false
  }

  while(true) {
    await ns.weaken(arg_flags.target,{threads:arg_flags.threads})
  }
}