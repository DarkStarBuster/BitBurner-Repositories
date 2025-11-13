import { PORT_IDS } from "/src/scripts/util/port_management.js"

let control_parameters = {}

function init() {
  control_parameters = {
    home: {
      free_amt: 8
    },
    hacker: {
      consider_early: 64, // Amount of RAM on home that we considers being below as being "early" in a run
      hack_batch_time_interval: 125, // Milliseconds between hack batches
      total_hack_batch_limit: 14000 / 4, // <Total number of scripts we want running at any one time> / <4 as each hack batch runs 4 scripts>
      min_hack_threads_for_batch: 1 // Minimum number of Hack Threads to use when initially constructing a hack batch
    },
    pserv: { // Parameters for the Personal Server Manager
      max_ram_exponent_to_purchase: 20,
      min_amt_to_purchase_new: 2e6,
      ram_exponent_of_new_servers: 1,
      mult_for_purchase_upg: 10 
    },
    hacknet: { // Parameters for the Hacknet Manager
      calc_only  : false,    // When true, we just report the most 'optimal' purchase instead of actually purchasing it
      threshold  : 5e-6,     // Equivilant to 200000 seconds to payitself back
      cost_mod   : 1,        // We want to have cost_mod * cost available before we purchase the upgrade
      hash_target: "n00dles",// Hash Upgrades are going into this server.
      hash_time  : Infinity  // Time to produce all the hashes we need to buy all Hash Upgrades this server wants.
    }
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {string} target 
 */
function update_hash_target(ns, target, time) {
  control_parameters.hacknet.hash_target = target
  control_parameters.hacknet.hash_time   = time
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const CONTROL_PARAM_HANDLER = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(PORT_IDS.BITNODE_MULTS_HANDLER)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)
  const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)

  while(!CONTROL_PARAM_HANDLER.empty()) {
    CONTROL_PARAM_HANDLER.clear()
  }

  init()

  CONTROL_PARAM_HANDLER.write(JSON.stringify(control_parameters))

  while(true) {
    ns.print("Awaiting Update we can act on.")
    let awaiting_update = true
    let update = {}
    while (awaiting_update) {
      while(UPDATE_HANDLER.empty()) {
        await ns.sleep(50)
      }
      update = JSON.parse(UPDATE_HANDLER.peek())
      if (
          update.action === "update_hash_target"
      ) {
        ns.print("Update for us to act on has arrive:\n" + UPDATE_HANDLER.peek())
        awaiting_update = false 
        UPDATE_HANDLER.read()
      }
      else {
        await ns.sleep(50)
      }
    }

    switch (update.action) {
      case "update_hash_target":
        update_hash_target(ns, update.target, update.time)
        break
    }

    while(!CONTROL_PARAM_HANDLER.empty()) {
      CONTROL_PARAM_HANDLER.clear()
    }
    CONTROL_PARAM_HANDLER.write(JSON.stringify(control_parameters))
    await ns.sleep(50)
  }
}