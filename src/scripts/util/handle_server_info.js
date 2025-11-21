import { PORT_IDS } from "/src/scripts/util/dynamic/manage_ports"
import { ScanFilter, request_scan } from "/src/scripts/util/dynamic/manage_server_scanning"

/**
 * ALL_SERVER_STATS is an object that will hold static or binary information about all servers.
 * 
 * It will be exposed on Port 3 as a result of JSON.stringify(ALL_SERVER_STATS)
 * 
 * ALL_SERVER_STATS = {
 *  "n00dles" = {
 *    "max_money"     : ns.getServerMaxMoney(server),
 *    "max_ram"       : ns.getServerMaxRam(server),
 *    "min_diff"      : ns.getServerMinSecurityLevel(server),
 *    "num_ports_req" : ns.getServerNumPortsRequired(server),
 *    "hack_lvl_req"  : ns.getServerRequiredHackingLevel(server),
 *    "is_rooted"     : true | false
 *  }
 * }
 * 
 */
const ALL_SERVER_STATS = {}

/**
 * Initialize the Server Info Handler.
 * 
 * @param {import("@ns").NS} ns - Netscript Environment
 */
function init(ns) {
  ns.disableLog("ALL")

  let keys = Object.keys(ALL_SERVER_STATS)
  for (let key of keys) {
    delete ALL_SERVER_STATS[key]
  }
}

/**
 * Update a single servers static statistics in ALL_SERVER_STATS
 * 
 * @param {import("@ns").NS} ns - Netscript Environment
 * @param {string} server - Server name we want to update the stats of
 * @param {import("@ns").NetscriptPort} handler - Optional, handler that will handle the port writing, needs to be provided unless defer_write is true
 * @param {boolean} defer_write - Optional, pass true if the calling function will use the handler itself to write to the port
 */
function update_server_stats(ns, server, handler = undefined, defer_write = false) {
  ALL_SERVER_STATS[server] = {
    "max_money"     : ns.getServerMaxMoney(server),
    "max_ram"       : ns.getServerMaxRam(server),
    "min_diff"      : ns.getServerMinSecurityLevel(server),
    "num_ports_req" : ns.getServerNumPortsRequired(server),
    "hack_lvl_req"  : ns.getServerRequiredHackingLevel(server),
    "growth"        : ns.getServerGrowth(server),
    "is_rooted"     : ns.hasRootAccess(server)
  }
  if (
      !defer_write
  &&  !(handler === undefined)
  ) {
    handler.clear()
    handler.write(JSON.stringify(ALL_SERVER_STATS))
  }
}
  
/**
 * Update all servers static statistics in ALL_SERVER_STATS
 * 
 * @param {import("@ns").NS} ns - Netscript Environment
 * @param {import("@ns").NetscriptPort} handler - Handler that will handle the port writing
 */
function populate_all_server_stats(ns, handler) {
  let filter = new ScanFilter()
  let all_servers = request_scan(ns, filter)

  for (let server of all_servers) {
    update_server_stats(ns, server, undefined, true)
  }

  handler.clear()
  handler.write(JSON.stringify(ALL_SERVER_STATS))
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const SERVER_INFO_HANDLER   = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)
  const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)

  while(!SERVER_INFO_HANDLER.empty()) {
    SERVER_INFO_HANDLER.clear()
  }

  init(ns)

  populate_all_server_stats(ns, SERVER_INFO_HANDLER)

  while(true) {
    ns.print("Awaiting Update we can act on.")
    let awaiting_update = true
    let update = {}
    while (awaiting_update) {
      while(UPDATE_HANDLER.empty()) {
        await UPDATE_HANDLER.nextWrite()
      }
      update = JSON.parse(UPDATE_HANDLER.peek())
      if (update.action === "update_info") {
        ns.print("Update for us to act on has arrive:\n" + UPDATE_HANDLER.peek())
        awaiting_update = false 
        UPDATE_HANDLER.read()
      }
      else {
        await ns.sleep(4)
      }
    }

    //ns.tprint("Handle Info: " + JSON.stringify(update))
    switch (update.action) {
      case "update_info":
        update_server_stats(ns, update.target, SERVER_INFO_HANDLER)
        break
    }
  }
}