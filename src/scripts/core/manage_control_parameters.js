import { ServerStateInfo } from "/src/scripts/core/util_server_scanning";
import { ControlParameters } from "/src/scripts/core/util_control_parameters";
import { PORT_IDS } from "/src/scripts/boot/manage_ports"

class IncomeTime {
  total = 0;
  timestamp = 0;

  /**
   * @param {number} total 
   * @param {number} timestamp 
   */
  constructor(total, timestamp) {
    this.total = total
    this.timestamp = timestamp
  }
}

class ProcessInfo {
  last_waiting_break;
  /** @type {number} */
  last_total_income_sample_time;
  /** @type {IncomeTime[]} */
  last_total_incomes = [];
  constructor() {
    this.last_waiting_break = performance.now()
    this.last_total_income_sample_time = 0
  }
}

/**
 * @param {import("@ns").NS} ns
 */
function init(ns, server_info) {
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
        if (typeof control_parameters[domain][property] === typeof true) {
          if (value == "true") {
            coerrced_val = true
          }
          else if (value == "false") {
            coerrced_val = false
          }
        }
        else if (typeof control_parameters[domain][property] === typeof 1) {
          coerrced_val = parseInt(value)
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

/**
 * @param {import("@ns").NS} ns
 * @param {ProcessInfo} prc_info
 * @param {Object<string, ServerStateInfo>} server_info
 * @param {ControlParameters} ctrl_param
 */
function execute_heartbeat_tasks(ns, prc_info, server_info, ctrl_param) {
  let name_length = 0
  for (let server in server_info) {
    name_length = Math.max(name_length, server.length)
  }
  ctrl_param.servers.max_name_length = name_length

  if (prc_info.last_total_income_sample_time + 10000 < performance.now()) {
    prc_info.last_total_income_sample_time = performance.now()
    prc_info.last_total_incomes.push(new IncomeTime(ns.getMoneySources().sinceInstall.total, performance.now()))
    if (prc_info.last_total_incomes.length > 10) {
      prc_info.last_total_incomes.shift()
    }
    let start_time = performance.now()
    let end_time = 0
    let money_diffs = 0
    let prior_info
    for (let info of prc_info.last_total_incomes) {
      start_time = Math.min(start_time, info.timestamp)
      end_time = Math.max(end_time, info.timestamp)
      if (prior_info === undefined) {
        prior_info = info
      }
      else {
        money_diffs = money_diffs + (info.total - prior_info.total)
      }
    }
    if (money_diffs === 0) {ctrl_param.player_mgr.total_income = 0}
    else {
      let total_time = (end_time - start_time) / 1000 // Time is in milliseconds so divide by 1000 to get number of seconds
      ctrl_param.player_mgr.total_income = (money_diffs / total_time)
    }
    // ns.tprint(`INFO: Update total income/s: $${ns.formatNumber(ctrl_param.player_mgr.total_income)}`)
  }

  ctrl_param.player_mgr.player = ns.getPlayer()
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
  let control_parameters = new ControlParameters(ns, server_info)
  let prc_info = new ProcessInfo()

  CONTROL_PARAM_HANDLER.write(JSON.stringify(control_parameters))

  while(true) {
    if (!SERVER_INFO_HANDLER.empty()) {
      server_info = JSON.parse(SERVER_INFO_HANDLER.peek())
    }
    ns.print("Awaiting Update we can act on.")
    let awaiting_update = true
    let update_recieved = false
    let update = {}
    while (awaiting_update) {
      if (prc_info.last_waiting_break + 1000 < performance.now()) {prc_info.last_waiting_break = performance.now(); break}
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
        update_recieved = true
        UPDATE_HANDLER.read()
      }
      else {
        await ns.sleep(4)
      }
    }

    if (update_recieved) {
      switch (update.action) {
        case "update_hash_target":
          update_hash_target(control_parameters, update.target, update.time)
          break
        case "update_control_param":
          update_control_param(ns, control_parameters, update.payload.domain, update.payload.property, update.payload.value)
          break
      }
    }

    execute_heartbeat_tasks(ns, prc_info, server_info, control_parameters)

    while(!CONTROL_PARAM_HANDLER.empty()) {
      CONTROL_PARAM_HANDLER.clear()
    }
    CONTROL_PARAM_HANDLER.write(JSON.stringify(control_parameters))
    await ns.sleep(4)
  }
}