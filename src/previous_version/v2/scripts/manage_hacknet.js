const ONLY_CALC_NO_PURCHASE = false

/** @param {import("@ns").NS} ns */
function gain_per_level(ns) {
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(2)
  let bitnode_info = JSON.parse(BITNODE_MULTS_HANDLER.peek())

  return 1.5 * ns.getPlayer().mults.hacknet_node_money * bitnode_info["HacknetNodeMoney"]
}

/**
 * @param {import("@ns").NS} ns
 * @param {number} level
 * @param {number} ram
 * @param {number} cores
 */
function gain_from_level_upgrade(ns, level, ram, cores) {

  return (1*gain_per_level(ns)) * Math.pow(1.035,ram-1) * ((cores+5)/6)
}

/**
 * @param {import("@ns").NS} ns
 * @param {number} level
 * @param {number} ram
 * @param {number} cores
 */
function gain_from_ram_upgrade(ns, level, ram, cores) {
  return (level*gain_per_level(ns)) * (Math.pow(1.035,(2*ram)-1) - Math.pow(1.035,ram-1)) * ((cores+5)/6)
}

/**
 * @param {import("@ns").NS} ns
 * @param {number} level
 * @param {number} ram
 * @param {number} cores
 */
function gain_from_core_upgrade(ns, level, ram, cores) {
  return (level*gain_per_level(ns)) * Math.pow(1.035,ram-1) * (1/6)
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  ns.disableLog("sleep")
  ns.disableLog("getServerMoneyAvailable")
  
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(2)

  while (BITNODE_MULTS_HANDLER.empty()) {
    await ns.sleep(100)
  }

  let gain_over_cost = 1
  let prev_choice = " "
  let prev_choice_idx = 0
  let prev_gain_ratio = 0

  while (gain_over_cost > 5e-6) {

    let new_server_cost = ns.hacknet.getPurchaseNodeCost()
    let new_server_gain = gain_per_level(ns)
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

      let level_gain = gain_from_level_upgrade(ns,node_level,node_ram,node_cores)
      let ram_gain = gain_from_ram_upgrade(ns,node_level,node_ram,node_cores)
      let core_gain = gain_from_core_upgrade(ns,node_level,node_ram,node_cores)

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

    if (gain_over_cost < 5e-6) {
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
        (ns.getServerMoneyAvailable("home") > 2*gain_cost)
    &&  !ONLY_CALC_NO_PURCHASE
    ) {
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
    await ns.sleep(100)
  }

  const UPDATE_HANDLER = ns.getPortHandle(4)
  
  let update = {
    "action": "request_action",
    "request_action": {
      "script_action": "freeram",
      "target": "home",
      "threads": 1
    }
  }

  while(!UPDATE_HANDLER.tryWrite(JSON.stringify(update))) {
    await ns.sleep(100)
  }
}