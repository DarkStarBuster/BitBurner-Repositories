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

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("sleep")
  ns.disableLog("getServerMoneyAvailable")

  ns.setTitle("Manage Hacknet V2.0 - PID: " + ns.pid)
  
  const CONTROL_PARAMETERS    = ns.getPortHandle(1)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(2)

  while (CONTROL_PARAMETERS.empty()) {
    await ns.sleep(50)
  }
  while (BITNODE_MULTS_HANDLER.empty()) {
    await ns.sleep(50)
  }

  let control_params = JSON.parse(CONTROL_PARAMETERS.peek())
  let bitnode_mults = JSON.parse(BITNODE_MULTS_HANDLER.peek())

  let calc_only = control_params.hacknet.calc_only
  let threshold = control_params.hacknet.threshold
  let cost_mod  = control_params.hacknet.cost_mod
  let hacknet_node_money_mult = bitnode_mults["HacknetNodeMoney"]

  let gain_over_cost = 1
  let prev_choice = " "
  let prev_choice_idx = 0
  let prev_gain_ratio = 0

  while (gain_over_cost > threshold) {
    while (CONTROL_PARAMETERS.empty()) {
      await ns.sleep(50)
    }
    while (BITNODE_MULTS_HANDLER.empty()) {
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
      new_server_gain = total_production / ns.hacknet.numNodes()
    }

    gain_over_cost = new_server_gain / new_server_cost
    let gain_cost = new_server_cost
    //ns.print("Base gain_ratio: " + gain_over_cost)
    let best_choice = "N"
    let best_choice_idx = -1

    for (let i = 0; i < ns.hacknet.numNodes(); i++) {

      let node_stats = ns.hacknet.getNodeStats(i)
      let node_level = node_stats.level
      let node_ram = node_stats.ram
      let node_cores = node_stats.cores

      let level_gain = gain_from_level_upgrade(ns, node_level, node_ram, node_cores, hacknet_node_money_mult)
      let ram_gain   = gain_from_ram_upgrade  (ns, node_level, node_ram, node_cores, hacknet_node_money_mult)
      let core_gain  = gain_from_core_upgrade (ns, node_level, node_ram, node_cores, hacknet_node_money_mult)

      if (level_gain / ns.hacknet.getLevelUpgradeCost(i) > gain_over_cost) {
        gain_over_cost = level_gain / ns.hacknet.getLevelUpgradeCost(i)
        gain_cost = ns.hacknet.getLevelUpgradeCost(i)
        best_choice = "L"
        best_choice_idx = i
        //ns.print("Improved gain_ratio using " + best_choice + " on " + best_choice_idx + " to: " + gain_over_cost)
      }
      if ((ram_gain / ns.hacknet.getRamUpgradeCost(i)) > gain_over_cost) {
        gain_over_cost = ram_gain / ns.hacknet.getRamUpgradeCost(i)
        gain_cost = ns.hacknet.getRamUpgradeCost(i)
        best_choice = "R"
        best_choice_idx = i
        //ns.print("Improved gain_ratio using " + best_choice + " on " + best_choice_idx + " to: " + gain_over_cost)
      }
      if ((core_gain / ns.hacknet.getCoreUpgradeCost(i)) > gain_over_cost) {
        gain_over_cost = core_gain / ns.hacknet.getCoreUpgradeCost(i)
        gain_cost = ns.hacknet.getCoreUpgradeCost(i)
        best_choice = "C"
        best_choice_idx = i
        //ns.print("Improved gain_ratio using " + best_choice + " on " + best_choice_idx + " to: " + gain_over_cost)
      }
    }

    if (gain_over_cost < threshold) {
      break
    }

    ns.clearLog()
    ns.print(
      "Previous Action: " + prev_choice + " on " + prev_choice_idx + " with Ratio: " + ns.formatNumber(prev_gain_ratio,6) + "\n"
    + "Planned Action : " + best_choice + " on " + best_choice_idx + " with Ratio: " + ns.formatNumber(gain_over_cost,6) +  "\n"
    + "Cost of Action : " + gain_cost
    // + "Base Level Gain: 1.5 * " + ns.getPlayer().mults.hacknet_node_money + " * " + bitnode_info["HacknetNodeMoney"] + " = "
    // + 1.5 * ns.getPlayer().mults.hacknet_node_money * bitnode_info["HacknetNodeMoney"]
    )

    if (
        (ns.getServerMoneyAvailable("home") > (cost_mod * gain_cost))
    &&  !calc_only
    ) {
      ns.print("Performing Action")
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

  const UPDATE_HANDLER = ns.getPortHandle(4)
  
  let update = {
    "action": "request_action",
    "request_action": {
      "script_action": "freeram"
    }
  }

  while(!UPDATE_HANDLER.tryWrite(JSON.stringify(update))) {
    await ns.sleep(50)
  }
}