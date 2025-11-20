/** @param {import("@ns").NS} ns */
export async function main(ns) {
    const arg_flags = ns.flags([
      ["target",""],
      ["addMsec",0],
      ["threads",0]
    ])
    await ns.grow(arg_flags.target,{additionalMsec:arg_flags.addMsec,threads:arg_flags.threads})
  }