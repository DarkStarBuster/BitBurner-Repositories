import { PORT_IDS } from "/src/scripts/util/dynamic/manage_ports"

/**
 * 
 * @param {import("@ns").NS} ns 
 * @param {string} domain 
 * @param {string} property 
 * @param {number | string | boolean} value
 * @param {import("@ns").NetscriptPort} update_handler
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
    ["hacknet_mgr",undefined]
   ,["gang_mgr"   ,undefined]
   ,["open_ui"    ,undefined]
   ,["calc_only"  ,undefined]
  ]) 

  if (arg_flags.gang_mgr) {
    if (arg_flags.open_ui) {await send_update(ns, "gang_mgr", "open_ui", arg_flags.open_ui, UPDATE_HANDLER)}
    if (arg_flags.calc_only) {await send_update(ns, "gang_mgr", "calc_only", arg_flags.calc_only, UPDATE_HANDLER)}
  }

  if (arg_flags.hacknet_mgr) {
    if (arg_flags.open_ui) {send_update(ns, "hacknet_mgr", "open_ui", arg_flags.open_ui, UPDATE_HANDLER)}
    if (arg_flags.calc_only) {send_update(ns, "hacknet_mgr", "calc_only", arg_flags.calc_only, UPDATE_HANDLER)}
  }
}