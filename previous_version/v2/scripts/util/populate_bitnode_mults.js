/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(2)

  while(!BITNODE_MULTS_HANDLER.empty()) {
    BITNODE_MULTS_HANDLER.clear()
  }

  BITNODE_MULTS_HANDLER.write(
    JSON.stringify(ns.getBitNodeMultipliers())
  )
}