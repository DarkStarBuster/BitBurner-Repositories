import { PORT_IDS } from "./util/dynamic/manage_ports"
import { ScanFilter, request_scan } from "/src/scripts/util/dynamic/manage_server_scanning"

class ProcessInfo {

  constructor() {}
}

/** @param {import("@ns").NS} ns */
function init(ns) {
  ns.disableLog("ALL")
  ns.ui.setTailTitle("Manage Rooting V1.0 - PID: " + ns.pid)
}

/**
 * @param {import("@ns").NS} ns 
 * @param {string} server 
 */
function transfer_files(ns, server) {
  if (!ns.fileExists("/scripts/util/dynamic/grow_v3.js"               , server)) {ns.scp("/scripts/util/dynamic/grow_v3.js"               , server)}
  if (!ns.fileExists("/scripts/util/dynamic/hack_v3.js"               , server)) {ns.scp("/scripts/util/dynamic/hack_v3.js"               , server)}
  if (!ns.fileExists("/scripts/util/dynamic/manage_ports.js"          , server)) {ns.scp("/scripts/util/dynamic/manage_ports.js"          , server)}
  if (!ns.fileExists("/scripts/util/dynamic/manage_server_scanning.js", server)) {ns.scp("/scripts/util/dynamic/manage_server_scanning.js", server)}
  if (!ns.fileExists("/scripts/util/dynamic/pid_provider.js"          , server)) {ns.scp("/scripts/util/dynamic/pid_provider.js"          , server)}
  if (!ns.fileExists("/scripts/util/dynamic/share.js"                 , server)) {ns.scp("/scripts/util/dynamic/share.js"                 , server)}
  if (!ns.fileExists("/scripts/util/dynamic/weaken_for_exp.js"        , server)) {ns.scp("/scripts/util/dynamic/weaken_for_exp.js"        , server)}
  if (!ns.fileExists("/scripts/util/dynamic/weaken_v3.js"             , server)) {ns.scp("/scripts/util/dynamic/weaken_v3.js"             , server)}

  if (!ns.fileExists("/scripts/util/static/file_management.js"        , server)) {ns.scp("/scripts/util/static/file_management.js"        , server)}

  if (!ns.fileExists("/scripts/util/constant_utilities.js"            , server)) {ns.scp("/scripts/util/constant_utilities.js"            , server)}
  if (!ns.fileExists("/scripts/util/ram_management.js"                , server)) {ns.scp("/scripts/util/ram_management.js"                , server)}
  if (!ns.fileExists("/scripts/util/rounding.js"                      , server)) {ns.scp("/scripts/util/rounding.js"                      , server)}
  
  if (!ns.fileExists("/scripts/manage_server_hack_v3.js"              , server)) {ns.scp("/scripts/manage_server_hack_v3.js"              , server)}
  if (!ns.fileExists("/scripts/manage_server_prep_v3.js"              , server)) {ns.scp("/scripts/manage_server_prep_v3.js"              , server)}
  if (!ns.fileExists("/scripts/solve_cct.js"                          , server)) {ns.scp("/scripts/solve_cct.js"                          , server)}  
}

/** @param {import("@ns").NS} ns */
async function update_servers(ns) {
  let filter = new ScanFilter()
  filter.is_rooted = true
  let servers = await request_scan(ns, filter)
  for (let server of servers) {
    transfer_files(ns, server)
  }
  return Promise.resolve()
}

/** @param {import("@ns").NS} ns */
async function do_roots(ns, update_handler) {
  let hack_dictionary = {
    ssh : ns.fileExists("BruteSSH.exe")
   ,ftp : ns.fileExists("FTPCrack.exe")
   ,smtp: ns.fileExists("relaySMTP.exe")
   ,http: ns.fileExists("HTTPWorm.exe")
   ,sql : ns.fileExists("SQLInject.exe")
  }

  let filter = new ScanFilter()
  filter.is_rooted = false
  filter.is_rootable = true
  filter.is_hackable = true

  let servers = await request_scan(ns, filter)
  for (let server of servers) {
    // Open Ports
    for (let hack_type in hack_dictionary){
      if(hack_dictionary[hack_type]){
        switch (hack_type){
          case "ssh":
            ns.brutessh(server)
            break
          case "ftp":
            ns.ftpcrack(server)
            break
          case "smtp":
            ns.relaysmtp(server)
            break
          case "http":
            ns.httpworm(server)
            break
          case "sql":
            ns.sqlinject(server)
            break
        }
      }
    }

    // Perform Root
    ns.nuke(server)
    ns.toast(`Successfully Rooted ${server}`, "success", 5000)
    
    // Provoke update of Server Info PORT
    let update = {
      action: "update_info"
      ,target: server
    }      
    while(!update_handler.tryWrite(JSON.stringify(update))) {
      await ns.sleep(4)
    }

    // Transfer all files to the new server
    transfer_files(ns, server)
  }

  return Promise.resolve()
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const UPDATE_HANDLER = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)

  
  init(ns)

  // // Sleep for half a second before starting the loop
  // await ns.sleep(4)

  let loop_count = 0

  await update_servers(ns)

  while (true) {

    if (loop_count >= 120) {
      loop_count = 0
    }

    if (loop_count = 30) {
      await do_roots(ns, UPDATE_HANDLER)
    }

    if (loop_count = 90) {
      await update_servers(ns)
    }

    // Sleep for half a second before restarting the program loop
    await ns.sleep(200)
    loop_count += 1
  }
}