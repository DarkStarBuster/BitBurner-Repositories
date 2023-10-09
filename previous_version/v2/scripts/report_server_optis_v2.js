import { scan_for_servers } from "/scripts/util/scan_for_servers"

// CONSTS
const HACK_BATCH_LIMIT = 30
const HACK_BATCH_TIME_LIMIT = 2000

/** @param {NS} ns */
function disable_logging(ns) {

  ns.disableLog("ALL")

}

/** @param {NS} ns */
export async function main(ns) {

  disable_logging(ns)

  let value = 0
  let servers = scan_for_servers(ns,{"is_rooted":true,"has_money":true})
  servers.sort(
    function(a,b){
      let player = ns.getPlayer()
      let server_a = ns.getServer(a)
      let server_b = ns.getServer(b)
      server_a.hackDifficulty = server_a.minDifficulty
      server_a.moneyAvailable = server_a.moneyMax
      server_b.hackDifficulty = server_b.minDifficulty
      server_b.moneyAvailable = server_b.moneyMax

      let server_a_hack_percent = ns.formulas.hacking.hackPercent(server_a, player)
      let server_a_hack_chance  = ns.formulas.hacking.hackChance (server_a, player)
      let server_a_weaken_time  = ns.formulas.hacking.weakenTime (server_a, player)
      let server_b_hack_percent = ns.formulas.hacking.hackPercent(server_b, player)
      let server_b_hack_chance  = ns.formulas.hacking.hackChance (server_b, player)
      let server_b_weaken_time  = ns.formulas.hacking.weakenTime (server_b, player)

      return (server_b_hack_percent * server_b_hack_chance * server_b.moneyMax)
      - (server_a_hack_percent * server_a_hack_chance * server_a.moneyMax)
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

      let hack_batches_needed = Math.max(Math.floor(server_weaken_time / HACK_BATCH_TIME_LIMIT),1)
      let money_produced = server_hack_percent * server_hack_chance * server_obj.moneyMax

      table_strings[row % table_length] = 
        table_strings[row % table_length] + "| "
      + server.padEnd(max_server_length) + "[" + ns.getServerNumPortsRequired(server) + "]: "
      + "[" + hack_batches_needed.toString().padStart(4) + " @ " + ns.formatPercent(server_hack_chance,2).padStart(7) + "] * "
      + "$" + ns.formatNumber(money_produced).padStart(8)
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
      function(a,b){
        let player = ns.getPlayer()
        let server_a = ns.getServer(a)
        let server_b = ns.getServer(b)
        server_a.hackDifficulty = server_a.minDifficulty
        server_a.moneyAvailable = server_a.moneyMax
        server_b.hackDifficulty = server_b.minDifficulty
        server_b.moneyAvailable = server_b.moneyMax
  
        let server_a_hack_percent = ns.formulas.hacking.hackPercent(server_a, player)
        let server_a_hack_chance  = ns.formulas.hacking.hackChance (server_a, player)
        let server_a_weaken_time  = ns.formulas.hacking.weakenTime (server_a, player)
        let server_b_hack_percent = ns.formulas.hacking.hackPercent(server_b, player)
        let server_b_hack_chance  = ns.formulas.hacking.hackChance (server_b, player)
        let server_b_weaken_time  = ns.formulas.hacking.weakenTime (server_b, player)
  
        return (server_b_hack_percent * server_b_hack_chance * server_b.moneyMax)
        - (server_a_hack_percent * server_a_hack_chance * server_a.moneyMax)
      }
    )
  }

}