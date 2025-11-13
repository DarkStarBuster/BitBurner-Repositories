import { scan_for_servers } from "/scripts/util/scan_for_servers"

// CONSTS
const HACK_BATCH_LIMIT = 30
const HACK_BATCH_TIME_LIMIT = 2000

/** @param {import("@ns").NS} ns */
function disable_logging(ns) {

  ns.disableLog("ALL")

}

/** @param {import("@ns").NS} ns */
export async function main(ns) {

  disable_logging(ns)

  let value = 0
  let servers = scan_for_servers(ns,{"is_rooted":true,"has_money":true})
  servers.sort(
    function(a,b){
      return (ns.hackAnalyze(b) * ns.hackAnalyzeChance(b) * ns.getServerMaxMoney(b) * Math.min(Math.floor(ns.getWeakenTime(b) / HACK_BATCH_TIME_LIMIT), HACK_BATCH_LIMIT))
      - (ns.hackAnalyze(a) * ns.hackAnalyzeChance(a) * ns.getServerMaxMoney(a) * Math.min(Math.floor(ns.getWeakenTime(a) / HACK_BATCH_TIME_LIMIT), HACK_BATCH_LIMIT))
    }
  )

  ns.ui.openTail()
  ns.ui.resizeTail(1400,640)
  ns.ui.moveTail(100,100)

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

      let hack_batches_needed = Math.max(Math.floor(ns.getWeakenTime(server) / HACK_BATCH_TIME_LIMIT),1)
      let money_produced = ns.hackAnalyze(server) * ns.getServerMaxMoney(server) * Math.min(hack_batches_needed, HACK_BATCH_LIMIT)

      table_strings[row % table_length] = 
        table_strings[row % table_length] + "| "
      + server.padEnd(max_server_length) + "[" + ns.getServerNumPortsRequired(server) + "]: "
      + ns.formatPercent(HACK_BATCH_LIMIT / Math.max(hack_batches_needed,HACK_BATCH_LIMIT),2).padStart(7) + "[" + hack_batches_needed.toString().padStart(4) + "]/ "
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
        return (ns.hackAnalyze(b) * ns.hackAnalyzeChance(b) * ns.getServerMaxMoney(b) * Math.min(Math.floor(ns.getWeakenTime(b) / HACK_BATCH_TIME_LIMIT), HACK_BATCH_LIMIT))
        - (ns.hackAnalyze(a) * ns.hackAnalyzeChance(a) * ns.getServerMaxMoney(a) * Math.min(Math.floor(ns.getWeakenTime(a) / HACK_BATCH_TIME_LIMIT), HACK_BATCH_LIMIT))
      }
    )
  }

}