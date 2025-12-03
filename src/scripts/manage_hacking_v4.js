import { ExecRequestPayload, KillRequestPayload, request_exec, request_kill } from "/src/scripts/core/manage_exec"

import { PORT_IDS } from "/src/scripts/boot/manage_ports"
import { make_request, RAM_MESSAGES, RAMReleasePayload, RAMRequest, RAMRequestPayload } from "/src/scripts/util/ram_management"
import { round_ram_cost } from "/src/scripts/util/rounding"

const DEBUG = true
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

  for(let server in RAM_INFO) {
    delete RAM_INFO[server]
  }
}

/** @param {import("@ns").NS} ns */
function disable_logs(ns){
  ns.disableLog("ALL")
  ns.enableLog("exec")
}

/** @param {import("@ns").NS} ns */
function log(ns, message) {
  if (DEBUG) {
    ns.print(`INFO: ${message}`)
  }
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
  if (server_to_target === undefined) {
    ns.tprint(`ERROR: Attempting to launch '${filename}' on undefined server`)
    ns.exit()
  }
  if (!(typeof server_to_target === "string")) {
    ns.tprint(`ERROR: Type of 'server_to_target': ${server_to_target} is ${typeof server_to_target}`)
    ns.exit()
  }
  let ram_needed = ns.getScriptRam(filename)
  //log(ns, "RAM required for " + filename + " targetting " + server_to_target +" is calculated as " + ram_needed)

  let payload = new RAMRequestPayload(ns.self().pid, ns.self().filename, ram_needed)
  let request = new RAMRequest(RAM_MESSAGES.RAM_REQUEST, payload)
  let ram_resp = await make_request(ns, request)

  if (!(ram_resp.payload.result === "OK")) {
    //log(ns, "Did not find free RAM to launch child process: " + filename + " targetting " + server_to_target)
    return Promise.resolve(false)
  }

  /** @type {import("@ns").ScriptArg[]} */
  let script_args = ["--target", server_to_target]
  //   "target", server_to_target
  // ]

  let exec_request = new ExecRequestPayload(ns.pid, filename, ram_resp.payload.host, {threads:1, temporary:true}, script_args)
  let pid = await request_exec(ns, exec_request)
  
  if (!(pid === 0)) {
    add_child_process(ns, pid, filename, ram_resp.payload.host, server_to_target)
    return Promise.resolve(true)
  }
  else {
    ns.tprint("ERROR Exec failed to launch child process: " + filename + " targetting " + server_to_target + " on " + ram_resp.payload.host)
    let payload = new RAMReleasePayload(ns.self().pid, ram_resp.payload.host, ram_needed)
    let request = new RAMRequest(RAM_MESSAGES.RAM_RELEASE, payload)
    let resp = await make_request(ns, request)
    if (!(resp.payload.result === "OK")) {
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
      let kill_payload = new KillRequestPayload(
        ns.pid
       ,parseInt(pids_to_kill[num].pid)
      )
      await request_kill(ns, kill_payload)
    }
    let payload = new RAMReleasePayload(ns.self().pid, pids_to_kill[num].server, pids_to_kill[num].ram_cost)
    let request = new RAMRequest(RAM_MESSAGES.RAM_RELEASE, payload)
    let resp = await make_request(ns, request)
    if (!(resp.payload.result === "OK")) {
      ns.tprint("ERROR Killed process RAM was not released.")
    }
    delete RAM_INFO[pids_to_kill[num].server].processes[pids_to_kill[num].pid]
  }

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
        //log(ns, "Live PID: " + pid)
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
        //log(ns, "Killed PID " + pid + " as it is not running.")
        let payload = new RAMReleasePayload(ns.self().pid, server, RAM_INFO[server].processes[pid].ram_cost)
        let request = new RAMRequest(RAM_MESSAGES.RAM_RELEASE, payload)
        let resp = await make_request(ns, request)
        //log(ns, "RAM Release Response: " + response)
        if (!(resp.payload.result === "OK")) {
          ns.tprint("ERROR PID " + pid + " is dead, but we failed to release the RAM associated with it.")
        }
        delete RAM_INFO[server].processes[pid]
      }
    }
  }

  // log(ns, managed_servers.length + " Managed Server processes found")
  // log(ns, preping_servers.length + " Prepare Server processes found")

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
    if (server_info[server].hack_lvl_req > (ns.getPlayer().skills.hacking / 2)) {continue} // Do not consider servers that require a hacking level greater than half our current level
    if (
      (
          ns.getServerSecurityLevel(server) > server_info[server].min_diff
      ||  ns.getServerMoneyAvailable(server) < server_info[server].max_money
      )
    &&  managed_servers.indexOf(server) == -1
    ) {
      // We are not Managing this server AND it is not in a preped state.
      // Add to the list of servers to prep.
      // log(ns, `Server to prep ${server} as:`)
      // log(ns, `Sec Level of Server: ${ns.getServerSecurityLevel(server)} != ${server_info[server].min_diff}`)
      // log(ns, `Money Level of Server: ${ns.getServerMoneyAvailable(server)} != ${server_info[server].max_money}`)
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
    if (server_info[server].hack_lvl_req > (ns.getPlayer().skills.hacking / 2)) {continue}
    if (hack_batch_cnt + batches_to_saturate_server < control_params.hacker.total_hack_batch_limit) {
      log(ns, "Added " + server + " with " + batches_to_saturate_server + " to the list of servers we will hack")
      hack_batch_cnt += batches_to_saturate_server
      servers_to_hack.push(server)
    }
  }
  log(ns, "Total of " + hack_batch_cnt + " hack batches are expected to be spawned")

  for (let server of managed_servers) {
    if (servers_to_hack.indexOf(server) === -1) {
      // log(ns, "Killing manager for " + server + " as we no longer want to hack it.")
      await kill_child(ns, server)
    }
  }

  for (let server of servers_to_hack) {
    // Not managing currently, request new manager
    let successful = false
    if (managed_servers.indexOf(server) == -1 && managed_servers.length < 2) {
      // log(ns, "Launching manager for " + server + ".")
      successful = await launch_child(ns, "/scripts/manage_server_hack_v3.js", server)
      if (!successful) {
        // log(ns, "Failed to launch manager for " + server + ".")
      }
    }
  }

  if (!((control_params.hacknet_mgr.hash_target === null) || (control_params.hacknet_mgr.hash_target === undefined))) {
    if (!(managed_servers.includes(control_params.hacknet_mgr.hash_target) || preping_servers.includes(control_params.hacknet_mgr.hash_target))) {
      for (let server of preping_servers) {
        // log(ns, `Killing preper for ${server} as we need space to prep the hash target`)
        await kill_child(ns, server)
        // log(ns, `Server prepper killed`)
      }
      servers_to_prep = []
      // log(ns, `Overrideing servers to prep to prep hash target ${control_params.hacknet_mgr.hash_target}`)
      servers_to_prep.push(control_params.hacknet_mgr.hash_target)
    }
  }

  // // This is not working when the hash target is being hacked currently
  // if (!preping_servers.includes(control_params.hacknet_mgr.hash_target) && !managed_servers.includes(control_params.hacknet_mgr.hash_target)) {
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
        preping_servers.length < 2
    &&  !preping_servers.includes(server)
    ) {
      // log(ns, "Launching prepper for " + server + ".")
      //ns.print("Server " + server + " maxMoney: " + ns.getServerMaxMoney(server) + ", availableMoney: " + ns.getServerMoneyAvailable(server))
      successful = await launch_child(ns, "/scripts/manage_server_prep_v3.js", server)
      if (!successful) {
        // log(ns, "ERROR Failed to launch prepper for " + server + ".")
      }
      break
    }
  }

  // log(ns, "Finished requesting new manager processes")
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

    // Every twelve loops (offset by six loops)
    if (((loop_count + 6) % 12) == 0) {
      // Create new instances of 'scripts/manage_server.js'
      // log(ns, "Request New Manage Server processes")
      await check_manage(ns, control_params, bitnode_mults, server_info)
    }

    // Sleep for half a second before restarting the program loop
    await ns.sleep(4)
    loop_count += 1
  }
}