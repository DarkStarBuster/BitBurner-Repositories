import { scan_for_servers } from "/scripts/util/scan_for_servers"
import { PORT_IDS } from "/scripts/util/port_management"
import { COLOUR, colourize } from "/scripts/util/colours"

let prior_tail_width = 0
let prior_tail_height = 0

/**
 * @param {import("@ns").NS} ns
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
  let height_per_row = 185
  let row_cnt = Math.floor((node_cnt-1)/ row_length) + 1
  let tail_width = 996
  let tail_height = 0
  //tail_width  = width_per_node * ((node_cnt > 5) ? 6 : (node_cnt + 1))
  tail_height = (height_per_row * row_cnt) + 125// Additional information Rows.
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
    ns.ui.openTail()
    ns.ui.resizeTail(tail_width, tail_height)
  }

  return table_output
}

/**
 * @param {import("@ns").NS} ns
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

      // Compare Hash Upgrades required to get to Minimum Security
      let server_a_min_diff_upg_needed = Math.ceil(Math.log(1/server_a.minDifficulty) / Math.log(0.98))
      let server_b_min_diff_upg_needed = Math.ceil(Math.log(1/server_b.minDifficulty) / Math.log(0.98))

      let server_min_diff_upg_factor = Math.sign(server_a_min_diff_upg_needed - server_b_min_diff_upg_needed) * 100

      // Compare Hash Upgrades required to get to 10 Trillion
      let server_a_max_money_upg_needed = Math.ceil(Math.log(1e13/server_a.moneyMax) / Math.log(1.02))
      let server_b_max_money_upg_needed = Math.ceil(Math.log(1e13/server_b.moneyMax) / Math.log(1.02))

      let server_max_money_upg_factor = Math.sign(server_a_max_money_upg_needed - server_b_max_money_upg_needed) * 100
  
      server_a.minDifficulty  = 1
      server_a.hackDifficulty = 1
      server_b.minDifficulty  = 1
      server_b.hackDifficulty = 1
      // 
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
        server_money_max_factor = Math.sign(
          server_b.moneyMax * ns.formulas.hacking.hackPercent(server_b, player) * ns.formulas.hacking.hackChance(server_b, player)
        - server_a.moneyMax * ns.formulas.hacking.hackPercent(server_a, player) * ns.formulas.hacking.hackChance(server_a, player)
        ) * 100
      }

      return Math.sign(server_money_max_factor + server_min_diff_upg_factor + server_max_money_upg_factor)
    }
  )
  return servers[0]
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  ns.disableLog("ALL")

  ns.ui.setTailTitle("Manage Hacknet V3.0 - PID: " + ns.pid)

  const CONTROL_PARAMETERS    = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(PORT_IDS.BITNODE_MULTS_HANDLER)
  const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
  const ONE_HASH_WORTH        = 1e6/4

  while (
      CONTROL_PARAMETERS.empty()
  ||  BITNODE_MULTS_HANDLER.empty()
  ) {
    await ns.sleep(4)
  }

  prior_tail_width = 0
  prior_tail_height = 0

  let control_params = JSON.parse(CONTROL_PARAMETERS.peek())
  let bitnode_mults = JSON.parse(BITNODE_MULTS_HANDLER.peek())

  let calc_only = control_params.hacknet.calc_only
  let threshold = control_params.hacknet.threshold
  let cost_mod  = control_params.hacknet.cost_mod
  let p = ns.getPlayer()    
  let player_mults = p.mults
  let hacknet_node_money_mult = bitnode_mults["HacknetNodeMoney"] * player_mults.hacknet_node_money
  let hacking_script_money_mult = bitnode_mults["ScriptHackMoney"] * player_mults.hacking_money

  let prev_choice = " "
  let prev_choice_idx = 0
  let prev_gain_ratio = 0
  let best_choice = " "
  let best_choice_idx = 0
  let gain_cost = 0
  let gain_over_cost = 0
  
  while (true) {
    ns.clearLog()
    while (CONTROL_PARAMETERS.empty()) {
      await ns.sleep(4)
    }
    control_params = JSON.parse(CONTROL_PARAMETERS.peek())
    calc_only = control_params.hacknet.calc_only
    threshold = control_params.hacknet.threshold
    cost_mod  = control_params.hacknet.cost_mod

    let hacknet_stat_array = []
    /**
     * Always the $ value of our Hacknet Production
     */
    let total_production = 0
    let max_level = 1
    let max_ram = 1
    let max_cores = 1
    if (ns.hacknet.numNodes() > 0) {
      for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        hacknet_stat_array.push(ns.hacknet.getNodeStats(i))
        total_production += hacknet_stat_array[i].production
        max_level = (max_level < hacknet_stat_array[i].level) ? hacknet_stat_array[i].level : max_level
        max_ram   = (max_ram   < hacknet_stat_array[i].ram  ) ? hacknet_stat_array[i].ram   : max_ram
        max_cores = (max_cores < hacknet_stat_array[i].cores) ? hacknet_stat_array[i].cores : max_cores
      }
      if (!(hacknet_stat_array[0].cache === undefined)) {
        // Hashes are generated
        total_production = total_production * ONE_HASH_WORTH
      }
    }

    let recent_script_income  = ns.getTotalScriptIncome()[0] // 0 is $/s of active scripts, 1 is $/s of scripts run since last installing Augs.
    let recent_hacknet_income = total_production

    let hash_server_target = decide_target_of_hashes(ns)
    let server_obj = ns.getServer(hash_server_target)
    let diff_to_1_upgs  = Math.ceil(Math.log(1/server_obj.minDifficulty) / Math.log(0.98))
    let mon_to_e13_upgs = Math.ceil(Math.log(1e13/server_obj.moneyMax) / Math.log(1.02))

    let diff_to_1_cost  = ns.hacknet.hashCost("Reduce Minimum Security", diff_to_1_upgs)
    let mon_to_e13_cost = ns.hacknet.hashCost("Increase Maximum Money", mon_to_e13_upgs)

    let diff_to_1_ttb  = Infinity
    let mon_to_e13_ttb = Infinity
    if (total_production > 0) {
      diff_to_1_ttb  =  diff_to_1_cost  / (total_production / ONE_HASH_WORTH)
      mon_to_e13_ttb =  mon_to_e13_cost / (total_production / ONE_HASH_WORTH)
    }
    
    while(
      !UPDATE_HANDLER.tryWrite(
        JSON.stringify(
          {
            "action": "update_hash_target"
           ,"target": hash_server_target
           ,"time"  : total_production == 0 ? Infinity : diff_to_1_ttb + mon_to_e13_ttb
          }
        )
      )
    ) {
      await ns.sleep(4)
    }

    best_choice = "N"
    best_choice_idx = -1
    //let gain = gain_per_level(ns, hacknet_node_money_mult)
    let gain = ns.formulas.hacknetServers.hashGainRate(1,0,1,1,hacknet_node_money_mult)
    gain_cost = ns.hacknet.getPurchaseNodeCost()
    if (ns.hacknet.numNodes() > 0) {
      gain = (total_production / ONE_HASH_WORTH) / ns.hacknet.numNodes()
      gain_cost = ns.hacknet.getPurchaseNodeCost()
                + ns.formulas.hacknetServers.levelUpgradeCost(1, max_level - 1, player_mults.hacknet_node_level_cost)
                + ns.formulas.hacknetServers.ramUpgradeCost(1,(Math.log(max_ram)/Math.log(2)),player_mults.hacknet_node_ram_cost)
                + ns.formulas.hacknetServers.coreUpgradeCost(1,max_cores - 1, player_mults.hacknet_node_core_cost)
    }  
    gain_over_cost = (gain * ONE_HASH_WORTH) / gain_cost

    let server_id = 0
    for (let server of hacknet_stat_array) {
      // TODO: We need to decide when to automatically buy Cache upgrades other than just when we need to upgrade
      // due to needing to hold more hashes in storage to afford the next hash upgrade.

      let current_hash = ns.formulas.hacknetServers.hashGainRate(server.level  , 0, server.ram  , server.cores  , hacknet_node_money_mult)
      let level_gain   = ns.formulas.hacknetServers.hashGainRate(server.level+1, 0, server.ram  , server.cores  , hacknet_node_money_mult) - current_hash
      let ram_gain     = ns.formulas.hacknetServers.hashGainRate(server.level  , 0, server.ram*2, server.cores  , hacknet_node_money_mult) - current_hash
      let core_gain    = ns.formulas.hacknetServers.hashGainRate(server.level  , 0, server.ram  , server.cores+1, hacknet_node_money_mult) - current_hash

      if (((level_gain * ONE_HASH_WORTH) / ns.hacknet.getLevelUpgradeCost(server_id)) > gain_over_cost) {
        gain = level_gain
        gain_over_cost = (level_gain * ONE_HASH_WORTH) / ns.hacknet.getLevelUpgradeCost(server_id)
        gain_cost = ns.hacknet.getLevelUpgradeCost(server_id)
        best_choice = "L"
        best_choice_idx = server_id
      }
      if (((ram_gain * ONE_HASH_WORTH) / ns.hacknet.getRamUpgradeCost(server_id)) > gain_over_cost) {
        gain = ram_gain
        gain_over_cost = (ram_gain * ONE_HASH_WORTH) / ns.hacknet.getRamUpgradeCost(server_id)
        gain_cost = ns.hacknet.getRamUpgradeCost(server_id)
        best_choice = "R"
        best_choice_idx = server_id
      }
      if (((core_gain * ONE_HASH_WORTH) / ns.hacknet.getCoreUpgradeCost(server_id)) > gain_over_cost) {
        gain = core_gain
        gain_over_cost = (core_gain * ONE_HASH_WORTH) / ns.hacknet.getCoreUpgradeCost(server_id)
        gain_cost = ns.hacknet.getCoreUpgradeCost(server_id)
        best_choice = "C"
        best_choice_idx = server_id
      }
      if (ns.hacknet.getCacheUpgradeCost(server_id) < (0.01 * ns.getServerMoneyAvailable("home"))) {
        gain = 0
        gain_over_cost = 1
        gain_cost = ns.hacknet.getCacheUpgradeCost(server_id)
        best_choice = "H"
        best_choice_idx = server_id
      }
      server_id++
    }
    if (best_choice === "N") {
      gain_cost = ns.hacknet.getPurchaseNodeCost()
      //gain = ns.formulas.hacknetServers.hashGainRate(1,0,1,1,hacknet_node_money_mult)
    }

    // The inflection point is decided when the time it takes to
    // earn the money for the next upgrade is longer than the
    // time we would save by buying that upgrade.
    let focus_upgrades = false

    let ttb_upg = gain_cost / (recent_script_income + recent_hacknet_income)
    let new_diff_to_1_ttb  = diff_to_1_cost  / ((total_production / ONE_HASH_WORTH) + gain) 
    let new_mon_to_e13_ttb = mon_to_e13_cost / ((total_production / ONE_HASH_WORTH) + gain) 
    let ttb_w_upg = new_diff_to_1_ttb + new_mon_to_e13_ttb
    let ttb_wo_upg = diff_to_1_ttb + mon_to_e13_ttb

    focus_upgrades = ttb_wo_upg < (ttb_w_upg + ttb_upg)


    // If we are not focusing on spending hashses on server upgrades
    // we instead focus on spending hashes on money to pump into
    // server upgrades.
    if (
        !focus_upgrades
    ) {
      if (ns.hacknet.numHashes() > 4) {
        ns.hacknet.spendHashes("Sell for Money",undefined,Math.floor(ns.hacknet.numHashes()/4))
      }

      // Best Return on Investment Action chosen. Now Do it if we have the money and aren't just calculating the best action.
      // TODO: Perform the purchase only if the cost is less than a percentage of our current income stream?
      //       Though that does mean we hit a cap a fair bit earlier and can't *grind* our way to higher incomes from hacknets.
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
          case "H":
            ns.hacknet.upgradeCache(best_choice_idx)
            break
        }
        prev_choice = best_choice
        prev_choice_idx = best_choice_idx
        prev_gain_ratio = gain_over_cost
      }
    }
    else if (
      (ns.getServerMoneyAvailable("home") > (cost_mod * gain_cost))
    &&  !calc_only
    ) {
      // ns.print("Here 2")
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
        case "H":
          ns.hacknet.upgradeCache(best_choice_idx)
          break
      }
      best_choice = "+" + best_choice
      prev_choice = best_choice
      prev_choice_idx = best_choice_idx
      prev_gain_ratio = gain_over_cost
    } // If we cannot purchase server upgrades due to a lack of hash capacity, upgrade the capacity
    else if (
        ns.hacknet.hashCost("Reduce Minimum Security", 1) > ns.hacknet.hashCapacity()
    ||  ns.hacknet.hashCost("Increase Maximum Money", 1) > ns.hacknet.hashCapacity()
    ) {
      // ns.print("Here 3")
      let minimum_cache_cost = Infinity
      let minimum_cache_cost_idx = -1
      best_choice = "H"
      best_choice_idx = "-1"

      for (let server in hacknet_stat_array) {
        if (ns.hacknet.getCacheUpgradeCost(server) < minimum_cache_cost) {
          minimum_cache_cost = ns.hacknet.getCacheUpgradeCost(server)
          minimum_cache_cost_idx = server
          best_choice_idx = server
        }
      }
      if (ns.hacknet.numHashes() > 4) {
        ns.hacknet.spendHashes("Sell for Money",undefined,Math.floor(ns.hacknet.numHashes()/4))
      }
      if (ns.getServerMoneyAvailable("home") > (cost_mod * minimum_cache_cost) && minimum_cache_cost_idx != -1) {
        ns.hacknet.upgradeCache(minimum_cache_cost_idx)
        prev_choice = "H"
        prev_choice_idx = minimum_cache_cost_idx
        prev_gain_ratio = 0
      }
    }// If we are making more money through hacknet than hacking scripts, improve our hacking scripts.
    else if (
        focus_upgrades
    &&  !(hash_server_target === undefined)
    ) {
      // ns.print("Here 4")
      best_choice = "U"
      best_choice_idx = -1
      if (
          diff_to_1_upgs > 0
      &&  ns.hacknet.hashCost("Reduce Minimum Security", 1) <= ns.hacknet.numHashes()
      ) {
        prev_choice = "S"
        prev_choice_idx = -1
        ns.hacknet.spendHashes("Reduce Minimum Security", hash_server_target, 1)
      }

      if (
          mon_to_e13_upgs > 0
      &&  ns.hacknet.hashCost("Increase Maximum Money", 1) <= ns.hacknet.numHashes()
      ) {
        prev_choice = "M"
        prev_choice_idx = -1
        ns.hacknet.spendHashes("Increase Maximum Money", hash_server_target, 1)
      }
    }
    else {
      ns.print("You fucked up. Focus: " + focus_upgrades)
    }

    ns.print(
        "Previous Action: " + prev_choice.padStart(2) + " on " + prev_choice_idx.toString().padStart(2) + " with RoI Time: " + ns.formatNumber(1/prev_gain_ratio).padStart(8)
      + " | Hash Upgrade Target : " + hash_server_target + "\n"
      + "Planned Action : " + best_choice.padStart(2) + " on " + best_choice_idx.toString().padStart(2) + " with RoI Time: " + ns.formatNumber(1/gain_over_cost).padStart(8)
      + " | Min Diff Upg Needed : " + diff_to_1_upgs.toString().padStart(5)
      + " Time To Buy: " + ns.formatNumber(diff_to_1_ttb).padStart(8) + "S\n"
      + "Cost of Action : " + ns.formatNumber(gain_cost).padStart(9) + " RoI Time Thr: " + ns.formatNumber(1/threshold).padStart(8)
      + " | Max Money Upg Needed: " + mon_to_e13_upgs.toString().padStart(5)
      + " Time To Buy: " + ns.formatNumber(mon_to_e13_ttb).padStart(8) + "S\n"
      + "Hashes We Have: " + ns.formatNumber(ns.hacknet.numHashes()).padStart(8) //+ " | Hashes We Store: " + ns.hacknet.hashCapacity()
      + " | TTB W/O Upg:  " + ttb_wo_upg.toFixed(0)  + "S | TTB W/ Upg + TTB Upg: " + ttb_w_upg.toFixed(0) + "S + " + ttb_upg.toFixed(0) + "S"
    )
    let table = format_stats(ns, hacknet_stat_array)
    ns.print(table)
    await ns.sleep(100)
  }
}