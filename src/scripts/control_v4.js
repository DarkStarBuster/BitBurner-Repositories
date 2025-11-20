import { scan_for_servers } from "/src/scripts/util/scan_for_servers"
import { PORT_IDS, COLOUR, colourize } from "/src/scripts/util/constant_utilities"
import { release_ram, request_ram } from "/src/scripts/util/ram_management"
import { append_to_file, delete_file, rename_file } from "/src/scripts/util/file_management"
import { round_ram_cost } from "/src/scripts/util/rounding"

const LOG_COLOUR = colourize(COLOUR.MINT,9)
const DEF_COLOUR = colourize(COLOUR.DEFAULT)
const LOG_FILENAME = "logs/control_servers_curr.txt"
const PRIOR_LOG_FILENAME = "logs/control_servers_prior.txt"
const X_SIZE = 425
const Y_SIZE = 274

class ProcessInfo {
  bitnode_modifiers_run = false;
  control_parameters_pid = NaN;
  control_pid = NaN;
  server_info_handler_pid = NaN;
  ram_manager_pid = NaN;
  hacking_manager_pid = NaN;
  hacknet_manager_pid = NaN;
  pserver_manager_pid = NaN;
  code_contract_manager_pid = NaN;
  free_ram_manager_pid = NaN;
  gang_manager_pid = NaN;
  last_ui_update = NaN;

  constructor() {
  }
}

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

/**
 * @param {import("@ns").NS} ns 
 */
function disable_logs(ns) {
  ns.disableLog("ALL")
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
 * @param {ProcessInfo} control_info
 * @param {boolean} force_update
 */
function update_TUI(ns, control_info, force_update) {

  if ((control_info.last_ui_update + 1000 > performance.now()) && !force_update) {
    return
  }
  control_info.last_ui_update = performance.now()
  let y_size = 0
  let height_for_title_bar = 33
  let height_per_line = 24
  y_size = height_for_title_bar + (height_per_line * 11)
  let tail_properties = ns.self().tailProperties
  if (!(tail_properties === null)) {
    if (!(tail_properties.height === y_size) || !(tail_properties.width === X_SIZE)) {
      ns.ui.resizeTail(X_SIZE, y_size)
    }
  }

  ns.clearLog()
  let name_column_length = 30
  const GOOD_COLOUR = colourize(COLOUR.LGREEN)
  const BAD_COLOUR = colourize(COLOUR.RED)

  if (!ns.isRunning(control_info.control_parameters_pid)) control_info.control_parameters_pid = NaN
  if (!ns.isRunning(control_info.control_pid)) control_info.control_pid = NaN
  if (!ns.isRunning(control_info.server_info_handler_pid)) control_info.server_info_handler_pid = NaN
  if (!ns.isRunning(control_info.ram_manager_pid)) control_info.ram_manager_pid = NaN
  if (!ns.isRunning(control_info.hacking_manager_pid)) control_info.hacking_manager_pid = NaN
  if (!ns.isRunning(control_info.hacknet_manager_pid)) control_info.hacknet_manager_pid = NaN
  if (!ns.isRunning(control_info.pserver_manager_pid)) control_info.pserver_manager_pid = NaN
  if (!ns.isRunning(control_info.code_contract_manager_pid)) control_info.code_contract_manager_pid = NaN
  if (!ns.isRunning(control_info.free_ram_manager_pid)) control_info.free_ram_manager_pid = NaN
  if (!ns.isRunning(control_info.gang_manager_pid)) control_info.gang_manager_pid = NaN

  ns.print("BitNode Modifiers Written".padEnd(name_column_length)     + ": " + (control_info.bitnode_modifiers_run === false ? BAD_COLOUR + "NO" : GOOD_COLOUR + "YES") + DEF_COLOUR)
  ns.print("Control Parameters Process".padEnd(name_column_length)    + ": " + (isNaN(control_info.control_parameters_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  ns.print("Control Process".padEnd(name_column_length)               + ": " + (isNaN(control_info.control_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  ns.print("Server Info Handler Process".padEnd(name_column_length)   + ": " + (isNaN(control_info.server_info_handler_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  ns.print("RAM Manager Process".padEnd(name_column_length)           + ": " + (isNaN(control_info.ram_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  ns.print("Hacking Manager Process".padEnd(name_column_length)       + ": " + (isNaN(control_info.hacking_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  ns.print("Hacknet Manager Process".padEnd(name_column_length)       + ": " + (isNaN(control_info.hacknet_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  ns.print("PServer Manager Process".padEnd(name_column_length)       + ": " + (isNaN(control_info.pserver_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  ns.print("Code Contract Manager Process".padEnd(name_column_length) + ": " + (isNaN(control_info.code_contract_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  ns.print("Free RAM Manager Process".padEnd(name_column_length)      + ": " + (isNaN(control_info.free_ram_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  ns.print("Gang Manager Process".padEnd(name_column_length)          + ": " + (isNaN(control_info.gang_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
}

/**
 * @param {import("@ns").NS} ns
 */
function kill_all_other_processes(ns) {
  let rooted_servers = scan_for_servers(ns,{"is_rooted":true,"include_home":true})
  let cnt = 0
  // This function is called soon after control_v4.js is started.
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
 * @param {import("@ns").NS} ns Netscript Environment
 * @param {import("@ns").NetscriptPort} control_param_handler
 * @param {import("@ns").NetscriptPort} bitnode_mults_handler
 * @param {import("@ns").NetscriptPort} server_info_handler
 */
async function populate_information_ports(ns, control_info, control_param_handler, bitnode_mults_handler, server_info_handler) {
  let pid = ns.exec((IN_DEV ? "/development" : "") + "/scripts/util/bitnode_modifiers.js","home",{threads:1,temporary:true})
  if (pid === 0) {
    ns.tprint("ERROR Failed to launch BitNode Multipliers script.")
    ns.exit()
  }

  while(bitnode_mults_handler.empty()) {
    await ns.sleep(4)
  }
  control_info.bitnode_modifiers_run = true

  let server_info_pid = ns.exec((IN_DEV ? "/development" : "") + "/scripts/util/handle_server_info.js", "home", {threads:1,temporary:true})
  if (server_info_pid === 0) {
    ns.tprint("ERROR Failed to launch Server Info script.")
    ns.exit()
  }

  while(server_info_handler.empty()) {
    await ns.sleep(4)
  }
  control_info.server_info_handler_pid = server_info_pid

  let control_pid = ns.exec((IN_DEV ? "/development" : "") + "/scripts/util/control_parameters.js","home",{threads:1,temporary:true})
  if (control_pid === 0) {
    ns.tprint("ERROR Failed to launch Control Parameters script.")
    ns.exit()
  }

  while(control_param_handler.empty()) {
    await ns.sleep(4)
  }
  control_info.control_parameters_pid = control_pid

  return Promise.resolve()
}

/**
 * Start the RAM Managing process
 * 
 * @param {import("@ns").NS} ns - Netscript Environment
 * @param {number} control_pid - PID of the Control Parameter handling process
 * @param {number} server_info_pid - PID of the Server Info handling process
 * @param {import("@ns").NetscriptPort} ram_provide_handler - Port that returns RAM request outcomes
 */
async function start_ram_manager(ns, control_info, ram_provide_handler) {
  let ram_pid = ns.exec((IN_DEV ? "/development" : "") + "/scripts/manage_ram_v2.js", "home", {threads:1,temporary:true}, ...["--parent_pid", ns.pid])

  if(ram_pid === 0) {
    log(ns, "ERROR Failed to launch RAM Manager script.")
    ns.tprint("ERROR Failed to launch RAM Manager script.")
    ns.exit()
  }
  log(ns, "RAM Manager launched successfully. Await RAM Manager Initialisation.")
  control_info.ram_manager_pid = ram_pid
  
  let awaiting_response = true
  let ram_manager_response = {}
  while (awaiting_response) {
    while(ram_provide_handler.empty()) {
      await ns.sleep(4)
    }
    log(ns, ram_provide_handler.peek().toString())
    ram_manager_response = JSON.parse(ram_provide_handler.peek())
    if (parseInt(ram_manager_response.requester) === ns.pid) {
      awaiting_response = false
      ram_provide_handler.read()
    }
    else {
      await ns.sleep(4)
    }
  }

  if (!(ram_manager_response.result === "OK")) {
    log(ns, "ERROR RAM Manager did not Initialise successfully:")
    log(ns,ram_manager_response)
    ns.tprint("ERROR RAM Manager did not Initialise successfully:")
    ns.tprint(ram_manager_response)
    ns.exit()
  }
  log(ns, "RAM Manager Initialised successfully.")

  let ram_response = await request_ram(
    ns
   ,  ns.getScriptRam((IN_DEV ? "/development" : "") + "/scripts/manage_ram_v2.js")
    + ns.getScriptRam((IN_DEV ? "/development" : "") + "/scripts/control_v4.js")
    + ns.getScriptRam((IN_DEV ? "/development" : "") + "/scripts/util/control_parameters.js")
    + ns.getScriptRam((IN_DEV ? "/development" : "") + "/scripts/util/handle_server_info.js")
  )

  if (!(ram_response.result === "OK")) {
    log(ns, "ERROR RAM Manager somehow failed to provide RAM for its, this and the control_parameter scripts existance despite all of them running up until this point")
    log(ns, JSON.stringify(ram_response))
    ns.tprint("ERROR RAM Manager somehow failed to provide RAM for its, this and the control_parameter scripts existance despite all of them running up until this point")
    ns.tprint(JSON.stringify(ram_response))
    ns.exit()
  }
  else {
    RAM_INFO[ram_response.server] = {
      assigned_ram: ram_response.amount,
      processes: {}
    }
    RAM_INFO[ram_response.server].processes[ram_pid] = {
      ram_cost: ns.getScriptRam((IN_DEV ? "/development" : "") + "/scripts/manage_ram_v2.js"),
      filename: (IN_DEV ? "/development" : "") + "/scripts/manage_ram_v2.js"
    }
    RAM_INFO[ram_response.server].processes[ns.pid] = {
      ram_cost: ns.getScriptRam((IN_DEV ? "/development" : "") + "/scripts/control_v4.js"),
      filename: (IN_DEV ? "/development" : "") + "/scripts/control_v4.js"
    }
    RAM_INFO[ram_response.server].processes[control_info.control_parameters_pid] = {
      ram_cost: ns.getScriptRam((IN_DEV ? "/development" : "") + "/scripts/util/control_parameters.js")
     ,filename: (IN_DEV ? "/development" : "") + "/scripts/util/control_parameters.js"
    }
    RAM_INFO[ram_response.server].processes[control_info.server_info_handler_pid] = {
      ram_cost: ns.getScriptRam((IN_DEV ? "/development" : "") + "/scripts/util/handle_server_info.js")
     ,filename: (IN_DEV ? "/development" : "") + "/scripts/util/handle_server_info.js" 
    }
  }

  log(ns,"RAM Manager has provided RAM for its, this, the control_parameter and the handle_server_info scripts existence.")
  log(ns,"Server \"" + ram_response.server + "\" has " + RAM_INFO[ram_response.server].assigned_ram + " assigned RAM. And " + RAM_INFO[ram_response.server].free_ram + " free RAM")

  return Promise.resolve()
}

/**
 * @param {import("@ns").NS} ns
 * @param {number} pid 
 * @param {string} filename 
 * @param {string} server
 */
function add_child_process(ns, pid, filename, server) {
  log(ns, `Adding Child Process using RAM from ${server} to run ${filename} (${pid}) at a cost of ${ns.formatRam(ns.getScriptRam(filename))} RAM`)
  RAM_INFO[server].processes[pid] = {
    ram_cost: ns.getScriptRam(filename),
    filename: filename
  }
}

/**
 * @param {import("@ns").NS} ns
 * @param {number} pid 
 * @param {string} filename 
 * @param {string} server
 */
function remove_child_process(ns, pid, filename, server) {
  log(ns, `Removing Child Process using RAM from ${server} to run ${filename} (${pid}) at a cost of ${ns.formatRam(ns.getScriptRam(filename))} RAM`)
  delete RAM_INFO[server].processes[pid]
}

/**
 * @param {import("@ns").NS} ns
 * @param {string} filename 
 * @returns {{running: boolean, server?: string, pid?: number}}
 */
function child_is_running(ns, filename) {
  log(ns, "Check if Child Process using the " + filename + " script is running.")
  let running = false
  let pid_found
  let server_name
  for (let server in RAM_INFO) {
    for(let pid in RAM_INFO[server].processes) {
      if (RAM_INFO[server].processes[pid].filename == filename) {
        running = ns.isRunning(parseInt(pid))
        server_name = server
        pid_found = pid
        log(ns, "Child Process using the " + filename + " script found on \"" + server_name + "\", Running Status: " + running)
      }
    }
  }

  if (!(pid_found === undefined)) {
    if (!running) {
      log(ns, "Clean up RAM State since Child Process was not runing.")
      delete RAM_INFO[server_name].processes[pid_found]
    }
  }

  return {
    running: running
   ,server : server_name
   ,pid    : pid_found
  }
}
/**
 * @param {import("@ns").NS} ns - NetScript Environment
 * @param {string} filename - Script to Launch
 * @param {string?} server
 */
async function launch_child(ns, filename, server) {

  let get_new_server = (server === undefined)
  let server_to_use = server
  let ram_needed = ns.getScriptRam(filename)
  
  if (get_new_server) {
    let ram_response = await request_ram(ns, ram_needed)
    if (!(ram_response.result === "OK")) {
      log(ns, "ERROR RAM Manager failed to provide RAM to launch child" + filename + "process.")
      log(ns, JSON.stringify(ram_response))
      ns.tprint("ERROR RAM Manager failed to provide RAM to launch child" + filename + "process.")
      ns.tprint(JSON.stringify(ram_response))
      return Promise.resolve(pid)
    }
    server_to_use = ram_response.server
  }

  ns.enableLog("exec")
  let pid = ns.exec(filename, server_to_use, {threads:1,temporary:true})
  ns.disableLog("exec")
  if (pid === 0) {ns.tprint(`ERROR Exec failed to launch child process ${filename} despite RAM Manager providing RAM`)}
  else           {add_child_process(ns, pid, filename, server_to_use)}

  return Promise.resolve(pid)
}

/**
 *  @param {import("@ns").NS} ns
 */
async function start_managers(ns, control_info) {
  log(ns, "Calculate amount of RAM we need for our managers.")
  let ram_needed = 0
  ram_needed += ns.getScriptRam((IN_DEV ? "/development" : "") + "/scripts/manage_hacking_v4.js")
  log(ns, "Add Hack/Prep Manager Manager script RAM. Total: " + ram_needed)
  if (ns.getServerMaxRam("home") >= 64) {
    ram_needed += ns.getScriptRam((IN_DEV ? "/development" : "") + "/scripts/manage_hacknet_v4.js")
    log(ns, "Add Hacknet Manager script RAM. Total: " + ram_needed)
    ram_needed += ns.getScriptRam((IN_DEV ? "/development" : "") + "/scripts/manage_pservers_v4.js")
    log(ns, "Add Hack/Prep Manager Manager script RAM. Total: " + ram_needed)
  }
  if (ns.getServerMaxRam("home") >= 128) {
    ram_needed += ns.getScriptRam((IN_DEV ? "/development" : "") + "/scripts/manage_codecontracts.js")
    log(ns, "Add Code Contract Manager script RAM. Total: " + ram_needed)
    ram_needed += ns.getScriptRam((IN_DEV ? "/development" : "") + "/scripts/manage_free_ram_v3.js")
    log(ns, "Add Free RAM Manager script RAM. Total: " + ram_needed)
    ram_needed += ns.getScriptRam((IN_DEV ? "/development" : "") + "/scripts/manage_gang.js")
    log(ns, "Add Gang Manager script RAM. Total: " + ram_needed)
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
      let calc_assigned_ram = round_ram_cost(RAM_INFO[ram_response.server].assigned_ram + ram_response.amount)
      let calc_free_ram = round_ram_cost(RAM_INFO[ram_response.server].free_ram + ram_response.amount)
      RAM_INFO[ram_response.server].assigned_ram = calc_assigned_ram
      RAM_INFO[ram_response.server].free_ram = calc_free_ram
    }
    else {
      RAM_INFO[ram_response.server] = {
        assigned_ram: ram_response.amount
       ,free_ram: ram_response.amount
      }
    }
    log(ns,"Server \"" + ram_response.server + "\" has had " + ram_response.amount + " RAM assigned to us.")
  }

  let pid = ns.exec((IN_DEV ? "/development" : "") + "/scripts/manage_hacking_v4.js",ram_response.server,{threads:1,temporary:true})
  if (pid === 0) {
    log(ns, "ERROR Failed to launch Hack/Prep Manager Manager after being allocated RAM.")
    ns.tprint("ERROR Failed to launch Hack/Prep Manager Manager after being allocated RAM.")
  }
  else {
    add_child_process(ns,pid,(IN_DEV ? "/development" : "") + "/scripts/manage_hacking_v4.js",ram_response.server)
    control_info.hacking_manager_pid = pid
  }

  if (ns.getServerMaxRam("home") >= 64) {
    pid = ns.exec((IN_DEV ? "/development" : "") + "/scripts/manage_hacknet_v4.js",ram_response.server,{threads:1,temporary:true})
    if (pid === 0) {
      log(ns, "ERROR Failed to launch Automatic Hacknet Upgrade Manager after being allocated RAM.")
      ns.tprint("ERROR Failed to launch Automatic Hacknet Upgrade Manager after being allocated RAM.")
    }
    else {
      add_child_process(ns,pid,(IN_DEV ? "/development" : "") + "/scripts/manage_hacknet_v4.js",ram_response.server)
      control_info.hacknet_manager_pid = pid
    }
  
    pid = ns.exec((IN_DEV ? "/development" : "") + "/scripts/manage_pservers_v3.js",ram_response.server,{threads:1,temporary:true})
    if (pid === 0) {
      log(ns, "ERROR Failed to launch Automatic Personal Server Manager after being allocated RAM.")
      ns.tprint("ERROR Failed to launch Automatic Personal Server Manager after being allocated RAM.")
    }
    else {
      add_child_process(ns,pid,(IN_DEV ? "/development" : "") + "/scripts/manage_pservers_v3.js",ram_response.server)
      control_info.pserver_manager_pid = pid
    }
    // Either of these two processes can enqueue the Free Ram Manager
  }

  if (ns.getServerMaxRam("home") >= 128) {
    pid = ns.exec((IN_DEV ? "/development" : "") + "/scripts/manage_codecontracts.js",ram_response.server,{threads:1,temporary:true})
    if (pid === 0) {
      log(ns, "ERROR Failed to launch Code Contract Manager after being allocated RAM.")
      ns.tprint("ERROR Failed to launch Code Contract Manager after being allocated RAM.")
    }
    else {
      add_child_process(ns,pid,(IN_DEV ? "/development" : "") + "/scripts/manage_codecontracts.js",ram_response.server)
      control_info.code_contract_manager_pid = pid
    }

    pid = ns.exec((IN_DEV ? "/development" : "") + "/scripts/manage_gang.js",ram_response.server,{threads:1,temporary:true})
    if (pid === 0) {
      log(ns, "ERROR Failed to launch Gang Manager after being allocated RAM.")
      ns.tprint("ERROR Failed to launch Gang Manager after being allocated RAM.")
    }
    else {
      add_child_process(ns,pid,(IN_DEV ? "/development" : "") + "/scripts/manage_gang.js",ram_response.server)
      control_info.gang_manager_pid = pid
    }
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

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const CONTROL_PARAM_HANDLER = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(PORT_IDS.BITNODE_MULTS_HANDLER)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)
  const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(PORT_IDS.RAM_REQUEST_HANDLER)
  const RAM_PROVIDE_HANDLER   = ns.getPortHandle(PORT_IDS.RAM_PROVIDE_HANDLER)
  let control_info = new ProcessInfo

  init(ns)
  update_TUI(ns, control_info, true)
  ns.ui.openTail()
  ns.ui.resizeTail(X_SIZE, Y_SIZE)


  ns.ui.setTailTitle("Control Script V4.0 - PID: " + ns.pid)
  control_info.control_pid = ns.pid

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
    await ns.sleep(4)
  }

  log(ns,"Gather Statistics of the environment we are working in.")

  log(ns,"Ensure our control parameters are written to their ports.")
  await populate_information_ports(ns, control_info, CONTROL_PARAM_HANDLER, BITNODE_MULTS_HANDLER, SERVER_INFO_HANDLER)
  update_TUI(ns, control_info, true)

  log(ns,"Start the RAM manager.")
  await start_ram_manager(ns, control_info, RAM_PROVIDE_HANDLER)
  update_TUI(ns, control_info, true)

  log(ns,"Start our other managers.")
  await start_managers(ns, control_info)
  update_TUI(ns, control_info, true)

  log(ns,"Starting Loop")
  while(true){
    log(ns, "Awaiting Update we can act on.")
    update_TUI(ns, control_info)
    let awaiting_update = true
    let update = {}
    while (awaiting_update) {
      while(UPDATE_HANDLER.empty()) {
        await ns.sleep(4)
        update_TUI(ns, control_info)
      }
      update = JSON.parse(UPDATE_HANDLER.peek())
      if (
          update.action === "request_action"
      ||  update.action === "death_react"
      ) {
        log(ns, "Update for us to act on has arrive:\n" + UPDATE_HANDLER.peek())
        awaiting_update = false 
        UPDATE_HANDLER.read()
      }
      else {
        await ns.sleep(4)
      }
    }

    //log(ns,"Action Type: " + update.action)
    if (update.action === "request_action") {
      log(ns,"Performing Request Action")
      // let request_action = update.request_action
      // let server_to_target = request_action.target 
      // let ram_needed = 0
      let filename = ""
      let pid
      let run_resp
      switch (update.request_action.script_action) {
        case "params":
          // Launch Control Parameters script
          filename = (IN_DEV ? "/development" : "") + "/scripts/util/control_parameters.js"
          run_resp = child_is_running(ns, filename)
          if (run_resp.running) {
            ns.kill(run_resp.pid)
            remove_child_process(ns, run_resp.pid, filename, run_resp.server)
            control_info.control_parameters_pid = NaN
          }
          pid = await launch_child(ns, filename, run_resp.server)
          control_info.control_parameters_pid = pid
          break
        case "BNMult":
          // Launch Populate Bitnode Multipliers script
          filename = (IN_DEV ? "/development" : "") + "/scripts/util/bitnode_modifiers.js"
          if (!child_is_running(ns, filename)) {
            pid = await launch_child(ns, filename)
            control_info.bitnode_modifiers_run = true
          }
          break
        case "reboot":
          // Launch RAM Manager script
          filename = (IN_DEV ? "/development" : "") + "/scripts/reboot.js"
          if (!child_is_running(ns, filename)) {
            ns.exec(filename)
          }
          break
        case "manager":
          // Launch Hack/Prep Manager Manager script
          filename = (IN_DEV ? "/development" : "") + "/scripts/manage_hacking_v4.js"
          if (!child_is_running(ns, filename)) {
            pid = await launch_child(ns, filename)
            control_info.hacking_manager_pid = pid
          }
          break
        case "hacknet":
          // Launch Automatic Hacknet Upgrade Manager script
          filename = (IN_DEV ? "/development" : "") + "/scripts/manage_hacknet_v4.js"
          if (!child_is_running(ns, filename)) {
            pid = await launch_child(ns, filename)
            control_info.hacknet_manager_pid = pid
          }
          break
        case "pserver":
          // Launch Automatic Personal Server Manager script
          filename = (IN_DEV ? "/development" : "") + "/scripts/manage_pservers_v3.js"
          if (!child_is_running(ns, filename)) {
            pid = await launch_child(ns, filename)
            control_info.pserver_manager_pid = pid
          }
          break
        case "freeram":
          // Launch Free RAM Consumer script
          filename = (IN_DEV ? "/development" : "") + "/scripts/manage_free_ram_v3.js"
          if (!child_is_running(ns, filename)) {
            pid = await launch_child(ns, filename)
            control_info.free_ram_manager_pid = pid
          }
          break
        case "reboot_freeram":
          // Kill and then Relaunch Free RAM Consumer script
          filename = (IN_DEV ? "/development" : "") + "/scripts/manage_free_ram_v3.js"
          run_resp = child_is_running(ns, filename)
          if (run_resp.running) {
            ns.tprint(run_resp.pid)
            ns.kill(parseInt(run_resp.pid))
            remove_child_process(ns, run_resp.pid, filename, run_resp.server)
            control_info.free_ram_manager_pid = NaN
          }
          pid = await launch_child(ns, filename, run_resp.server)
          control_info.free_ram_manager_pid = pid
          break
        case "cctmang":
          // Launch Code Contract Manager script
          filename = (IN_DEV ? "/development" : "") + "/scripts/manage_codecontracts.js"
          if (!child_is_running(ns, filename)) {
            pid = await launch_child(ns, filename)
            control_info.code_contract_manager_pid = pid
          }
          break
        case "reboot_gang":
          // Kill and then Relaunch Gang Manger script
          filename = (IN_DEV ? "/development" : "") + "/scripts/manage_gang.js"
          run_resp = child_is_running(ns, filename)
          if (run_resp.running) {
            ns.tprint(run_resp.pid)
            ns.kill(parseInt(run_resp.pid))
            remove_child_process(ns, run_resp.pid, filename, run_resp.server)
            control_info.gang_manager_pid = NaN
          }
          pid = await launch_child(ns, filename, run_resp.server)
          control_info.gang_manager_pid = pid
          break
      }
      if (filename === "") {
        ns.tprint("ERROR Action '" + update.request_action.script_action + "' requested, but not known.")
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
    await ns.sleep(4)
  }
}