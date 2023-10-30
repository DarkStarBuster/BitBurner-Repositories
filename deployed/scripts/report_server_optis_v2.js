import { scan_for_servers } from "/scripts/util/scan_for_servers"

// CONSTS
const HACK_BATCH_LIMIT = 30
const HACK_BATCH_TIME_LIMIT = 2000

/** @param {NS} ns */
function disable_logging(ns) {

  ns.disableLog("ALL")

}

/** @param {import("../../.").NS} ns */
export async function main(ns) {
  const CONTROL_PARAMETERS    = ns.getPortHandle(1)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(2)

  while (
      CONTROL_PARAMETERS.empty()
  ||  BITNODE_MULTS_HANDLER.empty()
  ) {
    await ns.sleep(50)
  }

  let control_params = JSON.parse(CONTROL_PARAMETERS.peek())
  let bitnode_mults = JSON.parse(BITNODE_MULTS_HANDLER.peek())

  disable_logging(ns)

  let value = 0
  let servers = scan_for_servers(ns,{"is_rooted":true,"has_money":true})
  servers.sort(
    // function(a,b){
    //   let player = ns.getPlayer()
    //   let server_a = ns.getServer(a)
    //   let server_b = ns.getServer(b)
    //   server_a.hackDifficulty = server_a.minDifficulty
    //   server_a.moneyAvailable = server_a.moneyMax
    //   server_b.hackDifficulty = server_b.minDifficulty
    //   server_b.moneyAvailable = server_b.moneyMax

    //   let server_a_hack_percent = ns.formulas.hacking.hackPercent(server_a, player)
    //   let server_a_hack_chance  = ns.formulas.hacking.hackChance (server_a, player)
    //   let server_a_weaken_time  = ns.formulas.hacking.weakenTime (server_a, player)
    //   let server_b_hack_percent = ns.formulas.hacking.hackPercent(server_b, player)
    //   let server_b_hack_chance  = ns.formulas.hacking.hackChance (server_b, player)
    //   let server_b_weaken_time  = ns.formulas.hacking.weakenTime (server_b, player)

    //   return (server_b_hack_percent * server_b_hack_chance * server_b.moneyMax)
    //   - (server_a_hack_percent * server_a_hack_chance * server_a.moneyMax)
    // }
    
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

  ns.tail()
  ns.resizeTail(1550,640)
  ns.moveTail(300,100)

  while(true) {

    // Holds the array of strings for the table
    let table_strings = [""]
    // Number of rows in the table
    let table_length = 24

    for (let i = 0; i < table_length-1; i++){
      table_strings.push("")
    } 
  
    ns.clearLog()
    ns.print("Hello " + value)
    value += 1

    let max_server_length = 0
    for (let server of servers) {
      if (server.length > max_server_length) {
        max_server_length = server.length
      }
    }

    let row = 0
    for (let server of servers) {
      let server_obj = ns.getServer(server)
      let player = ns.getPlayer()
      server_obj.hackDifficulty = server_obj.minDifficulty
      let server_hack_percent = ns.formulas.hacking.hackPercent(server_obj, player)
      let server_hack_chance  = ns.formulas.hacking.hackChance (server_obj, player)
      let server_weaken_time  = ns.formulas.hacking.weakenTime (server_obj, player)

      let hack_batches_needed = Math.max(Math.floor(server_weaken_time / control_params.hacker.hack_batch_time_interval),1)
      let money_produced = server_hack_percent * server_hack_chance * server_obj.moneyMax

      table_strings[row % table_length] = 
        table_strings[row % table_length] + "| "
      + server.padEnd(max_server_length) + "[" + ns.getServerNumPortsRequired(server) + "]: "
      + "[" + hack_batches_needed.toString().padStart(4) + " @ " + ns.formatPercent(server_hack_chance,2).padStart(7) + "] * "
      + "$" + ns.formatNumber(money_produced).padStart(8)
      + " | " + Math.ceil(Math.log(1/server_obj.minDifficulty) / Math.log(0.98)).toString().padStart(4) 
      + " [ " + ns.hacknet.hashCost("Reduce Minimum Security", Math.ceil(Math.log(1/server_obj.minDifficulty) / Math.log(0.98))).toString().padStart(8) + " ]"
      + " " + Math.ceil(Math.log(1e13/server_obj.moneyMax) / Math.log(1.02)).toString().padStart(4)
      + " [ " + ns.hacknet.hashCost("Increase Maximum Money", Math.ceil(Math.log(1e13/server_obj.moneyMax) / Math.log(1.02))).toString().padStart(8) + " ]"

      //"Reduce Minimum Security","Increase Maximum Money"
      row += 1
    }
    for (let string in table_strings) {
      table_strings[string] = table_strings[string] + "|"
    }

      // hack_batches_needed = Math.floor(ns.getWeakenTime(arg_flags.target) / HACK_BATCH_TIME_LIMIT)
      // ns.tprint(
      //   "Server Manager [" + arg_flags.target
      // + "] now needs " + hack_batches_needed
      // + ". Due to: " + ns.getWeakenTime(arg_flags.target).toFixed(0)
      // + ". % Util: " + ns.formatPercent(HACK_BATCH_LIMIT / Math.max(hack_batches_needed,HACK_BATCH_LIMIT), 2)
      // )

    for (let string of table_strings) {
      ns.print(string)
    }

    await ns.sleep(1000)
    servers = scan_for_servers(ns,{"is_rooted":true,"has_money":true})
    servers.sort(
      // function(a,b){
      //   let player = ns.getPlayer()
      //   let server_a = ns.getServer(a)
      //   let server_b = ns.getServer(b)
      //   server_a.hackDifficulty = server_a.minDifficulty
      //   server_a.moneyAvailable = server_a.moneyMax
      //   server_b.hackDifficulty = server_b.minDifficulty
      //   server_b.moneyAvailable = server_b.moneyMax
  
      //   let server_a_hack_percent = ns.formulas.hacking.hackPercent(server_a, player)
      //   let server_a_hack_chance  = ns.formulas.hacking.hackChance (server_a, player)
      //   let server_a_weaken_time  = ns.formulas.hacking.weakenTime (server_a, player)
      //   let server_b_hack_percent = ns.formulas.hacking.hackPercent(server_b, player)
      //   let server_b_hack_chance  = ns.formulas.hacking.hackChance (server_b, player)
      //   let server_b_weaken_time  = ns.formulas.hacking.weakenTime (server_b, player)
  
      //   return (server_b_hack_percent * server_b_hack_chance * server_b.moneyMax)
      //   - (server_a_hack_percent * server_a_hack_chance * server_a.moneyMax)
      // }
    
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
    await ns.sleep(200)
  }

}