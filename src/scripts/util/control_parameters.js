import { ServerState } from "/src/scripts/util/dynamic/manage_server_scanning";
import { PORT_IDS } from "/src/scripts/util/dynamic/manage_ports"

class ServerControlParameters {
  max_name_length;

  /**
   * @param {import("@ns").NS} ns
   * @param {Object<string, ServerState>} server_info
   */
  constructor(ns, server_info) {
    let name_length = 0
    for (let server in server_info) {
      name_length = Math.max(name_length, server.length)
    }
    this.max_name_length = name_length
  }
}

class RAMControlParameters {
  free_amt = 16;

  /**
   * @param {import("@ns").NS} ns
   */
  constructor(ns) {}
}

class HackMgrControlParameters {
  consider_early = 64;
  hack_batch_time_interval = 125;
  total_hack_batch_limit = 40000 / 4;
  min_hack_threads_for_batch = 1;
  num_of_preppers = 2;

  /**
   * @param {import("@ns").NS} ns
   */
  constructor(ns) {}
}

class PServMgrControlParameters {
  max_ram_exponent_to_purchase = 20;
  min_amt_to_purchase_new = 2e6;
  ram_exponent_of_new_servers = 1;
  mult_for_purchase_upg = 10;

  /**
   * @param {import("@ns").NS} ns
   */
  constructor(ns) {}
}

class HacknetMgrControlParameters {
  calc_only = false;
  threshold = 5e-6;
  cost_mod = 1;
  /** @type {string} */
  hash_target = null;
  hash_time = Infinity;

  /**
   * @param {import("@ns").NS} ns
   */
  constructor(ns) {}
}

class GangMgrControlParameters {
  calc_only = false;
  open_ui = false;
  gang_faction = "Slum Snakes";
  check_faction = "The Black Hand";
  purchase_perc = 1/20;
  ascension_mult = 10;

  /**
   * @param {import("@ns").NS} ns
   */
  constructor(ns) {
    this.gang_faction = ns.enums.FactionName.SlumSnakes
    this.check_faction = ns.enums.FactionName.TheBlackHand
  }
}

export class ControlParameters {
  /** @type {ServerControlParameters}*/
  servers;
  /** @type {RAMControlParameters} */
  home;       // rename to ram_mgr
  /** @type {HackMgrControlParameters} */
  hacker;     // rename to hack_mgr
  /** @type {PServMgrControlParameters} */
  pserv;      // renamge to pserv_mgr
  /** @type {HacknetMgrControlParameters} */
  hacknet_mgr;
  /** @type {GangMgrControlParameters} */
  gang_mgr;

  /**
   * @param {import("@ns").NS} ns
   * @param {Object<string, ServerState>} server_info
   */
  constructor(ns, server_info) {
    this.servers = new ServerControlParameters(ns, server_info)
    this.home = new RAMControlParameters(ns)
    this.hacker = new HackMgrControlParameters(ns)
    this.pserv = new PServMgrControlParameters(ns)
    this.hacknet_mgr = new HacknetMgrControlParameters(ns)
    this.gang_mgr = new GangMgrControlParameters(ns)
  }
}

/**
 * @param {import("@ns").NS} ns
 */
function init(ns, server_info) {
  return new ControlParameters(ns, server_info)
}

/**
 * @param {ControlParameters} control_parameters
 * @param {string} target
 * @param {number} time
 */
function update_hash_target(control_parameters, target, time) {
  control_parameters.hacknet_mgr.hash_target = target
  control_parameters.hacknet_mgr.hash_time = time
}

/**
 * 
 * @param {import("@ns").NS} ns
 * @param {ControlParameters} control_parameters
 * @param {string} domain 
 * @param {string} property 
 * @param {number | string | boolean} value 
 */
function update_control_param(ns, control_parameters, domain, property, value) {
  if (
      domain === undefined
  ||  property === undefined
  ||  value === undefined
  ) {
    ns.tprint(`Malformed CONTROL_PARAM update properties {domain: ${domain}, property: ${property}, value: ${value}}`)
    return
  }

  if (
      control_parameters[domain]
  &&  !(control_parameters[domain][property] === undefined)
  ) {
    let coerrced_val
    if (!(typeof control_parameters[domain][property] === typeof value)) {
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
      control_parameters[domain][property] = value
    }
    else {
      control_parameters[domain][property] = coerrced_val
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
  let control_parameters = init(ns, server_info)

  CONTROL_PARAM_HANDLER.write(JSON.stringify(control_parameters))

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
        update_hash_target(control_parameters, update.target, update.time)
        break
      case "update_control_param":
        update_control_param(ns, control_parameters, update.payload.domain, update.payload.property, update.payload.value)
        break
    }

    while(!CONTROL_PARAM_HANDLER.empty()) {
      CONTROL_PARAM_HANDLER.clear()
    }
    CONTROL_PARAM_HANDLER.write(JSON.stringify(control_parameters))
    await ns.sleep(4)
  }
}