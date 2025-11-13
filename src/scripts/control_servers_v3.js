import { scan_for_servers } from "/scripts/util/scan_for_servers"
import { PORT_IDS } from "/scripts/util/port_management"
import { COLOUR, colourize } from "/scripts/util/colours"
import { release_ram, request_ram } from "/scripts/util/ram_management"
import { append_to_file, delete_file, rename_file } from "/scripts/util/file_management"

const LOG_COLOUR = colourize(COLOUR.MINT,9)
const DEF_COLOUR = colourize(COLOUR.DEFAULT)
const FILENAME = "control_servers_curr.txt"
const PRIOR_FILENAME = "control_servers_prior.txt"

const RAM_INFO = {
  //[server] = {
  //  assigned_ram: <number>,
  //  free_ram    : <number>,
  //  processes   : {
  //    [pid]: {
  //      ram_cost: <number>,
  //      filename: <string>
  //    },
  //    [pid]: {
  //      ...
  //  }
  //},
  //[server] = {
  // ...
}


/**
 * all_server_stats is an object that will hold static or binary information about all servers.
 * 
 * It will be exposed on Port 3 as a result of JSON.stringify(all_server_stats)
 * 
 * all_server_stats = {
 *  "n00dles" = {
 *    "max_money"     : ns.getServerMaxMoney(server),
 *    "max_ram"       : ns.getServerMaxRam(server),
 *    "min_diff"      : ns.getServerMinSecurityLevel(server),
 *    "num_ports_req" : ns.getServerNumPortsRequired(server),
 *    "hack_lvl_req"  : ns.getServerRequiredHackingLevel(server),
 *    "is_rooted"     : true | false
 *  }
 * }
 * 
 */
let all_server_stats = {}

/**
 * Port 4 will be a queue of actions for this script to perform.
 * 
 * Data input to this Port should be of the following form converted to string via JSON.stringify
 * update = {
 *  "action": "update_info" | "request_action",
 *  "update_info": {
 *    "server": <hostname>
 *  },
 *  "request_action": {
 *    "script_action": "hack" | "grow" | "weaken" | "manage"
 *  }
 * }
 */

function init(ns) {
  disable_logs(ns)
  init_log(ns)

  for(let server in RAM_INFO) {
    delete RAM_INFO[server]
  }
  all_server_stats = {}
}

/** @param {NS} ns */
function disable_logs(ns) {
  ns.disableLog("ALL")
  ns.enableLog("exec")
}

/**
 * @param {NS} ns 
 */
function init_log(ns){
  if (ns.fileExists(PRIOR_FILENAME)) {
    delete_file(ns, PRIOR_FILENAME)
  }
  if (ns.fileExists(FILENAME)) {
    rename_file(ns, FILENAME, PRIOR_FILENAME)
  }
}

/**
 * @param {NS} ns 
 * @param {string} message 
 */
function log(ns, message) {
  ns.print(message)
  append_to_file(ns, FILENAME, message)
}

/**
 * @param {NS} ns
 */
function kill_all_other_processes(ns) {
  let rooted_servers = scan_for_servers(ns,{"is_rooted":true,"include_home":true})
  let cnt = 0
  // This function is called soon after control_servers_v2.js is started.
  // We should have a clean slate to build from, so kill all possible actions on all servers apart from this process
  for (let server of rooted_servers) {
    let process_ids = ns.ps(server)
    for (let process of process_ids) {
      // Do not kill our own process
      if (process.pid == ns.pid) {
        continue
      }
      ns.kill(process.pid)
      cnt++
    }
  }

  ns.tprint("We killed " + cnt + " processes during startup.")
}

/**
 * Update a single servers static statistics in all_server_stats
 * 
 * @param {NS} ns - Netscript Environment
 * @param {string} server - Server name we want to update the stats of
 * @param {NetscriptPort} handler - Optional, handler that will handle the port writing, needs to be provided unless defer_write is true
 * @param {boolean} defer_write - Optional, pass true if the calling function will use the handler itself to write to the port
 */
function update_server_stats(ns, server, handler = undefined, defer_write = false) {
  all_server_stats[server] = {
    "max_money"     : ns.getServerMaxMoney(server),
    "max_ram"       : ns.getServerMaxRam(server),
    "min_diff"      : ns.getServerMinSecurityLevel(server),
    "num_ports_req" : ns.getServerNumPortsRequired(server),
    "hack_lvl_req"  : ns.getServerRequiredHackingLevel(server),
    "is_rooted"     : ns.hasRootAccess(server)
  }
  if (
      !defer_write
  &&  !(handler === undefined)
  ) {
    handler.clear()
    handler.write(JSON.stringify(all_server_stats))
  }
}

/**
 * Update all servers static statistics in all_server_stats
 * 
 * @param {NS} ns - Netscript Environment
 * @param {NetscriptPort} handler - Handler that will handle the port writing
 */
function populate_all_server_stats(ns, handler) {
  let all_servers = scan_for_servers(ns,{"is_rooted":true,"include_home":true})

  for (let server of all_servers) {
    update_server_stats(ns, server, null, true)
  }

  handler.clear()
  handler.write(JSON.stringify(all_server_stats))
}

/**
 * @param {NS} ns Netscript Environment
 * @param {NetscriptPort} control_param_handler 
 * @param {NetscriptPort} bitnode_mults_handler
 */
async function populate_control_and_bitnode_stats(ns, control_param_handler, bitnode_mults_handler) {
  let pid = ns.exec("/scripts/util/control_parameters.js","home",1)
  if (pid === 0) {
    ns.tprint("ERROR Failed to launch Control Parameters script.")
    ns.exit()
  }

  while(control_param_handler.empty()) {
    await ns.sleep(50)
  }

  pid = ns.exec("/scripts/util/populate_bitnode_mults.js","home",1)
  if (pid === 0) {
    ns.tprint("ERROR Failed to launch BitNode Multipliers script.")
    ns.exit()
  }

  while(bitnode_mults_handler.empty()) {
    await ns.sleep(50)
  }

  return Promise.resolve()
}

/**
 * Start the RAM Managing process
 * 
 * @param {NS} ns - Netscript Environment
 * @param {NetscriptPort} ram_request_handler - Port that handles RAM requests
 * @param {NetscriptPort} ram_provide_handler - Port that returns RAM request outcomes
 */
async function start_ram_manager(ns, ram_request_handler, ram_provide_handler) {
  let ram_pid = ns.exec("/scripts/manage_ram.js", "home", 1)

  if(ram_pid === 0) {
    log(ns, "ERROR Failed to launch RAM Manager script.")
    ns.tprint("ERROR Failed to launch RAM Manager script.")
    ns.exit()
  }
  log(ns, "RAM Manager launched successfully. Await RAM Manager Initialisation.")
  while(ram_provide_handler.empty()) {
    await ns.sleep(50)
  }

  let ram_manager_response = ram_provide_handler.read()
  if (!(ram_manager_response === "OK")) {
    log(ns, "ERROR RAM Manager did not Initialise successfully:")
    log(ns,ram_manager_response)
    ns.tprint("ERROR RAM Manager did not Initialise successfully:")
    ns.tprint(ram_manager_response)
    ns.exit()
  }
  log(ns, "RAM Manager Initialised successfully.")

  let ram_response = await request_ram(ns, ns.getScriptRam("/scripts/manage_ram.js") + ns.getScriptRam("/scripts/control_servers_v3.js"))

  if (!(ram_response.result === "OK")) {
    log(ns, "ERROR RAM Manager somehow failed to Provide RAM for both its and this scripts own existance despite both scripts running up until this point")
    log(ns, JSON.stringify(ram_response))
    ns.tprint("ERROR RAM Manager somehow failed to Provide RAM for both its and this scripts own existance despite both scripts running up until this point")
    ns.tprint(JSON.stringify(ram_response))
    ns.exit()
  }
  else {
    RAM_INFO[ram_response.server] = {
      "assigned_ram": ram_response.amount,
      "free_ram": ram_response.amount - (ns.getScriptRam("/scripts/manage_ram.js") + ns.getScriptRam("/scripts/control_servers_v3.js")),
      "processes": {}
    }
    RAM_INFO[ram_response.server].processes[ram_pid] = {
      "ram_cost": ns.getScriptRam("/scripts/manage_ram.js"),
      "filename": "/scripts/manage_ram.js"
    }
    RAM_INFO[ram_response.server].processes[ns.pid] = {
      "ram_cost": ns.getScriptRam("/scripts/control_servers_v3.js"),
      "filename": "/scripts/control_servers_v3.js"
    }
  }

  log(ns,"RAM Manager has provided RAM for both its and this scripts own existence.")
  log(ns,"Server \"" + ram_response.server + "\" has " + RAM_INFO[ram_response.server].assigned_ram + " assigned RAM. And " + RAM_INFO[ram_response.server].free_ram + " free RAM")

  return Promise.resolve()
}

/**
 * @param {NS} ns
 * @param {number} pid 
 * @param {string} filename 
 * @param {string} server
 */
function add_child_process(ns, pid, filename, server) {
  log(ns, "Adding Child Process using RAM from \"" + server + "\" to run " + filename + " (" + pid + ") at a cost of " + ns.getScriptRam(filename) + " RAM")
  RAM_INFO[server].free_ram -= ns.getScriptRam(filename)
  RAM_INFO[server].processes[pid] = {
    "ram_cost": ns.getScriptRam(filename),
    "filename": filename
  }
}

/**
 * @param {NS} ns
 * @param {string} filename 
 * @returns {boolean}
 */
function child_is_running(ns, filename) {
  log(ns, "Check if Child Process using the " + filename + " script is running.")
  let runing = false
  let pid_found
  let server_name
  for (let server in RAM_INFO) {
    for(let pid in RAM_INFO[server].processes) {
      if (RAM_INFO[server].processes[pid].filename == filename) {
        runing = ns.isRunning(parseInt(pid))
        server_name = server
        pid_found = pid
        log(ns, "Child Process using the " + filename + " script found on \"" + server_name + "\", Running Status: " + runing)
      }
    }
  }

  if (!(pid_found === undefined)) {
    if (!runing) {
      log(ns, "Clean up RAM State since Child Process was not runing.")
      RAM_INFO[server_name].free_ram += RAM_INFO[server_name].processes[pid_found].ram_cost
      delete RAM_INFO[server_name].processes[pid_found]
    }
  }

  return runing
}
/**
 * 
 * @param {NS} ns - NetScript Environment
 * @param {string} filename - Script to Launch
 * @param {NetscriptPort} ram_request_handler - Handler to request RAM
 * @param {NetscriptPort} ram_provide_handler - Handler to listen for provided RAM
 */
async function launch_child(ns, filename, ram_request_handler, ram_provide_handler) {
  let ram_needed = ns.getScriptRam(filename)
  let server_to_use
  for (let server in RAM_INFO) {
    log(ns,"Server " + server + " has free_ram: " + RAM_INFO[server].free_ram)
    if (RAM_INFO[server].free_ram >= ram_needed) {
      server_to_use = server
      break
    }
  }

  if (server_to_use === undefined) {
    // We have no free ram allocated to launch this with apparently
    // This is currently unexpected since we don't release any of our allocated RAM
    ns.tprint("ERROR Unable to launch child process " + filename + ", due to no free allocated RAM.")
    await ns.sleep(10000)
  }
  else {
    let pid = ns.exec(filename, server_to_use, 1)
    if (pid == 0) {
      ns.tprint("ERROR Exec failed to launch child process " + filename)
    }
    else {
      add_child_process(ns, pid, filename, server_to_use)
    }
  }
  return Promise.resolve()
}

/**
 *  @param {NS} ns
 *  @param {NetscriptPort} handler
 */
async function start_managers(ns, ram_request_handler, ram_provide_handler) {
  ns.tail()
  log(ns, "Calculate amount of RAM we need for our managers.")
  let ram_needed = 0
  ram_needed += ns.getScriptRam("/scripts/util/control_parameters.js")
  log(ns, "Add Control Parameter script RAM. Total: " + ram_needed)
  // ram_needed += ns.getScriptRam("/scripts/util/populate_bitnode_mults.js")
  // log(ns, "Add Bitnode Mult script RAM. Total: " + ram_needed)
  ram_needed += ns.getScriptRam("/scripts/manage_servers_v3.js")
  log(ns, "Add Hack/Prep Manager Manager script RAM. Total: " + ram_needed)
  if (ns.getServerMaxRam("home") >= 64) {
    ram_needed += ns.getScriptRam("/scripts/manage_hacknet_v3.js")
    log(ns, "Add Hacknet Manager script RAM. Total: " + ram_needed)
    ram_needed += ns.getScriptRam("/scripts/manage_pservers_v2.js")
    log(ns, "Add Hack/Prep Manager Manager script RAM. Total: " + ram_needed)
  }
  if (ns.getServerMaxRam("home") >= 128) {
    ram_needed += ns.getScriptRam("/scripts/manage_codecontracts.js")
    log(ns, "Add Code Contract Manager script RAM. Total: " + ram_needed)
    ram_needed += ns.getScriptRam("/scripts/manage_free_ram_v2.js")
    log(ns, "Add Free RAM Manager script RAM. Total: " + ram_needed)
  }

  log(ns, "Request " + ram_needed + " RAM for our other Manager processes.")

  let ram_response = await request_ram(ns, ram_needed)

  if (!(ram_response.result === "OK")) {
    log(ns, "ERROR RAM Manager failed to provide RAM for the Manager processes.")
    log(ns, JSON.stringify(ram_response))
    ns.tprint("ERROR RAM Manager failed to provide RAM for the Manager processes.")
    ns.tprint(JSON.stringify(ram_response))
    ns.exit()
  }
  else {
    if (RAM_INFO[ram_response.server]) {
      RAM_INFO[ram_response.server].assigned_ram += ram_response.amount
      RAM_INFO[ram_response.server].free_ram += ram_response.amount
    }
    else {
      RAM_INFO[ram_response.server] = {
        "assigned_ram": ram_response.amount,
        "free_ram": ram_response.amount
      }
    }
    log(ns,"Server \"" + ram_response.server + "\" has had " + ram_response.amount + " RAM assigned to us.")
  }

  let pid = ns.exec("/scripts/manage_servers_v3.js",ram_response.server,1)
  if (pid === 0) {
    log(ns, "ERROR Failed to launch Hack/Prep Manager Manager after being allocated RAM.")
    ns.tprint("ERROR Failed to launch Hack/Prep Manager Manager after being allocated RAM.")
  }
  else add_child_process(ns,pid,"/scripts/manage_servers_v3.js",ram_response.server)

  if (ns.getServerMaxRam("home") >= 64) {
    pid = ns.exec("/scripts/manage_hacknet_v3.js",ram_response.server,1)
    if (pid === 0) {
      log(ns, "ERROR Failed to launch Automatic Hacknet Upgrade Manager after being allocated RAM.")
      ns.tprint("ERROR Failed to launch Automatic Hacknet Upgrade Manager after being allocated RAM.")
    }
    else add_child_process(ns,pid,"/scripts/manage_hacknet_v2.js",ram_response.server)
  
    pid = ns.exec("/scripts/manage_pservers_v2.js",ram_response.server,1)
    if (pid === 0) {
      log(ns, "ERROR Failed to launch Automatic Personal Server Manager after being allocated RAM.")
      ns.tprint("ERROR Failed to launch Automatic Personal Server Manager after being allocated RAM.")
    }
    else add_child_process(ns,pid,"/scripts/manage_pservers_v2.js",ram_response.server)
    // Either of these two processes can enqueue the Free Ram Manager
  }

  if (ns.getServerMaxRam("home") >= 128) {
    pid = ns.exec("/scripts/manage_codecontracts.js",ram_response.server,1)
    if (pid === 0) {
      log(ns, "ERROR Failed to launch Code Contract Manager after being allocated RAM.")
      ns.tprint("ERROR Failed to launch Code Contract Manager after being allocated RAM.")
    }
    else add_child_process(ns,pid,"/scripts/manage_codecontracts.js",ram_response.server)
  }
  // if (ns.getServerMaxRam("home") > 128) {
  //   update = {
  //     "action": "request_action",
  //     "request_action": {
  //       "script_action": "repopti",
  //       "target": "home",
  //       "threads": 1
  //     }
  //   }
  //
  //   update_handler.write(JSON.stringify(update))
  // }

  return Promise.resolve()
}

/** @param {NS} ns */
export async function main(ns) {
  const CONTROL_PARAM_HANDLER = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(PORT_IDS.BITNODE_MULTS_HANDLER)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)
  const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(PORT_IDS.RAM_REQUEST_HANDLER)
  const RAM_PROVIDE_HANDLER   = ns.getPortHandle(PORT_IDS.RAM_PROVIDE_HANDLER)

  init(ns)

  ns.setTitle("Control Servers V3.0 - PID: " + ns.pid)

  CONTROL_PARAM_HANDLER.clear()
  BITNODE_MULTS_HANDLER.clear()
  SERVER_INFO_HANDLER.clear()
  UPDATE_HANDLER.clear()
  RAM_REQUEST_HANDLER.clear()
  RAM_PROVIDE_HANDLER.clear()

  // Clear the slate
  log(ns, "Killing all other processes")
  kill_all_other_processes(ns)

  while (
      !CONTROL_PARAM_HANDLER.empty()
  ||  !BITNODE_MULTS_HANDLER.empty()
  ||  !SERVER_INFO_HANDLER.empty()
  ||  !UPDATE_HANDLER.empty()
  ||  !RAM_REQUEST_HANDLER.empty()
  ||  !RAM_PROVIDE_HANDLER.empty()
  ) {
    if(!CONTROL_PARAM_HANDLER.empty()) CONTROL_PARAM_HANDLER.clear()
    if(!BITNODE_MULTS_HANDLER.empty()) BITNODE_MULTS_HANDLER.clear()
    if(!SERVER_INFO_HANDLER.empty()  ) SERVER_INFO_HANDLER.clear()
    if(!UPDATE_HANDLER.empty()       ) UPDATE_HANDLER.clear()
    if(!RAM_REQUEST_HANDLER.empty()  ) RAM_REQUEST_HANDLER.clear()
    if(!RAM_PROVIDE_HANDLER.empty()  ) RAM_PROVIDE_HANDLER.clear()
    await ns.sleep(50)
  }

  log(ns,"Gather Statistics of the environment we are working in.")
  populate_all_server_stats(ns, SERVER_INFO_HANDLER)

  log(ns,"Ensure our control parameters are written to their ports.")
  await populate_control_and_bitnode_stats(ns, CONTROL_PARAM_HANDLER, BITNODE_MULTS_HANDLER)

  log(ns,"Start the RAM manager.")
  await start_ram_manager(ns, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)

  log(ns,"Start our other managers.")
  await start_managers(ns, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)

  log(ns,"Starting Loop")
  while(true){
    log(ns, "Awaiting Update we can act on.")
    let awaiting_update = true
    let update = {}
    while (awaiting_update) {
      while(UPDATE_HANDLER.empty()) {
        await ns.sleep(50)
      }
      update = JSON.parse(UPDATE_HANDLER.peek())
      if (
          update.action === "update_info"
      ||  update.action === "request_action"
      ||  update.action === "death_react"
      ) {
        log(ns, "Update for us to act on has arrive:\n" + UPDATE_HANDLER.peek())
        awaiting_update = false 
        UPDATE_HANDLER.read()
      }
      else {
        await ns.sleep(50)
      }
    }

    //log(ns,"Action Type: " + update.action)
    if (update.action === "update_info") {
      //log(ns,"Performing Update Info")
      update_server_stats(ns, update.update_info.server, SERVER_INFO_HANDLER)
    }
    else if (update.action === "request_action") {
      log(ns,"Performing Request Action")
      // let request_action = update.request_action
      // let server_to_target = request_action.target 
      // let ram_needed = 0
      let filename = ""
      switch (update.request_action.script_action) {
        case "params":
          // Launch Control Parameters script
          filename = "/scripts/util/control_parameters.js"
          break
        case "BNMult":
          // Launch Populate Bitnode Multipliers script
          filename = "/scripts/util/populate_bitnode_mults.js"
          break
        case "manager":
          // Launch Hack/Prep Manager Manager script
          filename = "/scripts/manage_servers_v3.js"
          break
        case "hacknet":
          // Launch Automatic Hacknet Upgrade Manager script
          filename = "/scripts/manage_hacknet_v3.js"
          break
        case "pserver":
          // Launch Automatic Personal Server Manager script
          filename = "/scripts/manage_pservers_v2.js"
          break
        case "freeram":
          // Launch Free RAM Consumer script
          filename = "/scripts/manage_free_ram_v2.js"
          break
        case "cctmang":
          // Launch Code Contract Manager script
          filename = "/scripts/manage_codecontracts.js"
          break
      }

      if (filename === "") {
        ns.tprint("ERROR Action '" + update.request_action.script_action + "' requested, but not known.")
      }
      else if (!child_is_running(ns, filename)) {
        await launch_child(ns, filename, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
      }  
    }
    else if (update.action === "death_react") {
      log(ns,"Performing Death Reaction")
      /** @type {number[]} */
      let pid_array = update.death_react.pids_to_kill
      log(ns,"Killing the following PIDs: " + pid_array)

      for (let pid of pid_array) {
        ns.kill(parseInt(pid))
      }
    }
    await ns.sleep(50)
  }
}