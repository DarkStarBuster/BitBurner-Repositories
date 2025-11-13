/** @param {import("@ns").NS} ns */
export async function main(ns) {
  let type = await ns.prompt(
    "What type of Contract should we generate?"
   ,{type:"select",choices:ns.codingcontract.getContractTypes()}
  )
  ns.codingcontract.createDummyContract(type)
}