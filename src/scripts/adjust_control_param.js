import { PORT_IDS } from "/src/scripts/util/dynamic/manage_ports"

/**
 * 
 * @param {import("@ns").NS} ns 
 * @param {string} domain 
 * @param {string} property 
 * @param {number | string | boolean} value 
 */
async function send_update(ns, domain, property, value, update_handler) {
    if (
        domain === undefined
    ||  property === undefined
    ||  value === undefined
    ) {
      ns.tprint(`Malformed CONTROL_PARAM update properties: {domain: ${domain}, property: ${property}, value: ${value}}`)
      ns.exit()
    }

    while (
      !update_handler.tryWrite(
        JSON.stringify({
          action : "update_control_param"
         ,payload: {
            domain  : domain
           ,property: property
           ,value   : value
          }
        })
      )
    ) {
      await ns.sleep(4)
    }
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)

  const arg_flags = ns.flags([
    ["hacknet"  ,]
   ,["gang"     ,]
   ,["ui"       ,]
   ,["calc_only",]
  ])  

  if (arg_flags.gang) {
    if (arg_flags.ui) {send_update(ns, "gang", "open_ui", arg_flags.ui, UPDATE_HANDLER)}
    if (arg_flags.calc_only) {send_update(ns, "gang", "calc_only", arg_flags.calc_only, UPDATE_HANDLER)}
  }

  if (arg_flags.hacknet) {
    if (arg_flags.ui) {send_update(ns, "hacknet", "open_ui", arg_flags.ui, UPDATE_HANDLER)}
    if (arg_flags.calc_only) {send_update(ns, "hacknet", "calc_only", arg_flags.calc_only, UPDATE_HANDLER)}
  }
}