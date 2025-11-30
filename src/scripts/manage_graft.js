

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  ns.grafting.getAugmentationGraftPrice()
  ns.grafting.getAugmentationGraftTime()
  ns.grafting.getGraftableAugmentations()
  ns.grafting.graftAugmentation()
  ns.grafting.waitForOngoingGrafting()
}