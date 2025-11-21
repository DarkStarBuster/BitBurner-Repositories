import { PORT_IDS } from "/src/scripts/util/dynamic/manage_ports"

const CONTROL_PARAMETERS = {}

/**
 * @param {import("@ns").NS} ns
 */
function init(ns, server_info) {

  let name_length = 0
  for (let server in server_info) {
    if (server.length > name_length) name_length = server.length
  }

  CONTROL_PARAMETERS.servers = {
    max_name_length: name_length
  }
  CONTROL_PARAMETERS.home = {
    free_amt: 16
  }
  CONTROL_PARAMETERS.hacker = {
    consider_early: 64, // Amount of RAM on home that we considers being below as being "early" in a run
    hack_batch_time_interval: 125, // Milliseconds between hack batches
    total_hack_batch_limit: 50000 / 4, // <Total number of scripts we want running at any one time> / <4 as each hack batch runs 4 scripts>
    min_hack_threads_for_batch: 1 // Minimum number of Hack Threads to use when initially constructing a hack batch
  }
  CONTROL_PARAMETERS.pserv = { // Parameters for the Personal Server Manager
    max_ram_exponent_to_purchase: 20,
    min_amt_to_purchase_new: 2e6,
    ram_exponent_of_new_servers: 1,
    mult_for_purchase_upg: 10 
  }
  CONTROL_PARAMETERS.hacknet_mgr = { // Parameters for the Hacknet Manager
    calc_only  : false,    // When true, we just report the most 'optimal' purchase instead of actually purchasing it
    threshold  : 5e-6,     // Equivilant to 200000 seconds to payitself back
    cost_mod   : 1,        // We want to have cost_mod * cost available before we purchase the upgrade
    hash_target: "n00dles",// Hash Upgrades are going into this server.
    hash_time  : Infinity  // Time to produce all the hashes we need to buy all Hash Upgrades this server wants.
  }
  CONTROL_PARAMETERS.gang_mgr = { // Parameters for the Gang Manager
    calc_only     : false,    // When true, we just report the most 'optimal' choices instead of implementing them
    open_ui       : false,    // Forces the process tail window open
    gang_faction  : ns.enums.FactionName.SlumSnakes,    // Faction we want to make the gang with
    check_faction : ns.enums.FactionName.TheBlackHand,  // Gang we want to check for clash ticks
    purchase_perc : 1/20, // Require purchase amount for equipment to be 5% or less of our current amount of money
    ascension_mult: 10    // Require cumulative multiplier gained by ascension to be greater than this number
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {string} target 
 */
function update_hash_target(ns, target, time) {
  CONTROL_PARAMETERS.hacknet_mgr.hash_target = target
  CONTROL_PARAMETERS.hacknet_mgr.hash_time   = time
}

/**
 * 
 * @param {import("@ns").NS} ns 
 * @param {string} domain 
 * @param {string} property 
 * @param {number | string | boolean} value 
 */
function update_control_param(ns, domain, property, value) {
  if (
      domain === undefined
  ||  property === undefined
  ||  value === undefined
  ) {
    ns.tprint(`Malformed CONTROL_PARAM update properties {domain: ${domain}, property: ${property}, value: ${value}}`)
    return
  }

  if (
      CONTROL_PARAMETERS[domain]
  &&  !(CONTROL_PARAMETERS[domain][property] === undefined)
  ) {
    let coerrced_val
    if (!(typeof CONTROL_PARAMETERS[domain][property] === typeof value)) {
      if (typeof value === typeof "string") {
        if (value == "true") {
          coerrced_val = true
        }
        else if (value == "false") {
          coerrced_val = false
        }
      }
    }
    if (coerrced_val === undefined) {
      CONTROL_PARAMETERS[domain][property] = value
    }
    else {
      CONTROL_PARAMETERS[domain][property] = coerrced_val
    }
  }
  else {
    ns.tprint(`Validation failed for CONTROL_PARAM update properties {domain: ${domain}, property ${property}, value: ${value}}`)
  }
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const CONTROL_PARAM_HANDLER = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)
  const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)

  while(!CONTROL_PARAM_HANDLER.empty()) {
    CONTROL_PARAM_HANDLER.clear()
  }

  while (SERVER_INFO_HANDLER.empty()) {
    await ns.sleep(4)
  }

  let server_info    = JSON.parse(SERVER_INFO_HANDLER.peek())

  ns.disableLog("ALL")
  init(ns, server_info)

  CONTROL_PARAM_HANDLER.write(JSON.stringify(CONTROL_PARAMETERS))

  while(true) {
    if (!SERVER_INFO_HANDLER.empty()) {
      server_info = JSON.parse(SERVER_INFO_HANDLER.peek())
    }
    ns.print("Awaiting Update we can act on.")
    let awaiting_update = true
    let update = {}
    while (awaiting_update) {
      while(UPDATE_HANDLER.empty()) {
        await ns.sleep(4)
      }
      update = JSON.parse(UPDATE_HANDLER.peek())
      if (
            update.action === "update_hash_target"
        ||  update.action === "update_name_length"
        ||  update.action === "update_control_param"
      ) {
        ns.print("Update for us to act on has arrive:\n" + UPDATE_HANDLER.peek())
        awaiting_update = false 
        UPDATE_HANDLER.read()
      }
      else {
        await ns.sleep(4)
      }
    }

    switch (update.action) {
      case "update_hash_target":
        update_hash_target(ns, update.target, update.time)
        break
      case "update_name_length":
        update_name_length(ns, update.name_length)
        break
      case "update_control_param":
        update_control_param(ns, update.payload.domain, update.payload.property, update.payload.value)
        break
    }

    while(!CONTROL_PARAM_HANDLER.empty()) {
      CONTROL_PARAM_HANDLER.clear()
    }
    CONTROL_PARAM_HANDLER.write(JSON.stringify(CONTROL_PARAMETERS))
    await ns.sleep(4)
  }
}