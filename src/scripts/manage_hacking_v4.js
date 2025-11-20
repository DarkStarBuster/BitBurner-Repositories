import { PORT_IDS } from "/src/scripts/util/constant_utilities"
import { scan_for_servers } from "/src/scripts/util/scan_for_servers"
import { release_ram, request_ram } from "/src/scripts/util/ram_management"
import { append_to_file, delete_file, rename_file } from "/src/scripts/util/file_management"
import { round_ram_cost } from "/src/scripts/util/rounding"

const LOG_FILENAME = "logs/manage_hacking_curr.txt"
const PRIOR_LOG_FILENAME = "logs/manage_hacking_prior.txt"


const RAM_INFO = {
  //[server] = {
  //  assigned_ram: <number>,
  //  free_ram    : <number>,
  //  processes   : {
  //    [pid]: {
  //      ram_cost: <number>,
  //      filename: <string>,
  //      target  : <string>
  //    },
  //    [pid]: {
  //      ...
  //  }
  //},
  //[server] = {
  // ...
}

/**
 * @param {import("@ns").NS} ns 
 */
function init(ns) {
  disable_logs(ns)
  init_file_log(ns)

  for(let server in RAM_INFO) {
    delete RAM_INFO[server]
  }
}

/** @param {import("@ns").NS} ns */
function disable_logs(ns){
  ns.disableLog("ALL")
  ns.enableLog("exec")
}

/**
 * @param {import("@ns").NS} ns 
 */
function init_file_log(ns){
  if (ns.fileExists(PRIOR_LOG_FILENAME)) {
    delete_file(ns, PRIOR_LOG_FILENAME)
  }
  if (ns.fileExists(LOG_FILENAME)) {
    rename_file(ns, LOG_FILENAME, PRIOR_LOG_FILENAME)
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {string} message 
 */
function log(ns, message) {
  append_to_file(ns, LOG_FILENAME, message + "\n")
}

/**
 * @param {import("@ns").NS} ns
 * @param {number} pid 
 * @param {string} filename
 * @param {string} server
 * @param {string} target
 */
function add_child_process(ns, pid, filename, server, target) {
  if (RAM_INFO[server] === undefined) {
    RAM_INFO[server] = {
      processes : {}
    }
  }
  RAM_INFO[server].processes[pid] = {
    "ram_cost": ns.getScriptRam(filename),
    "filename": filename,
    "target"  : target
  }
}

/**
 * @param {import("@ns").NS} ns
 * @param {string} filename 
 * @returns {boolean}
 */
function child_is_running(ns, filename) {
  let runing = false
  let pid_found
  let server_name
  for (let server in RAM_INFO) {
    for(let pid in RAM_INFO[server].processes) {
      if (RAM_INFO[server].processes[pid].filename == filename) {
        runing = ns.isRunning(pid)
        server_name = server
        pid_found = pid
      }
    }
  }

  if (!(pid_found === undefined)) {
    if (!runing) {
      delete RAM_INFO[server_name].processes[pid_found]
    }
  }

  return runing
}

/**
 * @param {import("@ns").NS} ns - NetScript Environment
 * @param {string} filename - Script to Launch
 * @param {string} server_to_target - Server to target with the script given
 */
async function launch_child(ns, filename, server_to_target) {
  let ram_needed = ns.getScriptRam(filename)
  log(ns, "RAM required for " + filename + " targetting " + server_to_target +" is calculated as " + ram_needed)

  let request_response = await request_ram(ns, ram_needed)
  if (!(request_response.result === "OK")) {
    log(ns, "Did not find free RAM to launch child process: " + filename + " targetting " + server_to_target)
    return Promise.resolve(false)
  }

  let script_args = [
    "--target", server_to_target
  ]
  let pid = ns.exec(filename, request_response.server, {threads: 1, temporary: true},...script_args)
  if (!(pid === 0)) {
    add_child_process(ns, pid, filename, request_response.server, server_to_target)
    return Promise.resolve(true)
  }
  else {
    ns.tprint("ERROR Exec failed to launch child process: " + filename + " targetting " + server_to_target + " on " + request_response.server)
    let release_response = await release_ram(ns, request_response.server, ram_needed)
    if (!(release_response.result === "OK")) {
      ns.tprint("ERROR Failed to launch program RAM was not released")
    }
    return Promise.resolve(false)
  }
}

/**
 * Kills a child process that targets the given target
 * @param {import("@ns").NS} ns NetScript Environment
 * @param {string} childs_target Target of the process we want to kill
 */
async function kill_child(ns, childs_target) {
  let pids_to_kill = {}
  let count = 0
  for (let server in RAM_INFO) {
    for (let pid in RAM_INFO[server].processes) {
      if (RAM_INFO[server].processes[pid].target == childs_target) {
        count += 1
        pids_to_kill[count] = {
          server  : server
         ,pid     : pid
         ,ram_cost: RAM_INFO[server].processes[pid].ram_cost
        }
      }
    }
  }

  for (let num in pids_to_kill) {
    if (ns.isRunning(parseInt(pids_to_kill[num].pid))) {
      ns.kill(parseInt(pids_to_kill[num].pid))
    }
    let response = await release_ram(ns, pids_to_kill[num].server, pids_to_kill[num].ram_cost)
    if (!(response.result === "OK")) {
      ns.tprint("ERROR Killed process RAM was not released.")
    }
    delete RAM_INFO[pids_to_kill[num].server].processes[pids_to_kill[num].pid]
  }

  return Promise.resolve()
}

/** 
 * @param {import("@ns").NS} ns
 * @param {boolean} force_update
 */
async function check_root(ns, force_update) {
  const SERVER_INFO_HANDLER   = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)
  const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)

  let hack_dictionary = {
    "ssh" : ns.fileExists("BruteSSH.exe"),
    "ftp" : ns.fileExists("FTPCrack.exe"),
    "smtp": ns.fileExists("relaySMTP.exe"),
    "http": ns.fileExists("HTTPWorm.exe"),
    "sql" : ns.fileExists("SQLInject.exe"),
  }

  let all_servers = JSON.parse(SERVER_INFO_HANDLER.peek())

  for (let server in all_servers) {
    if (server.includes("pserv")) {
      log(ns, "We do update pservs")
    }
    // Root Unrooted Servers
    if  (
          (     all_servers[server].hack_lvl_req <= ns.getHackingLevel()
            ||  all_servers[server].hack_lvl_req === undefined)
      &&  !all_servers[server].is_rooted
    ) {
      //Open Ports
      let ports_opened = 0
      for (var hack_type in hack_dictionary){
        if(hack_dictionary[hack_type]){
          ports_opened += 1
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
      // Attempt Root
      let newly_rooted = false
      if (
            all_servers[server].num_ports_req <= ports_opened
        &&  !all_servers[server].is_rooted
      ) {
        ns.nuke(server)
        newly_rooted = true
        all_servers[server].is_rooted = true
      }
      // Notify of Successful Root
      if (newly_rooted) {
        ns.toast(`Successfully Rooted ${server}`, "success", 5000)
      }
      // Provoke update of Server Info PORT
      let update = {
        action: "update_info"
        ,target: server
      }      
      while(!UPDATE_HANDLER.tryWrite(JSON.stringify(update))) {
        await ns.sleep(4)
      }
    }
    // Transfer files to rooted severs
    if (all_servers[server].is_rooted) {

      if (!ns.fileExists((IN_DEV ? "/development" : "") + "/scripts/util/constant_utilities.js", server) || force_update) ns.scp((IN_DEV ? "/development" : "") + "/scripts/util/constant_utilities.js", server)
      if (!ns.fileExists((IN_DEV ? "/development" : "") + "/scripts/util/rounding.js"          , server) || force_update) ns.scp((IN_DEV ? "/development" : "") + "/scripts/util/rounding.js"          , server)
      if (!ns.fileExists((IN_DEV ? "/development" : "") + "/scripts/util/port_management.js"   , server) || force_update) ns.scp((IN_DEV ? "/development" : "") + "/scripts/util/port_management.js"   , server)
      if (!ns.fileExists((IN_DEV ? "/development" : "") + "/scripts/util/ram_management.js"    , server) || force_update) ns.scp((IN_DEV ? "/development" : "") + "/scripts/util/ram_management.js"    , server)
      if (!ns.fileExists((IN_DEV ? "/development" : "") + "/scripts/util/file_management.js"   , server) || force_update) ns.scp((IN_DEV ? "/development" : "") + "/scripts/util/file_management.js"    , server)
      if (!ns.fileExists((IN_DEV ? "/development" : "") + "/scripts/util/weaken_v3.js"         , server) || force_update) ns.scp((IN_DEV ? "/development" : "") + "/scripts/util/weaken_v3.js"         , server)
      if (!ns.fileExists((IN_DEV ? "/development" : "") + "/scripts/util/grow_v3.js"           , server) || force_update) ns.scp((IN_DEV ? "/development" : "") + "/scripts/util/grow_v3.js"           , server)
      if (!ns.fileExists((IN_DEV ? "/development" : "") + "/scripts/util/hack_v3.js"           , server) || force_update) ns.scp((IN_DEV ? "/development" : "") + "/scripts/util/hack_v3.js"           , server)
      if (!ns.fileExists((IN_DEV ? "/development" : "") + "/scripts/util/share.js"             , server) || force_update) ns.scp((IN_DEV ? "/development" : "") + "/scripts/util/share.js"             , server)
      if (!ns.fileExists((IN_DEV ? "/development" : "") + "/scripts/util/weaken_for_exp.js"    , server) || force_update) ns.scp((IN_DEV ? "/development" : "") + "/scripts/util/weaken_for_exp.js"    , server)
      if (!ns.fileExists((IN_DEV ? "/development" : "") + "/scripts/manage_server_hack_v3.js"  , server) || force_update) ns.scp((IN_DEV ? "/development" : "") + "/scripts/manage_server_hack_v3.js"  , server)
      if (!ns.fileExists((IN_DEV ? "/development" : "") + "/scripts/manage_server_prep_v3.js"  , server) || force_update) ns.scp((IN_DEV ? "/development" : "") + "/scripts/manage_server_prep_v3.js"  , server)
      if (!ns.fileExists((IN_DEV ? "/development" : "") + "/scripts/solve_cct.js"              , server) || force_update) ns.scp((IN_DEV ? "/development" : "") + "/scripts/solve_cct.js"              , server)

    }
  }
  log(ns, "Finished Rooting New Servers")
  return Promise.resolve()
}

/**
 * @param {import("@ns").NS} ns
 */
async function check_manage(ns, control_params, bitnode_mults, server_info) {

  let managed_servers = []
  let preping_servers = []
  for (let server in RAM_INFO) {
    for (let pid in RAM_INFO[server].processes) {
      if (ns.isRunning(parseInt(pid))) {
        log(ns, "Live PID: " + pid)
        switch (RAM_INFO[server].processes[pid].filename) {
          case (IN_DEV ? "/development" : "") + "/scripts/manage_server_hack_v3.js":
            managed_servers.push(RAM_INFO[server].processes[pid].target)
            break
          case (IN_DEV ? "/development" : "") + "/scripts/manage_server_prep_v3.js":
            preping_servers.push(RAM_INFO[server].processes[pid].target)
            break
        }
      }
      else {
        log(ns, "Killed PID " + pid + " as it is not running.")
        let response = await release_ram(ns, server, RAM_INFO[server].processes[pid].ram_cost)
        log(ns, "RAM Release Response: " + response)
        if (!(response.result === "OK")) {
          ns.tprint("ERROR PID " + pid + " is dead, but we failed to release the RAM associated with it.")
        }
        delete RAM_INFO[server].processes[pid]
      }
    }
  }

  log(ns, managed_servers.length + " Managed Server processes found")
  log(ns, preping_servers.length + " Prepare Server processes found")

  let servers = Object.keys(server_info).filter(server => server_info[server].is_rooted && server_info[server].max_money > 0)

  let temp_server = []
  if (bitnode_mults["ScriptHackMoneyGain"] === 0) {
    // We gain no money from hacking. We only gain the side effects from hacks being run
    // Do not start any managers or prepers
    servers = []
  }
  else if (server_info["home"].max_ram < control_params.hacker.consider_early) {
    if (servers.includes("n00dles")  && server_info["n00dles"].is_rooted) temp_server.push("n00dles")
    if (servers.includes("joesguns") && server_info["joesguns"].is_rooted) temp_server.push("joesguns")
    if (servers.includes("phantasy") && server_info["phantasy"].is_rooted) temp_server.push("phantasy")
    servers = temp_server
  }

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
      let server_b_hack_percent = ns.formulas.hacking.hackPercent(server_b, player)
      let server_b_hack_chance  = ns.formulas.hacking.hackChance (server_b, player)

      return (server_b_hack_percent * server_b_hack_chance * server_b.moneyMax)
      - (server_a_hack_percent * server_a_hack_chance * server_a.moneyMax)
    }
  )

  // TODO: Narrow down prep managers to only prep the single most profitable un-preped server at a time.

  let hackable_servers = []
  let servers_to_prep = []

  for (let server of servers) {
    if (
      (
          ns.getServerSecurityLevel(server) > server_info[server].min_diff
      ||  ns.getServerMoneyAvailable(server) < server_info[server].max_money
      )
    &&  managed_servers.indexOf(server) == -1
    ) {
      // We are not Managing this server AND it is not in a preped state.
      // Add to the list of servers to prep.
      log(ns, `Server to prep ${server} as:`)
      log(ns, `Sec Level of Server: ${ns.getServerSecurityLevel(server)} != ${server_info[server].min_diff}`)
      log(ns, `Money Level of Server: ${ns.getServerMoneyAvailable(server)} != ${server_info[server].max_money}`)
      servers_to_prep.push(server)
      continue
    }
    else if (
      preping_servers.indexOf(server) != -1
    ) {
      // We are preping this server. Do not add it to hackable servers yet.
      continue
    }
    hackable_servers.push(server)
  }

  let servers_to_hack = []
  let hack_batch_cnt = 0

  for (let server of hackable_servers){
    let batches_to_saturate_server = Math.max(Math.floor(ns.getWeakenTime(server) / control_params.hacker.hack_batch_time_interval), 1)
    if (hack_batch_cnt + batches_to_saturate_server < control_params.hacker.total_hack_batch_limit) {
      log(ns, "Added " + server + " with " + batches_to_saturate_server + " to the list of servers we will hack")
      hack_batch_cnt += batches_to_saturate_server
      servers_to_hack.push(server)
    }
  }
  log(ns, "Total of " + hack_batch_cnt + " hack batches are expected to be spawned")

  for (let server of managed_servers) {
    if (servers_to_hack.indexOf(server) === -1) {
      log(ns, "Killing manager for " + server + " as we no longer want to hack it.")
      await kill_child(ns, server)
    }
  }

  for (let server of servers_to_hack) {
    // Not managing currently, request new manager
    let successful = false
    if (managed_servers.indexOf(server) == -1) {
      log(ns, "Launching manager for " + server + ".")
      successful = await launch_child(ns, (IN_DEV ? "/development" : "") + "/scripts/manage_server_hack_v3.js", server)
      if (!successful) {
        log(ns, "Failed to launch manager for " + server + ".")
      }
    }
  }

  if (!(managed_servers.includes(control_params.hacknet.hash_target) || preping_servers.includes(control_params.hacknet.hash_target))) {
    for (let server of preping_servers) {
      log(ns, `Killing preper for ${server} as we need space to prep the hash target`)
      await kill_child(ns, server)
      log(ns, `Server prepper killed`)
    }
    servers_to_prep = []
    servers_to_prep.push(control_params.hacknet.hash_target)
  }

  // // This is not working when the hash target is being hacked currently
  // if (!preping_servers.includes(control_params.hacknet.hash_target) && !managed_servers.includes(control_params.hacknet.hash_target)) {
  //   for (let server of preping_servers) {
  //     log(ns, "Killing preper for " + server + " as we need space to prep the hash target")
  //     await kill_child(ns, server)
  //   }
  // }

  for (let server of servers_to_prep) {
    // Not preping currently, request new prepper
    let successful = false
    //ns.print("Server: " + server + ". P_S: " + preping_servers.length + ". Inclues: " + preping_servers.includes(server))
    if (
        preping_servers.length < 10
    &&  !preping_servers.includes(server)
    ) {
      log(ns, "Launching prepper for " + server + ".")
      ns.print("Server " + server + " maxMoney: " + ns.getServerMaxMoney(server) + ", availableMoney: " + ns.getServerMoneyAvailable(server))
      successful = await launch_child(ns, (IN_DEV ? "/development" : "") + "/scripts/manage_server_prep_v3.js", server)
      if (!successful) {
        log(ns, "ERROR Failed to launch prepper for " + server + ".")
      }
      break
    }
  }

  log(ns, "Finished requesting new manager processes")
  return Promise.resolve()
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const CONTROL_PARAM_HANDLER = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(PORT_IDS.BITNODE_MULTS_HANDLER)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)
  
  init(ns)

  for(let server in RAM_INFO) {
    delete RAM_INFO[server]
  }

  ns.ui.setTailTitle("Manage Hacking V4.0 - PID: " + ns.pid)

  while (
      CONTROL_PARAM_HANDLER.empty()
  ||  BITNODE_MULTS_HANDLER.empty()
  ||  SERVER_INFO_HANDLER.empty()
  ) {
    await ns.sleep(4)
  }

  let control_params = JSON.parse(CONTROL_PARAM_HANDLER.peek())
  let bitnode_mults  = JSON.parse(BITNODE_MULTS_HANDLER.peek())
  let server_info    = JSON.parse(SERVER_INFO_HANDLER.peek())

  // // Sleep for half a second before starting the loop
  // await ns.sleep(4)

  let loop_count = 0
  let initialised = false

  while (true) {

    if (!CONTROL_PARAM_HANDLER.empty()) {
      control_params = JSON.parse(CONTROL_PARAM_HANDLER.peek())
    }
    if (!SERVER_INFO_HANDLER.empty()) {
      server_info = JSON.parse(SERVER_INFO_HANDLER.peek())
    }

    if (loop_count >= 120) {
      loop_count = 0
    }

    // Every one hundred and twenty loops (offset by sixty loops)
    let force_update = false
    if (
        ((loop_count + 60) % 120) == 0
    || !initialised
    ) {
      force_update = true
    }

    // Every twelve loops
    if (
        (loop_count % 12) == 0
    || !initialised
    ) {
      // Root New Servers
      log(ns, "Root New Servers")
      await check_root(ns, force_update)
      initialised = true
    }

    // Every twelve loops (offset by six loops)
    if (((loop_count + 6) % 12) == 0) {
      // Create new instances of 'scripts/manage_server.js'
      log(ns, "Request New Manage Server processes")
      await check_manage(ns, control_params, bitnode_mults, server_info)
    }

    // Sleep for half a second before restarting the program loop
    await ns.sleep(4)
    loop_count += 1
  }
}