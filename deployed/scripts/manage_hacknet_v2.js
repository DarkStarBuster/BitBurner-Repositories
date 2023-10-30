import { PORT_IDS } from "/scripts/util/port_management"
import { COLOUR, colourize } from "/scripts/util/colours"

let prior_tail_width = 0
let prior_tail_height = 0

/**
 * @param {NS} ns
 * @param {number} hacknet_node_money_mult
 */
function gain_per_level(ns, hacknet_node_money_mult) {
  return 1.5 * ns.getPlayer().mults.hacknet_node_money * hacknet_node_money_mult
}

/**
 * @param {NS} ns
 * @param {number} level
 * @param {number} ram
 * @param {number} cores
 * @param {number} hacknet_node_money_mult
 */
function gain_from_level_upgrade(ns, level, ram, cores, hacknet_node_money_mult) {
  return (1*gain_per_level(ns, hacknet_node_money_mult)) * Math.pow(1.035,ram-1) * ((cores+5)/6)
}

/**
 * @param {NS} ns
 * @param {number} level
 * @param {number} ram
 * @param {number} cores
 * @param {number} hacknet_node_money_mult
 */
function gain_from_ram_upgrade(ns, level, ram, cores, hacknet_node_money_mult) {
  return (level*gain_per_level(ns, hacknet_node_money_mult)) * (Math.pow(1.035,(2*ram)-1) - Math.pow(1.035,ram-1)) * ((cores+5)/6)
}

/**
 * @param {NS} ns
 * @param {number} level
 * @param {number} ram
 * @param {number} cores
 * @param {number} hacknet_node_money_mult
 */
function gain_from_core_upgrade(ns, level, ram, cores, hacknet_node_money_mult) {
  return (level*gain_per_level(ns, hacknet_node_money_mult)) * Math.pow(1.035,ram-1) * (1/6)
}

/**
 * @param {NS} ns
 * @param {NodeStats[]} stats_array 
 * @returns 
 */
function format_stats(ns, stats_array) {
  let table_strings = []
  let node_cnt = 0
  let row_length = 6
  let height = 7
  for (let server of stats_array) {
    let row = Math.floor(node_cnt / row_length)
    if ((node_cnt % row_length) != 0) {
      table_strings[(row*height)+0] = table_strings[(row*height)+0].replace("╗","╦")
      table_strings[(row*height)+7] = table_strings[(row*height)+7].replace("╝","╩")
    }
    if (row == 0) {
      table_strings[(row*height)+0] = (table_strings[(row*height)+0] || "╔") + "".padEnd(16, "═") + "╗"
    }
    else {
      table_strings[((row-1)*height)+7] = table_strings[((row-1)*height)+7].replace("╚","╠").replace("╩","╬")
      if ((node_cnt + 1) % row_length == 0) {
        table_strings[((row-1)*height)+7] = table_strings[((row-1)*height)+7].replace("╝","╣")
      }
    }
    table_strings[(row*height)+1] = (table_strings[(row*height)+1] || "║") + " Node (" + node_cnt + ")".padEnd(8 - (node_cnt.toString().length)) + " ║"
    table_strings[(row*height)+2] = (table_strings[(row*height)+2] || "║") + " Level: " + server.level.toString().padStart(7) + " ║"
    table_strings[(row*height)+3] = (table_strings[(row*height)+3] || "║") + " RAM  : " + ns.formatRam(server.ram,0).padStart(7) + " ║"
    table_strings[(row*height)+4] = (table_strings[(row*height)+4] || "║") + " Cores: " + server.cores.toString().padStart(7) + " ║"
    table_strings[(row*height)+5] = (table_strings[(row*height)+5] || "║") + " Cache: " + (server.cache || 0).toString().padStart(7) + " ║"
    table_strings[(row*height)+6] = (table_strings[(row*height)+6] || "║") + " Prod : " + server.production.toFixed(4).padStart(7) + " ║"
    table_strings[(row*height)+7] = (table_strings[(row*height)+7] || "╚") + "".padEnd(16, "═") + "╝"
    node_cnt++
  }
  let table_output = ""
  for (let string of table_strings) {
    table_output = table_output + string + "\n"
  }

  let width_per_node = 166
  let height_per_row = 390
  let row_cnt = Math.floor(node_cnt / row_length)
  let tail_width = 0
  let tail_height = 0
  tail_width  = width_per_node * ((node_cnt > 5) ? 6 : (node_cnt + 1))
  tail_height = (height_per_row * row_cnt) + 75// Additional information Rows.
  let resize = false
  if (tail_height != prior_tail_height) {
    prior_tail_height = tail_height
    resize = true
  }
  if (tail_width != prior_tail_width) {
    prior_tail_width = tail_width
    resize = true
  }
  if (resize) {
    ns.tail()
    ns.resizeTail(tail_width, tail_height)
  }

  return table_output
}

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("sleep")
  ns.disableLog("getServerMoneyAvailable")

  ns.setTitle("Manage Hacknet V2.0 - PID: " + ns.pid)

  const CONTROL_PARAMETERS    = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(PORT_IDS.BITNODE_MULTS_HANDLER)
  const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)

  while (
      CONTROL_PARAMETERS.empty()
  ||  BITNODE_MULTS_HANDLER.empty()
  ) {
    await ns.sleep(50)
  }

  let control_params = JSON.parse(CONTROL_PARAMETERS.peek())
  let bitnode_mults = JSON.parse(BITNODE_MULTS_HANDLER.peek())

  let calc_only = control_params.hacknet.calc_only
  let threshold = control_params.hacknet.threshold
  let cost_mod  = control_params.hacknet.cost_mod
  let hacknet_node_money_mult = bitnode_mults["HacknetNodeMoney"]

  let one_hash_worth = 1e6 / 4
  let gain_over_cost = 1
  let prev_choice = " "
  let prev_choice_idx = 0
  let prev_gain_ratio = 0

  while (gain_over_cost > threshold) {
    while (
        CONTROL_PARAMETERS.empty()
    ||  BITNODE_MULTS_HANDLER.empty()
    ) {
      await ns.sleep(50)
    }

    control_params = JSON.parse(CONTROL_PARAMETERS.peek())
  
    calc_only = control_params.hacknet.calc_only
    threshold = control_params.hacknet.threshold
    cost_mod  = control_params.hacknet.cost_mod

    let new_server_cost = ns.hacknet.getPurchaseNodeCost()
    let new_server_gain = gain_per_level(ns, hacknet_node_money_mult)
    let total_production = 0

    if (ns.hacknet.numNodes() > 0) {
      for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        total_production += ns.hacknet.getNodeStats(i).production
      }
      new_server_gain = total_production * one_hash_worth / ns.hacknet.numNodes()
    }

    gain_over_cost = new_server_gain / new_server_cost
    let gain_cost = new_server_cost
    //ns.print("Base gain_ratio: " + gain_over_cost)
    let best_choice = "N"
    let best_choice_idx = -1

    ns.clearLog()
    let hacknet_stat_array = []
    for (let i = 0; i < ns.hacknet.numNodes(); i++) {
      let p = ns.getPlayer()
      let node_stats = ns.hacknet.getNodeStats(i)      

      let current_hash = ns.formulas.hacknetServers.hashGainRate(node_stats.level  , 0, node_stats.ram  , node_stats.cores  , p.mults.hacknet_node_money)
      let level_gain   = ns.formulas.hacknetServers.hashGainRate(node_stats.level+1, 0, node_stats.ram  , node_stats.cores  , p.mults.hacknet_node_money) - current_hash
      let ram_gain     = ns.formulas.hacknetServers.hashGainRate(node_stats.level  , 0, node_stats.ram*2, node_stats.cores  , p.mults.hacknet_node_money) - current_hash
      let core_gain    = ns.formulas.hacknetServers.hashGainRate(node_stats.level  , 0, node_stats.ram  , node_stats.cores+1, p.mults.hacknet_node_money) - current_hash
      // ns.print("Node " + i)
      // ns.print("Level Gain: " + level_gain.toFixed(8) + " | Ratio: " + (level_gain * one_hash_worth) / ns.hacknet.getLevelUpgradeCost(i))
      // ns.print("RAM Gain  : " + ram_gain.toFixed(8)   + " | Ratio: " + (ram_gain   * one_hash_worth) / ns.hacknet.getRamUpgradeCost(i))
      // ns.print("Core Gain : " + core_gain.toFixed(8)  + " | Ratio: " + (core_gain  * one_hash_worth) / ns.hacknet.getCoreUpgradeCost(i))

      hacknet_stat_array.push(node_stats)

      // let level_gain = gain_from_level_upgrade(ns, node_level, node_ram, node_cores, hacknet_node_money_mult)
      // let ram_gain   = gain_from_ram_upgrade  (ns, node_level, node_ram, node_cores, hacknet_node_money_mult)
      // let core_gain  = gain_from_core_upgrade (ns, node_level, node_ram, node_cores, hacknet_node_money_mult)

      if (((level_gain * one_hash_worth) / ns.hacknet.getLevelUpgradeCost(i)) > gain_over_cost) {
        gain_over_cost = (level_gain * one_hash_worth) / ns.hacknet.getLevelUpgradeCost(i)
        gain_cost = ns.hacknet.getLevelUpgradeCost(i)
        best_choice = "L"
        best_choice_idx = i
        //ns.print("Improved gain_ratio using " + best_choice + " on " + best_choice_idx + " to: " + gain_over_cost)
      }
      if (((ram_gain * one_hash_worth) / ns.hacknet.getRamUpgradeCost(i)) > gain_over_cost) {
        gain_over_cost = (ram_gain * one_hash_worth) / ns.hacknet.getRamUpgradeCost(i)
        gain_cost = ns.hacknet.getRamUpgradeCost(i)
        best_choice = "R"
        best_choice_idx = i
        //ns.print("Improved gain_ratio using " + best_choice + " on " + best_choice_idx + " to: " + gain_over_cost)
      }
      if (((core_gain * one_hash_worth) / ns.hacknet.getCoreUpgradeCost(i)) > gain_over_cost) {
        gain_over_cost = (core_gain * one_hash_worth) / ns.hacknet.getCoreUpgradeCost(i)
        gain_cost = ns.hacknet.getCoreUpgradeCost(i)
        best_choice = "C"
        best_choice_idx = i
        //ns.print("Improved gain_ratio using " + best_choice + " on " + best_choice_idx + " to: " + gain_over_cost)
      }
    }

    if (gain_over_cost < threshold) {
      break
    }


    let table = format_stats(ns, hacknet_stat_array)
    ns.print(
      "Previous Action:  " + prev_choice + " on " + prev_choice_idx.toString().padStart(2) + " with Ratio: " + ns.formatNumber(prev_gain_ratio,6) + "\n"
    + "Planned Action :  " + best_choice + " on " + best_choice_idx.toString().padStart(2) + " with Ratio: " + ns.formatNumber(gain_over_cost,6) +  "\n"
    + "Cost of Action : " + ns.formatNumber(gain_cost).padStart(9) + " Threshold: " + ns.formatNumber(threshold,6)
    // + "Base Level Gain: 1.5 * " + ns.getPlayer().mults.hacknet_node_money + " * " + bitnode_info["HacknetNodeMoney"] + " = "
    // + 1.5 * ns.getPlayer().mults.hacknet_node_money * bitnode_info["HacknetNodeMoney"]
    )
    ns.print(table)
    

    if (
        (ns.getServerMoneyAvailable("home") > (cost_mod * gain_cost))
    &&  !calc_only
    ) {
      //ns.print("Performing Action")
      switch (best_choice) {
        case "N":
          ns.hacknet.purchaseNode()
          break
        case "L":
          ns.hacknet.upgradeLevel(best_choice_idx)
          break
        case "R":
          ns.hacknet.upgradeRam(best_choice_idx)
          break
        case "C":
          ns.hacknet.upgradeCore(best_choice_idx)
          break
      }
      prev_choice = best_choice
      prev_choice_idx = best_choice_idx
      prev_gain_ratio = gain_over_cost
    }
    await ns.sleep(50)
  }

  // // Now to spend hashes on shit.
  // let hacknet_constants = ns.formulas.hacknetServers.constants()
  // let hacknet_choices =  ns.hacknet.getHashUpgrades()
  // while (true) {
    
  //   //ns.hacknet.spendHashes("upgName", "upgTarget?", "count?")
  //   await ns.sleep(10)
  // }

  
  // let update = {
  //   "action": "request_action",
  //   "request_action": {
  //     "script_action": "freeram"
  //   }
  // }

  // while(!UPDATE_HANDLER.tryWrite(JSON.stringify(update))) {
  //   await ns.sleep(50)
  // }
}