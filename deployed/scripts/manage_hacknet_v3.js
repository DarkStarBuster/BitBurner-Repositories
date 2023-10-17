import { scan_for_servers } from "/scripts/util/scan_for_servers"
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

/**
 * @param {NS} ns
 */
function decide_target_of_hashes(ns) {
  /**
   * @type {string[]}
   */
  let servers = scan_for_servers(ns,{"is_rooted":true,"has_money":true})
  // Find the most optimal hack target based on having already reduced the Minimum Security to 1
  servers.sort(
    // Negative Result means a before b
    // Zero Result means no change
    // Positive Result means b before a
    function(a,b){
      let player   = ns.getPlayer()
      let server_a = ns.getServer(a)
      let server_b = ns.getServer(b)

      let server_money_max_factor = 0
      // Server A is greater than ten trillion, Server B is less than ten trillion, push B up the rankings.
      if (
          server_a.moneyMax > 1e13
      &&  server_b.moneyMax < 1e13
      ) {
        server_money_max_factor = +1000
      }
      // Server A is less than ten trillion, Server B is greater than ten trillion, push A up the rankings.
      else if (
          server_a.moneyMax < 1e13
      &&  server_b.moneyMax > 1e13
      ) {
        server_money_max_factor = -1000
      }
      // Either:
      // Both servers money maximum is greater than ten trillion, push the larger one up the rankings.
      // Or:
      // Servers are both less than ten trillion, order them so that the larger one is pushed up the rankings.
      // Is true.
      else {
        server_money_max_factor = Math.sign(server_b.moneyMax - server_a.moneyMax) * 100
      }

      let server_a_min_diff_upg_needed = Math.ceil(Math.log(1/server_a.minDifficulty) / Math.log(0.98))
      let server_b_min_diff_upg_needed = Math.ceil(Math.log(1/server_b.minDifficulty) / Math.log(0.98))

      let server_min_diff_upg_factor = Math.sign(server_a_min_diff_upg_needed - server_b_min_diff_upg_needed) * 100

      let server_a_max_money_upg_needed = Math.ceil(Math.log(1e13/server_a.moneyMax) / Math.log(1.02))
      let server_b_max_money_upg_needed = Math.ceil(Math.log(1e13/server_b.moneyMax) / Math.log(1.02))

      let server_max_money_upg_factor = Math.sign(server_a_max_money_upg_needed - server_b_max_money_upg_needed) * 100

      return Math.sign(server_money_max_factor + server_min_diff_upg_factor + server_max_money_upg_factor)
    }
  )
  return servers[0]
}

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("sleep")
  ns.disableLog("getServerMoneyAvailable")

  ns.setTitle("Manage Hacknet V3.0 - PID: " + ns.pid)

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

  let threshold_mult = 1
  let calc_only = control_params.hacknet.calc_only
  let threshold = control_params.hacknet.threshold * threshold_mult
  let cost_mod  = control_params.hacknet.cost_mod
  let hacknet_node_money_mult = bitnode_mults["HacknetNodeMoney"]

  let one_hash_worth = 1e6 / 4
  let prev_choice = " "
  let prev_choice_idx = 0
  let prev_gain_ratio = 0
  let best_choice = " "
  let best_choice_idx = 0
  let gain_cost = 0
  let gain_over_cost = 0
  
  let hash_server_target

  while (true) {
    while (CONTROL_PARAMETERS.empty()) {
      await ns.sleep(50)
    }
    control_params = JSON.parse(CONTROL_PARAMETERS.peek())
    let hacknet_stat_array = []
    /**
     * Always the $ value of our Hacknet Production
     */
    let total_production = 0
    if (ns.hacknet.numNodes() > 0) {
      for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        hacknet_stat_array.push(ns.hacknet.getNodeStats(i))
        total_production += hacknet_stat_array[i].production
      }
      if (!(hacknet_stat_array[0].cache === undefined)) {
        // Hashes are generated
        total_production = total_production * one_hash_worth
      }
    }

    let recent_script_income  = ns.getTotalScriptIncome()[0] // 0 is $/s of active scripts, 1 is $/s of scripts run since last installing Augs.
    let recent_hacknet_income = total_production

    if (hash_server_target === undefined) {
      hash_server_target = decide_target_of_hashes(ns)
    }
    let server_obj = ns.getServer(hash_server_target)
    let min_diff_upg_needed = Math.ceil(Math.log(1/server_obj.minDifficulty) / Math.log(0.98))
    let max_money_upg_needed = Math.ceil(Math.log(1e13/server_obj.moneyMax) / Math.log(1.02))

    // If we are making more money through hacking scripts than hacknet, improve our hacknet
    if (
        recent_script_income > recent_hacknet_income
    &&  prev_gain_ratio > threshold
    ) { 
      let best_choice = "N"
      let best_choice_idx = -1
      let gain_cost = gain_per_level(ns, hacknet_node_money_mult)   
      if (ns.hacknet.numNodes() > 0) {
        gain_cost = total_production / ns.hacknet.numNodes()
      }  
      let gain_over_cost = gain_cost / ns.hacknet.getPurchaseNodeCost()

      for (let server of hacknet_stat_array) {
        let p = ns.getPlayer()    

        let current_hash = ns.formulas.hacknetServers.hashGainRate(server.level  , 0, server.ram  , server.cores  , p.mults.hacknet_node_money)
        let level_gain   = ns.formulas.hacknetServers.hashGainRate(server.level+1, 0, server.ram  , server.cores  , p.mults.hacknet_node_money) - current_hash
        let ram_gain     = ns.formulas.hacknetServers.hashGainRate(server.level  , 0, server.ram*2, server.cores  , p.mults.hacknet_node_money) - current_hash
        let core_gain    = ns.formulas.hacknetServers.hashGainRate(server.level  , 0, server.ram  , server.cores+1, p.mults.hacknet_node_money) - current_hash

        if (((level_gain * one_hash_worth) / ns.hacknet.getLevelUpgradeCost(i)) > gain_over_cost) {
          gain_over_cost = (level_gain * one_hash_worth) / ns.hacknet.getLevelUpgradeCost(i)
          gain_cost = ns.hacknet.getLevelUpgradeCost(i)
          best_choice = "L"
          best_choice_idx = i
        }
        if (((ram_gain * one_hash_worth) / ns.hacknet.getRamUpgradeCost(i)) > gain_over_cost) {
          gain_over_cost = (ram_gain * one_hash_worth) / ns.hacknet.getRamUpgradeCost(i)
          gain_cost = ns.hacknet.getRamUpgradeCost(i)
          best_choice = "R"
          best_choice_idx = i
        }
        if (((core_gain * one_hash_worth) / ns.hacknet.getCoreUpgradeCost(i)) > gain_over_cost) {
          gain_over_cost = (core_gain * one_hash_worth) / ns.hacknet.getCoreUpgradeCost(i)
          gain_cost = ns.hacknet.getCoreUpgradeCost(i)
          best_choice = "C"
          best_choice_idx = i
        }
      }

      // Best Return on Investment Action chosen. Now Do it if we have the money and aren't just calculating the best action.
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
    } // If we cannot purchase server upgrades due to a lack of hash capacity, upgrade the capacity
    else if (
        ns.hacknet.hashCost("Reduce Minimum Security", 1) > ns.hacknet.hashCapacity()
    ||  ns.hacknet.hashCost("Increase Maximum Money", 1) > ns.hacknet.hashCapacity()
    ) {
      let minimum_cache_cost = Infinity
      let minimum_cache_cost_idx = -1
      for (let server in hacknet_stat_array) {
        if (ns.hacknet.getCacheUpgradeCost(server) < minimum_cache_cost) {
          minimum_cache_cost = ns.hacknet.getCacheUpgradeCost(server)
          minimum_cache_cost_idx = server
        }
      }
      if (minimum_cache_cost_idx != -1) {
        ns.hacknet.upgradeCache(minimum_cache_cost_idx)
        prev_choice = "H"
        prev_choice_idx = minimum_cache_cost_idx
        prev_gain_ratio = 0
      }
    }// If we are making more money through hacknet than hacking scripts, improve our hacking scripts.
    else if (
        recent_script_income < recent_hacknet_income
    &&  !(hash_server_target === undefined)
    ) {
      if (
          min_diff_upg_needed > 0
      &&  ns.hacknet.hashCost("Reduce Minimum Security", 1) < ns.hacknet.numHashes()
      ) {
        ns.hacknet.spendHashes("Reduce Minimum Security", hash_server_target, 1)
      }

      if (
          max_money_upg_needed > 0
      &&  ns.hacknet.hashCost("Increase Maximum Money", 1) < ns.hacknet.numHashes()
      ) {
        ns.hacknet.spendHashes("Increase Maximum Money", hash_server_target, 1)
      }
    }

    ns.clearLog()
    ns.print(
        "Previous Action:  " + prev_choice + " on " + prev_choice_idx.toString().padStart(2) + " with RoI Time: " + ns.formatNumber(1/prev_gain_ratio).padStart(8)
      + " | Hash Upgrade Target : " + hash_server_target + "\n"
      + "Planned Action :  " + best_choice + " on " + best_choice_idx.toString().padStart(2) + " with RoI Time: " + ns.formatNumber(1/gain_over_cost).padStart(8)
      + " | Min Diff Upg Needed : " + min_diff_upg_needed + "\n"
      + "Cost of Action : " + ns.formatNumber(gain_cost).padStart(9) + " RoI Time Thr: " + ns.formatNumber(1/threshold).padStart(8)
      + " | Max Money Upg Needed: " + max_money_upg_needed
      // + "Base Level Gain: 1.5 * " + ns.getPlayer().mults.hacknet_node_money + " * " + bitnode_info["HacknetNodeMoney"] + " = "
      // + 1.5 * ns.getPlayer().mults.hacknet_node_money * bitnode_info["HacknetNodeMoney"]
    )
    let table = format_stats(ns, hacknet_stat_array)
    ns.print(table)
    await ns.sleep(100)
  }
}