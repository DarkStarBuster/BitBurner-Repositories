import { scan_for_servers } from "/src/development/scripts/util/scan_for_servers"
import { PORT_IDS } from "/src/development/scripts/util/constant_utilities"

class ProcessInfo {
  /** @type {number} */
  last_ui_update = NaN;
  /** @type {import("@ns").NodeStats[]} */
  stats_array;
  /** @type {boolean} */
  calc_only;
  /** @type {number} */
  threshold;
  /** @type {number} */
  cost_mod;
  /** @type {string} */
  current_hash_server_target;
  /** @type {number} */
  current_hash_server_time;
  /** @type {import("@ns").Multipliers} */
  player_mults;
  /** @type {number} */
  hacknet_node_money_mult;
  /** @type {number} */
  hacking_script_money_mult;
  /** @type {string} */
  prev_choice;
  /** @type {number} */
  prev_choice_idx;
  /** @type {number} */
  prev_gain_ratio;
  /** @type {string} */
  best_choice;
  /** @type {number} */
  best_choice_idx;
  /** @type {number} */
  gain_cost;
  /** @type {number} */
  gain_over_cost;
  /** @type {number} */
  diff_to_1_upgs;
  /** @type {number} */
  diff_to_1_ttb;
  /** @type {number} */
  mon_to_e13_upgs;
  /** @type {number} */
  mon_to_e13_ttb;
  /** @type {number} */
  ttb_wo_upg;
  /** @type {number} */
  ttb_w_upg;
  /** @type {number} */
  ttb_upg;

  constructor() {
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {ProcessInfo} process_info 
 */
function update_TUI(ns, process_info) {
  let value = format_stats(ns, process_info.stats_array)

  let tail_properties = ns.self().tailProperties
  if (!(tail_properties === null)) {

    let width_per_node = 166
    let height_for_title_bar = 33
    let height_per_line = 24
    let height_per_row = height_per_line * 6
    let tail_width = 996
    let tail_height = 0
    //tail_width  = width_per_node * ((node_cnt > 5) ? 6 : (node_cnt + 1))
    tail_height = height_for_title_bar + (height_per_row * value.rows) + (height_per_line * (6))
    if (value.rows > 1) {
      tail_height = tail_height + (height_per_line * (value.rows - 1))
    }
    
    if (!(tail_properties.height === tail_height) || !(tail_properties.width === tail_width)) {
      ns.ui.resizeTail(tail_width, tail_height)
    }
  }

  ns.print(`Previous Action: ${process_info.prev_choice.padStart(2)} on ${process_info.prev_choice_idx.toString().padStart(2)} with RoI Time: ${ns.formatNumber(1/process_info.prev_gain_ratio).padStart(8)} | Hash Upgrade Target: ${process_info.current_hash_server_target}`)
  ns.print(`Planned Action : ${process_info.best_choice.padStart(2)} on ${process_info.best_choice_idx.toString().padStart(2)} with RoI Time: ${ns.formatNumber(1/process_info.gain_over_cost).padStart(8)} | Min Diff Upg Needed: ${process_info.diff_to_1_upgs.toString().padStart(5)} Time to Buy: ${ns.formatNumber(process_info.diff_to_1_ttb).padStart(8)}S`)
  ns.print(`Cost of Action : ${ns.formatNumber(process_info.gain_cost).padStart(9)} RoI Time Thr: ${ns.formatNumber(1/process_info.threshold).padStart(8)} | Max Money Upg Needed: ${process_info.mon_to_e13_upgs.toString().padStart(5)} Time to Buy: ${ns.formatNumber(process_info.mon_to_e13_ttb).padStart(8)}S`)
  ns.print(`Hashes We Have : ${ns.formatNumber(ns.hacknet.numHashes()).padStart(8)} | TTB W/O Upg: ${process_info.ttb_wo_upg.toFixed(0)}S | TTB W/ Upg + TTB Upg: ${process_info.ttb_w_upg.toFixed(0)}S + ${process_info.ttb_upg.toFixed(0)}S`)
  ns.print(value.table)
}

/**
 * @param {import("@ns").NS} ns
 * @param {import("@ns").NodeStats[]} stats_array 
 * @returns {{table: string, rows: number}}
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
  let row_cnt = Math.floor((node_cnt-1)/ row_length) + 1

  return {table: table_output, rows: row_cnt}
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

/**
 *  
 * @param {import("@ns").NS} ns 
 * @param {number} index 
 * @param {import("@ns").NetscriptPort} update_handler
 */
async function send_server_update(ns, index, update_handler) {
  while(
    !update_handler.tryWrite(
      JSON.stringify(
        {
          "action": "update_info"
         ,"target": "hacknet-server-" + index
        }
      )
    )
  ) {
    await ns.sleep(4)
  }
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  ns.disableLog("ALL")

  ns.ui.setTailTitle("Manage Hacknet V4.0 - PID: " + ns.pid)

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

  let process_info = new ProcessInfo()

  let control_params = JSON.parse(CONTROL_PARAMETERS.peek())
  let bitnode_mults = JSON.parse(BITNODE_MULTS_HANDLER.peek())

  process_info.last_ui_update = performance.now()
  process_info.calc_only                  = control_params.hacknet.calc_only
  process_info.threshold                  = control_params.hacknet.threshold
  process_info.cost_mod                   = control_params.hacknet.cost_mod
  process_info.current_hash_server_target = control_params.hacknet.hash_target
  process_info.current_hash_server_time   = control_params.hacknet.hash_time
  process_info.player_mults               = ns.getPlayer().mults
  process_info.hacknet_node_money_mult    = bitnode_mults["HacknetNodeMoney"] * process_info.player_mults.hacknet_node_money
  process_info.hacking_script_money_mult  = bitnode_mults["ScriptHackMoney"] * process_info.player_mults.hacking_money

  process_info.prev_choice = " "
  process_info.prev_choice_idx = 0
  process_info.prev_gain_ratio = 0
  process_info.best_choice = " "
  process_info.best_choice_idx = 0
  process_info.gain_cost = 0
  process_info.gain_over_cost = 0
  
  while (true) {
    ns.clearLog()
    while (CONTROL_PARAMETERS.empty()) {
      await ns.sleep(4)
    }
    control_params = JSON.parse(CONTROL_PARAMETERS.peek())
    process_info.calc_only = control_params.hacknet.calc_only
    process_info.threshold = control_params.hacknet.threshold
    process_info.cost_mod  = control_params.hacknet.cost_mod
    process_info.current_hash_server_target = control_params.hacknet.hash_target
    process_info.current_hash_server_time   = control_params.hacknet.hash_time

    process_info.stats_array = []
    /**
     * Always the $ value of our Hacknet Production
     */
    let total_production = 0
    let max_level = 1
    let max_ram = 1
    let max_cores = 1
    if (ns.hacknet.numNodes() > 0) {
      for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        process_info.stats_array.push(ns.hacknet.getNodeStats(i))
        total_production += process_info.stats_array[i].production
        max_level = (max_level < process_info.stats_array[i].level) ? process_info.stats_array[i].level : max_level
        max_ram   = (max_ram   < process_info.stats_array[i].ram  ) ? process_info.stats_array[i].ram   : max_ram
        max_cores = (max_cores < process_info.stats_array[i].cores) ? process_info.stats_array[i].cores : max_cores
      }
      if (!(process_info.stats_array[0].cache === undefined)) {
        // Hashes are generated
        total_production = total_production * ONE_HASH_WORTH
      }
    }

    let recent_script_income  = ns.getTotalScriptIncome()[0] // 0 is $/s of active scripts, 1 is $/s of scripts run since last installing Augs.
    let recent_hacknet_income = total_production

    let hash_server_target = decide_target_of_hashes(ns)
    let server_obj = ns.getServer(hash_server_target)
    process_info.diff_to_1_upgs  = Math.ceil(Math.log(1/server_obj.minDifficulty) / Math.log(0.98))
    process_info.mon_to_e13_upgs = Math.ceil(Math.log(1e13/server_obj.moneyMax) / Math.log(1.02))

    let diff_to_1_cost  = ns.hacknet.hashCost("Reduce Minimum Security", process_info.diff_to_1_upgs)
    let mon_to_e13_cost = ns.hacknet.hashCost("Increase Maximum Money", process_info.mon_to_e13_upgs)

    process_info.diff_to_1_ttb  = Infinity
    process_info.mon_to_e13_ttb = Infinity
    if (total_production > 0) {
      process_info.diff_to_1_ttb  =  diff_to_1_cost  / (total_production / ONE_HASH_WORTH)
      process_info.mon_to_e13_ttb =  mon_to_e13_cost / (total_production / ONE_HASH_WORTH)
    }
    
    if (
          (hash_server_target != process_info.current_hash_server_target)
      ||  (total_production == 0 ? isFinite(process_info.current_hash_server_time) : ((process_info.diff_to_1_ttb + process_info.mon_to_e13_ttb) != process_info.current_hash_server_time))
    ) {
      while(
        !UPDATE_HANDLER.tryWrite(
          JSON.stringify(
            {
              "action": "update_hash_target"
             ,"target": hash_server_target
             ,"time"  : (total_production == 0 ? Infinity : (process_info.diff_to_1_ttb + process_info.mon_to_e13_ttb))
            }
          )
        )
      ) {
        await ns.sleep(4)
      }
    }

    process_info.best_choice = "N"
    process_info.best_choice_idx = -1
    //let gain = gain_per_level(ns, hacknet_node_money_mult)
    let gain = ns.formulas.hacknetServers.hashGainRate(1,0,1,1,process_info.hacknet_node_money_mult)
    process_info.gain_cost = ns.hacknet.getPurchaseNodeCost()
    if (ns.hacknet.numNodes() > 0) {
      gain = (total_production / ONE_HASH_WORTH) / ns.hacknet.numNodes()
      process_info.gain_cost = ns.hacknet.getPurchaseNodeCost()
                + ns.formulas.hacknetServers.levelUpgradeCost(1, max_level - 1, process_info.player_mults.hacknet_node_level_cost)
                + ns.formulas.hacknetServers.ramUpgradeCost(1,(Math.log(max_ram)/Math.log(2)), process_info.player_mults.hacknet_node_ram_cost)
                + ns.formulas.hacknetServers.coreUpgradeCost(1,max_cores - 1, process_info.player_mults.hacknet_node_core_cost)
    }  
    process_info.gain_over_cost = (gain * ONE_HASH_WORTH) / process_info.gain_cost

    let server_id = 0
    for (let server of process_info.stats_array) {
      // TODO: We need to decide when to automatically buy Cache upgrades other than just when we need to upgrade
      // due to needing to hold more hashes in storage to afford the next hash upgrade.

      let current_hash = ns.formulas.hacknetServers.hashGainRate(server.level  , 0, server.ram  , server.cores  , process_info.hacknet_node_money_mult)
      let level_gain   = ns.formulas.hacknetServers.hashGainRate(server.level+1, 0, server.ram  , server.cores  , process_info.hacknet_node_money_mult) - current_hash
      let ram_gain     = ns.formulas.hacknetServers.hashGainRate(server.level  , 0, server.ram*2, server.cores  , process_info.hacknet_node_money_mult) - current_hash
      let core_gain    = ns.formulas.hacknetServers.hashGainRate(server.level  , 0, server.ram  , server.cores+1, process_info.hacknet_node_money_mult) - current_hash

      if (((level_gain * ONE_HASH_WORTH) / ns.hacknet.getLevelUpgradeCost(server_id)) > process_info.gain_over_cost) {
        gain = level_gain
        process_info.gain_over_cost = (level_gain * ONE_HASH_WORTH) / ns.hacknet.getLevelUpgradeCost(server_id)
        process_info.gain_cost = ns.hacknet.getLevelUpgradeCost(server_id)
        process_info.best_choice = "L"
        process_info.best_choice_idx = server_id
      }
      if (((ram_gain * ONE_HASH_WORTH) / ns.hacknet.getRamUpgradeCost(server_id)) > process_info.gain_over_cost) {
        gain = ram_gain
        process_info.gain_over_cost = (ram_gain * ONE_HASH_WORTH) / ns.hacknet.getRamUpgradeCost(server_id)
        process_info.gain_cost = ns.hacknet.getRamUpgradeCost(server_id)
        process_info.best_choice = "R"
        process_info.best_choice_idx = server_id
      }
      if (((core_gain * ONE_HASH_WORTH) / ns.hacknet.getCoreUpgradeCost(server_id)) > process_info.gain_over_cost) {
        gain = core_gain
        process_info.gain_over_cost = (core_gain * ONE_HASH_WORTH) / ns.hacknet.getCoreUpgradeCost(server_id)
        process_info.gain_cost = ns.hacknet.getCoreUpgradeCost(server_id)
        process_info.best_choice = "C"
        process_info.best_choice_idx = server_id
      }
      if (ns.hacknet.getCacheUpgradeCost(server_id) < (0.01 * ns.getServerMoneyAvailable("home"))) {
        gain = 0
        process_info.gain_over_cost = 1
        process_info.gain_cost = ns.hacknet.getCacheUpgradeCost(server_id)
        process_info.best_choice = "H"
        process_info.best_choice_idx = server_id
      }
      server_id++
    }
    if (process_info.best_choice === "N") {
      process_info.gain_cost = ns.hacknet.getPurchaseNodeCost()
      //gain = ns.formulas.hacknetServers.hashGainRate(1,0,1,1,hacknet_node_money_mult)
    }

    // The inflection point is decided when the time it takes to
    // earn the money for the next upgrade is longer than the
    // time we would save by buying that upgrade.
    let focus_upgrades = false

    process_info.ttb_upg = process_info.gain_cost / (recent_script_income + recent_hacknet_income)
    let new_diff_to_1_ttb  = diff_to_1_cost  / ((total_production / ONE_HASH_WORTH) + gain) 
    let new_mon_to_e13_ttb = mon_to_e13_cost / ((total_production / ONE_HASH_WORTH) + gain) 
    process_info.ttb_w_upg = new_diff_to_1_ttb + new_mon_to_e13_ttb
    process_info.ttb_wo_upg = process_info.diff_to_1_ttb + process_info.mon_to_e13_ttb

    focus_upgrades = process_info.ttb_wo_upg < (process_info.ttb_w_upg + process_info.ttb_upg)


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
          (ns.getServerMoneyAvailable("home") > (process_info.cost_mod * process_info.gain_cost))
      &&  !process_info.calc_only
      ) {
        //ns.print("Performing Action")
        switch (process_info.best_choice) {
          case "N":
            let index = ns.hacknet.purchaseNode()
            if (index >= 0) {
              await send_server_update(ns, index, UPDATE_HANDLER)
            }
            break
          case "L":
            ns.hacknet.upgradeLevel(process_info.best_choice_idx)
            break
          case "R":
            ns.hacknet.upgradeRam(process_info.best_choice_idx)
            await send_server_update(ns, process_info.best_choice_idx, UPDATE_HANDLER)
            break
          case "C":
            ns.hacknet.upgradeCore(process_info.best_choice_idx)
            break
          case "H":
            ns.hacknet.upgradeCache(process_info.best_choice_idx)
            break
        }
        process_info.prev_choice = process_info.best_choice
        process_info.prev_choice_idx = process_info.best_choice_idx
        process_info.prev_gain_ratio = process_info.gain_over_cost
      }
    }
    else if (
      (ns.getServerMoneyAvailable("home") > (process_info.cost_mod * process_info.gain_cost))
    &&  !process_info.calc_only
    ) {
      // ns.print("Here 2")
      switch (process_info.best_choice) {
        case "N":
          let index = ns.hacknet.purchaseNode()
          if (index >= 0) {
            await send_server_update(ns, index, UPDATE_HANDLER)
          }
          break
        case "L":
          ns.hacknet.upgradeLevel(process_info.best_choice_idx)
          break
        case "R":
          ns.hacknet.upgradeRam(process_info.best_choice_idx)
          await send_server_update(ns, process_info.best_choice_idx, UPDATE_HANDLER)
          break
        case "C":
          ns.hacknet.upgradeCore(process_info.best_choice_idx)
          break
        case "H":
          ns.hacknet.upgradeCache(process_info.best_choice_idx)
          break
      }
      process_info.best_choice = "+" + process_info.best_choice
      process_info.prev_choice = process_info.best_choice
      process_info.prev_choice_idx = process_info.best_choice_idx
      process_info.prev_gain_ratio = process_info.gain_over_cost
    } // If we cannot purchase server upgrades due to a lack of hash capacity, upgrade the capacity
    else if (
        ns.hacknet.hashCost("Reduce Minimum Security", 1) > ns.hacknet.hashCapacity()
    ||  ns.hacknet.hashCost("Increase Maximum Money", 1) > ns.hacknet.hashCapacity()
    ) {
      // ns.print("Here 3")
      let minimum_cache_cost = Infinity
      let minimum_cache_cost_idx = -1
      process_info.best_choice = "H"
      process_info.best_choice_idx = "-1"

      for (let server in hacknet_stat_array) {
        if (ns.hacknet.getCacheUpgradeCost(server) < minimum_cache_cost) {
          minimum_cache_cost = ns.hacknet.getCacheUpgradeCost(server)
          minimum_cache_cost_idx = server
          process_info.best_choice_idx = server
        }
      }
      if (ns.hacknet.numHashes() > 4) {
        ns.hacknet.spendHashes("Sell for Money",undefined,Math.floor(ns.hacknet.numHashes()/4))
      }
      if (ns.getServerMoneyAvailable("home") > (cost_mod * minimum_cache_cost) && minimum_cache_cost_idx != -1) {
        ns.hacknet.upgradeCache(minimum_cache_cost_idx)
        process_info.prev_choice = "H"
        process_info.prev_choice_idx = minimum_cache_cost_idx
        process_info.prev_gain_ratio = 0
      }
    }// If we are making more money through hacknet than hacking scripts, improve our hacking scripts.
    else if (
        focus_upgrades
    &&  !(hash_server_target === undefined)
    ) {
      // ns.print("Here 4")
      process_info.best_choice = "U"
      process_info.best_choice_idx = -1
      if (
          process_info.diff_to_1_upgs > 0
      &&  ns.hacknet.hashCost("Reduce Minimum Security", 1) <= ns.hacknet.numHashes()
      ) {
        process_info.prev_choice = "S"
        process_info.prev_choice_idx = -1
        ns.hacknet.spendHashes("Reduce Minimum Security", hash_server_target, 1)
      }

      if (
          process_info.mon_to_e13_upgs > 0
      &&  ns.hacknet.hashCost("Increase Maximum Money", 1) <= ns.hacknet.numHashes()
      ) {
        process_info.prev_choice = "M"
        process_info.prev_choice_idx = -1
        ns.hacknet.spendHashes("Increase Maximum Money", hash_server_target, 1)
      }
    }
    else {
      ns.print("You fucked up. Focus: " + focus_upgrades)
    }

    update_TUI(ns, process_info)
    await ns.sleep(100)
  }
}