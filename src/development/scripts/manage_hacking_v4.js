import { PORT_IDS } from "/scripts/util/port_management"
import { scan_for_servers } from "/scripts/util/scan_for_servers"
import { release_ram, request_ram } from "/scripts/util/ram_management"
import { round_ram_cost } from "/scripts/util/rounding"


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

/** @param {import("../../.").NS} ns */
function disable_logging(ns){
  ns.disableLog("ALL")
  ns.enableLog("exec")
}

/**
 * @param {import("../../.").NS} ns
 * @param {number} pid 
 * @param {string} filename 
 */
function add_child_process(ns, pid, filename, server, target) {
  let calc_free_ram = round_ram_cost(RAM_INFO[server].free_ram - ns.getScriptRam(filename))
  RAM_INFO[server].free_ram = calc_free_ram
  RAM_INFO[server].processes[pid] = {
    "ram_cost": ns.getScriptRam(filename),
    "filename": filename,
    "target"  : target
  }
}

/**
 * @param {import("../../.").NS} ns
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
      let calc_free_ram = round_ram_cost(RAM_INFO[server_name].free_ram + RAM_INFO[server_name].processes[pid_found].ram_cost)
      RAM_INFO[server_name].free_ram = calc_free_ram
      delete RAM_INFO[server_name].processes[pid_found]
    }
  }

  return runing
}

/**
 * @param {import("../../.").NS} ns - NetScript Environment
 * @param {string} filename - Script to Launch
 * @param {string} server_to_target - Server to target with the script given
 */
async function launch_child(ns, filename, server_to_target) {
  let ram_needed = ns.getScriptRam(filename)
  ns.print("INFO RAM required for " + filename + " is calculated as " + ram_needed)
  let server_to_use
  for (let server in RAM_INFO) {
    if (RAM_INFO[server].free_ram >= ram_needed) {
      server_to_use = server
      break
    }
  }

  let request_response
  if (server_to_use === undefined) {
    // We have no free ram allocated to launch the child. We request more
    request_response = await request_ram(ns, ram_needed)
  }

  if (request_response) {
    for (let server in RAM_INFO) {
      if (RAM_INFO[server].free_ram >= ram_needed) {
        server_to_use = server
        break
      }
    }
  }

  if (server_to_use === undefined) {
    ns.print("ERROR Did not find free RAM to launch child process: " + filename + " targetting " + server_to_target)
    return Promise.resolve(false)
  }

  let script_args = [
    "--target", server_to_target
  ]
  let pid = ns.exec(filename, server_to_use, {threads: 1, temporary: true},...script_args)
  if (!(pid === 0)) {
    add_child_process(ns, pid, filename, server_to_use, server_to_target)
    return Promise.resolve(true)
  }
  else {
    ns.tprint("ERROR Exec failed to launch child process: " + filename + " targetting " + server_to_target + " on " + server_to_use)
    await release_ram(ns, server_to_use, RAM_INFO[server_to_use].free_ram)
    RAM_INFO[server_to_use].free_ram = 0
    return Promise.resolve(false)
  }
}

/**
 * Kills a child process that targets the given target
 * @param {import("../../.").NS} ns NetScript Environment
 * @param {string} childs_target Target of the process we want to kill
 */
async function kill_child(ns, childs_target) {
  let server_of_target_process
  let pid_of_target_process
  for (let server in RAM_INFO) {
    for (let pid in RAM_INFO[server].processes) {
      if (RAM_INFO[server].processes[pid].target == childs_target) {
        server_of_target_process = server
        pid_of_target_process = pid
      }
    }
  }

  if (!(server_of_target_process === undefined)) {
    // We have found a process that targets the server
    ns.kill(parseInt(pid_of_target_process))
    let result = await release_ram(ns, server_of_target_process, RAM_INFO[server_of_target_process].processes[pid_of_target_process].ram_cost)
    if (!result) {
      ns.tprint("ERROR Killed process RAM was not released.")
    }
    delete RAM_INFO[server_of_target_process].processes[pid_of_target_process]
  }
  return Promise.resolve()
}

/** 
 * @param {import("../../.").NS} ns
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
    if (
        (     all_servers[server].hack_lvl_req <= ns.getHackingLevel()
          ||  all_servers[server].hack_lvl_req === undefined)
    &&  !all_servers[server].is_rooted
    ) {
      //ns.print(server + " has a hacking level below current skill.")
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
      let newly_rooted = false
      if (
        all_servers[server].num_ports_req <= ports_opened
      &&  !all_servers[server].is_rooted) {
        ns.nuke(server)
        newly_rooted = true
        all_servers[server].is_rooted = true
      }
      if (all_servers[server].is_rooted) {
        if (newly_rooted) {
          ns.print(server + " successfully rooted")
          ns.toast("Successfully Rooted \"" + server + "\"", "success", 5000)
        }

        if (!ns.fileExists("/scripts/util/port_management.js" , server) || force_update) ns.scp("/scripts/util/port_management.js" , server)
        if (!ns.fileExists("/scripts/util/ram_management.js"  , server) || force_update) ns.scp("/scripts/util/ram_management.js"  , server)
        if (!ns.fileExists("/scripts/util/weaken_v3.js"       , server) || force_update) ns.scp("/scripts/util/weaken_v3.js"       , server)
        if (!ns.fileExists("/scripts/util/grow_v3.js"         , server) || force_update) ns.scp("/scripts/util/grow_v3.js"         , server)
        if (!ns.fileExists("/scripts/util/hack_v3.js"         , server) || force_update) ns.scp("/scripts/util/hack_v3.js"         , server)
        if (!ns.fileExists("/scripts/util/share.js"           , server) || force_update) ns.scp("/scripts/util/share.js"           , server)
        if (!ns.fileExists("/scripts/util/weaken_for_exp.js"  , server) || force_update) ns.scp("/scripts/util/weaken_for_exp.js"  , server)
        if (!ns.fileExists("/scripts/manage_server_hack_v3.js", server) || force_update) ns.scp("/scripts/manage_server_hack_v3.js", server)
        if (!ns.fileExists("/scripts/manage_server_prep_v3.js", server) || force_update) ns.scp("/scripts/manage_server_prep_v3.js", server)
        if (!ns.fileExists("/scripts/solve_cct.js"            , server) || force_update) ns.scp("/scripts/solve_cct.js"            , server)

        let update = {
          action: "update_info"
         ,target: server
        }
        
        while(!UPDATE_HANDLER.tryWrite(JSON.stringify(update))) {
          await ns.sleep(4)
        }
      }
    }
  }
  ns.print("Finished Rooting New Servers")
  return Promise.resolve()
}

/** @param {import("../../.").NS} ns */
async function check_manage(ns, control_params, bitnode_mults, server_info) {

  let managed_servers = []
  let preping_servers = []
  for (let server in RAM_INFO) {
    for (let pid in RAM_INFO[server].processes) {
      if (ns.isRunning(parseInt(pid))) {
        ns.print("Live PID: " + pid)
        switch (RAM_INFO[server].processes[pid].filename) {
          case "/scripts/manage_server_hack_v3.js":
            managed_servers.push(RAM_INFO[server].processes[pid].target)
            break
          case "/scripts/manage_server_prep_v3.js":
            preping_servers.push(RAM_INFO[server].processes[pid].target)
            break
        }
      }
      else {
        ns.print("Killed PID: " + pid)
        let result = await release_ram(ns, server, RAM_INFO[server].processes[pid].ram_cost)
        if (!result) {
          ns.tprint("ERROR PID " + pid + " is dead, but we failed to release the RAM associated with it.")
        }
        delete RAM_INFO[server].processes[pid]
      }
    }
  }

  ns.print(managed_servers.length + " Managed Server processes found")
  ns.print(preping_servers.length + " Prepare Server processes found")

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
          ns.getServerSecurityLevel(server) != server_info[server].min_diff
      ||  ns.getServerMoneyAvailable(server) != server_info[server].max_money
      )
    &&  managed_servers.indexOf(server) == -1
    ) {
      // We are not Managing this server AND it is not in a preped state.
      // Add to the list of servers to prep.
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
      ns.print("Added " + server + " with " + batches_to_saturate_server + " to the list of servers we will hack")
      hack_batch_cnt += batches_to_saturate_server
      servers_to_hack.push(server)
    }
  }
  ns.print("Total of " + hack_batch_cnt + " hack batches are expected to be spawned")

  for (let server of managed_servers) {
    if (servers_to_hack.indexOf(server) === -1) {
      ns.print("Killing manager for " + server + " as we no longer want to hack it.")
      await kill_child(ns, server)
    }
  }

  for (let server of servers_to_hack) {
    // Not managing currently, request new manager
    let successful = false
    if (managed_servers.indexOf(server) == -1) {
      ns.print("Launching manager for " + server + ".")
      successful = await launch_child(ns, "/scripts/manage_server_hack_v3.js", server)
      if (!successful) {
        ns.print("Failed to launch manager for " + server + ".")
      }
    }
  }

  if (!preping_servers.includes(control_params.hacknet.hash_target)) {
    for (let server of preping_servers) {
      ns.print("Killing preper for " + server + " as we need space to prep the hash target")
      await kill_child(ns, server)
    }
  }

  for (let server of servers_to_prep) {
    // Not preping currently, request new prepper
    let successful = false
    //ns.print("Server: " + server + ". P_S: " + preping_servers.length + ". Inclues: " + preping_servers.includes(server))
    if (
        preping_servers.length < 2
    &&  !preping_servers.includes(server)
    ) {
      ns.print("Launching prepper for " + server + ".")
      successful = await launch_child(ns, "/scripts/manage_server_prep_v3.js", server)
      if (!successful) {
        ns.print("Failed to launch prepper for " + server + ".")
      }
      break
    }
  }

  ns.print("Finished requesting new manager processes")
  return Promise.resolve()
}

/** @param {import("../../.").NS} ns */
export async function main(ns) {
  const CONTROL_PARAM_HANDLER = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(PORT_IDS.BITNODE_MULTS_HANDLER)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)
  
  // Disable logging of things in this script
  disable_logging(ns)

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
      ns.print("Root New Servers")
      await check_root(ns, force_update)
      initialised = true
    }

    // Every twelve loops (offset by six loops)
    if (((loop_count + 6) % 12) == 0) {
      // Create new instances of 'scripts/manage_server.js'
      ns.print("Request New Manage Server processes")
      await check_manage(ns, control_params, bitnode_mults, server_info)
    }

    // Sleep for half a second before restarting the program loop
    await ns.sleep(4)
    loop_count += 1
  }
}