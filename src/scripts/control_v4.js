import { PORT_IDS } from "/src/scripts/boot/manage_ports"
import { ExecRequestPayload, KillRequestPayload, request_exec, request_kill } from "/src/scripts/core/manage_exec"

import { COLOUR, colourize } from "/src/scripts/util/constant_utilities"
import { make_request, RAM_MESSAGES, RAMRequest, RAMRequestPayload, RAMResponse } from "/src/scripts/util/ram_management"
import { round_ram_cost } from "/src/scripts/util/rounding"

const LOG_COLOUR = colourize(COLOUR.MINT,9)
const DEF_COLOUR = colourize(COLOUR.DEFAULT)
const DO_LOG = true
const LOG_FILENAME = "logs/control_servers_curr.txt"
const PRIOR_LOG_FILENAME = "logs/control_servers_prior.txt"
const X_SIZE = 425
const Y_SIZE = 274

class ChildProcessInfo {
  /** @type {number} */
  pid;
  /** @type {number} */
  ram_cost;
  /** @type {string} */
  filename;

  constructor(pid, ram_cost, filename) {
    this.pid = pid
    this.ram_cost = ram_cost
    this.filename = filename
  }
}

class ServerInfo {
  /** @type {number} */
  assigned_ram;
  /** @type {number} */
  unused_ram;
  /** @type {Object<number,ChildProcessInfo>} */
  processes = {};
  
  constructor(assigned_ram) {
    this.assigned_ram = assigned_ram
    this.unused_ram = assigned_ram
  }

  add_ram(ram) {
    this.assigned_ram = round_ram_cost(this.assigned_ram + ram)
    this.unused_ram = round_ram_cost(this.unused_ram + ram)
    return true
  }

  remove_ram(ram) {
    if (this.unused_ram < ram) {
      return false
    }
    this.assigned_ram = round_ram_cost(this.assigned_ram - ram)
    this.unused_ram = round_ram_cost(this.unused_ram - ram)
    return true
  }

  /**
   * @param {import("@ns").NS} ns 
   * @param {number} pid 
   * @param {number} ram_cost 
   * @param {string} filename 
   * @returns 
   */
  add_process(ns, pid, ram_cost, filename) {
    if (!(this.processes[pid] === undefined)) {
      ns.tprint(`Process with PID ${pid} already in state.`)
      return false
    }
    if (ram_cost > this.unused_ram) {
      ns.tprint(`Ram Cost of ${ram_cost} unable to be allocated.`)
      return false
    }
    this.processes[pid] = new ChildProcessInfo(pid, ram_cost, filename)
    this.unused_ram = round_ram_cost(this.unused_ram - ram_cost)
    return true
  }


  /**
   * @param {import("@ns").NS} ns 
   */
  remove_dead(ns) {
    for (let n in this.processes) {
      if (ns.isRunning(parseInt(n))) {continue}
      this.remove_process(ns, n)
    }
  }

  remove_process(ns, pid) {
    if (this.processes[pid] === undefined) {
      ns.tprint(`Process with PID ${pid} not in state`)
      return false
    }
    this.unused_ram = round_ram_cost(this.unused_ram + this.processes[pid].ram_cost)
    delete this.processes[pid]
  }
}

class RamInfo {
  /** @type {Object<string,ServerInfo>} */
  servers = {};

  constructor() {}

  /**
   * @param {string} server
   * @param {number} assigned_ram
   */
  add_server(server, assigned_ram) {
    this.servers[server] = new ServerInfo(assigned_ram)
  }
}

class ProcessInfo {
  /** This is this process */
  control_pid = NaN;
  /** This is the process that handles executing new processes */
  exec_manager_pid = NaN;
  /** This is the process that handles the Controls that determine script behaviours */
  control_parameters_pid = NaN;
  /** This is the process that handles finding servers and maintains our 'view' of all those servers*/
  server_scan_manager_pid = NaN;
  /** This is the process that deals with parcelling out RAM to other processes */
  ram_manager_pid = NaN;
  /** This is the process that handles rooting new servers and putting scripts on them */
  root_manager_pid = NaN;
  /** This is the process that launches batching and batch-prep processes */
  hacking_manager_pid = NaN;
  /** This is the process that deals with purchasing hacknet servers and hash upgrades */
  hacknet_manager_pid = NaN;
  /** This is the process that deals with purchasing personal servers and their upgrades */
  pserver_manager_pid = NaN;
  /** This is the process that checks for code contracts and spawns solvers */
  code_contract_manager_pid = NaN;
  /** This is the process that uses up free RAM on home and our presonal servers to generate hacking exp or sharing the RAM */
  free_ram_manager_pid = NaN;
  /** This is the process that autoamtically creates a gang is we can and then manages the gang */
  gang_manager_pid = NaN;
  /** This is the process that automatically handles our sleeves */
  sleeve_manager_pid = NaN;
  last_ui_update = NaN;

  /** @type {RamInfo} */
  ram_state;

  constructor() {
    this.ram_state = new RamInfo()
  }
}

const RAM_INFO = {
  //[server] = {
  //  assigned_ram: <number>,
  //  unused_ram  : <number>,
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
  log(ns, "Control Process Initializing...")
  disable_logs(ns)

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
 * @param {string} message 
 */
function log(ns, message) {
  if (DO_LOG) {
    ns.tprint(`INFO: ${message}`)
  }
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

  let name_column_length = 30
  const GOOD_COLOUR = colourize(COLOUR.LGREEN)
  const BAD_COLOUR = colourize(COLOUR.RED)

  if (!ns.isRunning(control_info.control_pid)) control_info.control_pid = NaN
  if (!ns.isRunning(control_info.exec_manager_pid)) control_info.exec_manager_pid = NaN
  if (!ns.isRunning(control_info.control_parameters_pid)) control_info.control_parameters_pid = NaN
  if (!ns.isRunning(control_info.server_scan_manager_pid)) control_info.server_scan_manager_pid = NaN
  if (!ns.isRunning(control_info.root_manager_pid)) control_info.root_manager_pid = NaN
  if (!ns.isRunning(control_info.ram_manager_pid)) control_info.ram_manager_pid = NaN
  if (!ns.isRunning(control_info.hacking_manager_pid)) control_info.hacking_manager_pid = NaN
  if (!ns.isRunning(control_info.hacknet_manager_pid)) control_info.hacknet_manager_pid = NaN
  if (!ns.isRunning(control_info.pserver_manager_pid)) control_info.pserver_manager_pid = NaN
  if (!ns.isRunning(control_info.code_contract_manager_pid)) control_info.code_contract_manager_pid = NaN
  if (!ns.isRunning(control_info.free_ram_manager_pid)) control_info.free_ram_manager_pid = NaN
  if (!ns.isRunning(control_info.gang_manager_pid)) control_info.gang_manager_pid = NaN
  if (!ns.isRunning(control_info.sleeve_manager_pid)) control_info.sleeve_manager_pid = NaN

  /** @type {string[]} */
  let processes = []

  processes.push("Control Process".padEnd(name_column_length)               + ": " + (isNaN(control_info.control_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  processes.push("Exec Manager Process".padEnd(name_column_length)          + ": " + (isNaN(control_info.exec_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  processes.push("Control Parameters Process".padEnd(name_column_length)    + ": " + (isNaN(control_info.control_parameters_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  processes.push("Server Scan Manager Process".padEnd(name_column_length)   + ": " + (isNaN(control_info.server_scan_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  processes.push("Rooting Manager Process".padEnd(name_column_length)       + ": " + (isNaN(control_info.root_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  processes.push("RAM Manager Process".padEnd(name_column_length)           + ": " + (isNaN(control_info.ram_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  processes.push("Hacking Manager Process".padEnd(name_column_length)       + ": " + (isNaN(control_info.hacking_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  processes.push("Hacknet Manager Process".padEnd(name_column_length)       + ": " + (isNaN(control_info.hacknet_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  processes.push("PServer Manager Process".padEnd(name_column_length)       + ": " + (isNaN(control_info.pserver_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  processes.push("Code Contract Manager Process".padEnd(name_column_length) + ": " + (isNaN(control_info.code_contract_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  processes.push("Free RAM Manager Process".padEnd(name_column_length)      + ": " + (isNaN(control_info.free_ram_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  processes.push("Gang Manager Process".padEnd(name_column_length)          + ": " + (isNaN(control_info.gang_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)
  processes.push("Sleeve Manager Process".padEnd(name_column_length)        + ": " + (isNaN(control_info.sleeve_manager_pid) ? BAD_COLOUR + "NOT RUNNING" : GOOD_COLOUR + "RUNNING") + DEF_COLOUR)

  
  ns.clearLog()
  for (let string of processes) {
    ns.print(string)
  }

  
  let y_size = 0
  let height_for_title_bar = 33
  let height_per_line = 24
  y_size = height_for_title_bar + (height_per_line * processes.length)
  let tail_properties = ns.self().tailProperties
  if (!(tail_properties === null)) {
    if (!(tail_properties.height === y_size) || !(tail_properties.width === X_SIZE)) {
      ns.ui.resizeTail(X_SIZE, y_size)
    }
  }
}

/**
 * @param {import("@ns").NS} ns
 * @param {ProcessInfo} control_info
 * @param {import("@ns").NetscriptPort} scan_provide_handler
 */
async function start_server_scanner(ns, control_info, scan_provide_handler) {
  let exec_payload = new ExecRequestPayload(
    ns.pid,
    "/scripts/core/manage_server_scanning.js",
    "home",
    {threads:1,temporary:true},
    ["--parent_pid", ns.pid]
  )
  let pid = await request_exec(ns, exec_payload)
  if (pid === 0) {
    ns.tprint("ERROR: Failed to launch Server Scan Manager.")
    ns.exit()
  }
  control_info.server_scan_manager_pid = pid

  while(scan_provide_handler.empty()) {
    await ns.sleep(4)
  }

  let init_response = JSON.parse(scan_provide_handler.peek())
  if (
        init_response.action === "scan_init"
    &&  parseInt(init_response.payload.requester) === ns.pid
  ) {
    scan_provide_handler.read()
  }
  else {
    ns.tprint(`ERROR: First message in Scan Provide Handler is not a 'scan_init' response.`)
    ns.tprint(`ERROR: Instead recieved: ${JSON.stringify(init_response)}`)
    ns.exit()
  }
}

/**
 * @param {import("@ns").NS} ns Netscript Environment
 * @param {import("@ns").NetscriptPort} control_param_handler
 * @param {import("@ns").NetscriptPort} bitnode_mults_handler
 * @param {import("@ns").NetscriptPort} server_info_handler
 */
async function populate_information_ports(ns, control_info, control_param_handler, bitnode_mults_handler, server_info_handler) {
  let exec_payload = new ExecRequestPayload(
    ns.pid,
    "/scripts/util/bitnode_modifiers.js",
    "home",
    {threads:1,temporary:true},
    ["--parent_pid", ns.pid]
  )
  let pid = await request_exec(ns, exec_payload)
  if (pid === 0) {
    ns.tprint("ERROR: Failed to launch BitNode Multipliers script.")
    ns.exit()
  }

  while(bitnode_mults_handler.empty()) {
    await ns.sleep(4)
  }
  control_info.bitnode_modifiers_run = true

  exec_payload = new ExecRequestPayload(
    ns.pid,
    "/scripts/core/manage_control_parameters.js",
    "home",
    {threads:1,temporary:true},
    ["--parent_pid", ns.pid]
  )
  let control_pid = await request_exec(ns, exec_payload)
  if (control_pid === 0) {
    ns.tprint("ERROR: Failed to launch Control Parameters script.")
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
 * @param {ProcessInfo} control_info 
 * @param {import("@ns").NetscriptPort} ram_provide_handler - Port that returns RAM request outcomes
 */
async function start_ram_manager(ns, control_info, ram_provide_handler) {
  let exec_payload = new ExecRequestPayload(
    ns.pid,
    "/scripts/core/manage_ram_v3.js",
    "home",
    {threads:1,temporary:true},
    ["--parent_pid", ns.pid]
  )
  let ram_pid = await request_exec(ns, exec_payload)

  if(ram_pid === 0) {
    ns.tprint(ns, "ERROR: Failed to launch RAM Manager script.")
    ns.exit()
  }
  log(ns, "RAM Manager launched successfully. Await RAM Manager Initialisation.")
  control_info.ram_manager_pid = ram_pid
  
  let awaiting_response = true
  /** @type {RAMResponse} */
  let resp
  while (awaiting_response) {
    while(ram_provide_handler.empty()) {
      await ns.sleep(4)
    }
    resp = JSON.parse(ram_provide_handler.peek())
    if (parseInt(resp.payload.pid) === ns.pid) {
      awaiting_response = false
      ram_provide_handler.read()
    }
    else {
      await ns.sleep(4)
    }
  }

  if (!(resp.payload.result === "OK")) {
    ns.tprint("ERROR: RAM Manager did not Initialise successfully:")
    ns.tprint(JSON.stringify(resp))
    ns.exit()
  }
  log(ns, "RAM Manager Initialised successfully.")

  let control_ram = ns.getScriptRam("/scripts/control_v4.js")
  let exec_ram    = ns.getScriptRam("/scripts/core/manage_exec.js")
  let param_ram   = ns.getScriptRam("/scripts/core/manage_control_parameters.js")
  let ram_ram     = ns.getScriptRam("/scripts/core/manage_ram_v3.js")
  let scan_ram    = ns.getScriptRam("/scripts/core/manage_server_scanning.js")
  let total_ram   = round_ram_cost(
      control_ram
    + exec_ram
    + scan_ram
    + param_ram
    + ram_ram
  )

  let payload = new RAMRequestPayload(ns.self().pid, ns.self().filename, total_ram)
  let request = new RAMRequest(RAM_MESSAGES.RAM_REQUEST, payload)
  let ram_resp = await make_request(ns, request)

  if (!(ram_resp.payload.result === "OK")) {
    ns.tprint("ERROR: RAM Manager somehow failed to provide RAM for its, this and the control_parameter scripts existance despite all of them running up until this point")
    ns.tprint(JSON.stringify(ram_resp))
    ns.exit()
  }
  else if (!(ram_resp.payload.host === "home")) {
    ns.tprint(`ERROR: RAM Manager provided RAM on a server other than 'home' despite all of them being launched using ns.run(). Server: ${ram_resp.payload.host}`)
    ns.exit()
  }
  else {
    control_info.ram_state.add_server(ram_resp.payload.host, ram_resp.payload.amount)
    control_info.ram_state.servers[ram_resp.payload.host].add_process(ns, ns.pid                              , control_ram, "/scripts/control_v4.js")
    control_info.ram_state.servers[ram_resp.payload.host].add_process(ns, control_info.exec_manager_pid       , exec_ram   , "/scripts/core/manage_exec.js")
    control_info.ram_state.servers[ram_resp.payload.host].add_process(ns, control_info.server_scan_manager_pid, scan_ram   , "/scripts/core/manage_server_scanning.js")
    control_info.ram_state.servers[ram_resp.payload.host].add_process(ns, control_info.control_parameters_pid , param_ram  , "/scripts/core/manage_control_parameters.js")
    control_info.ram_state.servers[ram_resp.payload.host].add_process(ns, ram_pid                             , ram_ram    , "/scripts/core/manage_ram_v3.js")
  }

  log(ns,"RAM Manager has provided RAM for its own, this, the control parameter, server scanner and execution manager processes use.")
  log(ns,`Server ${ram_resp.payload.host} has ${control_info.ram_state.servers[ram_resp.payload.host].assigned_ram} assigned RAM and ${control_info.ram_state.servers[ram_resp.payload.host].unused_ram} remaining unsued assigned RAM.`)

  return Promise.resolve()
}

/**
 * @param {import("@ns").NS} ns
 * @param {ProcessInfo} control_info
 */
async function start_managers(ns, control_info) {
  let home_ram = ns.getServerMaxRam("home")
  log(ns, "Calculate amount of RAM we need for our managers.")
  let root_ram    = ns.getScriptRam("/scripts/manage_rooting.js")
  let batch_ram   = ns.getScriptRam("/scripts/manage_hacking_v4.js")
  let hashnet_ram = ns.getScriptRam("/scripts/manage_hacknet_v4.js")
  let pserv_ram   = ns.getScriptRam("/scripts/manage_pservers_v3.js")
  let cct_ram     = ns.getScriptRam("/scripts/manage_codecontracts.js")
  let free_ram    = ns.getScriptRam("/scripts/manage_free_ram_v3.js")
  let gang_file   = "/scripts/manage_initial_gang.js"
  let sleeve_file = "/scripts/manage_initial_sleeves.js"
  if (home_ram > 128) {
    gang_file   = "/scripts/manage_gang.js"
    sleeve_file = "/scripts/manage_sleeves.js"
  }
  let gang_ram    = ns.getScriptRam(gang_file)
  let sleeve_ram  = ns.getScriptRam(sleeve_file)
  let ram_needed  = round_ram_cost(
      root_ram
    + batch_ram
    + hashnet_ram
    + pserv_ram
    + cct_ram
    + free_ram
    + gang_ram
    + sleeve_ram
  )

  let pad_cnt = 23
  log(ns, "  Rooting Manager".padEnd(pad_cnt) + " ║ " + ns.formatRam(root_ram).padStart(8))
  log(ns, "  Batch/Prep Manager".padEnd(pad_cnt) + " ║ " + ns.formatRam(batch_ram).padStart(8))
  log(ns, "  Hashnet Manager".padEnd(pad_cnt) + " ║ " + ns.formatRam(hashnet_ram).padStart(8))
  log(ns, "  PServ Manager".padEnd(pad_cnt) + " ║ " + ns.formatRam(pserv_ram).padStart(8)) 
  log(ns, "  Code Contract Manager".padEnd(pad_cnt) + " ║ " + ns.formatRam(cct_ram).padStart(8))
  log(ns, "  Free RAM Manager".padEnd(pad_cnt) + " ║ " + ns.formatRam(free_ram).padStart(8))
  log(ns, "  Gang Manager".padEnd(pad_cnt) + " ║ " + ns.formatRam(gang_ram).padStart(8))
  log(ns, "  Sleeve Manager".padEnd(pad_cnt) + " ║ " + ns.formatRam(sleeve_ram).padStart(8)) 
  log(ns, "  ".padEnd(pad_cnt+1,"═") + "╬".padEnd(10,"═"))
  log(ns, "  Total".padEnd(pad_cnt) + " ║ " + ns.formatRam(ram_needed).padStart(8))

  log(ns, "Request " + ram_needed + " RAM for our other Manager processes.")

  let payload = new RAMRequestPayload(ns.self().pid, ns.self().filename, ram_needed)
  let request = new RAMRequest(RAM_MESSAGES.RAM_REQUEST, payload)
  let ram_resp = await make_request(ns, request)

  if (!(ram_resp.payload.result === "OK")) {
    ns.tprint(`ERROR: RAM Manager failed to provide RAM (${ram_needed}) for the Manager processes.`)
    ns.tprint(JSON.stringify(ram_resp))
    ns.exit()
  }
  else if (!(ram_resp.payload.host === "home")) {
    ns.tprint(`ERROR: RAM Manager provided RAM on a server other than 'home'. Server: ${ram_resp.payload.host}`)
    ns.exit()
  }
  else {
    control_info.ram_state.servers[ram_resp.payload.host].add_ram(ram_resp.payload.amount)
    log(ns,"Server \"" + ram_resp.payload.host + "\" has had " + ram_resp.payload.amount + " additional RAM assigned to us.")
  }

  let exec_payload = new ExecRequestPayload(
    ns.pid,
    "/scripts/manage_rooting.js",
    "home",
    {threads:1,temporary:true},
    ["--parent_pid", ns.pid]
  )
  let pid = await request_exec(ns, exec_payload)
  if (pid === 0) {
    ns.tprint("ERROR: Failed to launch Rooting Manager after being allocated RAM.")
  }
  else {
    control_info.ram_state.servers[ram_resp.payload.host].add_process(ns, pid, root_ram, "/scripts/manage_rooting.js")
    control_info.root_manager_pid = pid
  }

  exec_payload = new ExecRequestPayload(
    ns.pid,
    "/scripts/manage_hacking_v4.js",
    "home",
    {threads:1,temporary:true},
    ["--parent_pid", ns.pid]
  )
  pid = await request_exec(ns, exec_payload)
  if (pid === 0) {
    ns.tprint("ERROR: Failed to launch Hack/Prep Manager Manager after being allocated RAM.")
  }
  else {
    control_info.ram_state.servers[ram_resp.payload.host].add_process(ns, pid, batch_ram, "/scripts/manage_hacking_v4.js")
    control_info.hacking_manager_pid = pid
  }

  if (ns.getServerMaxRam("home") >= 64) {
    exec_payload = new ExecRequestPayload(
      ns.pid,
      "/scripts/manage_hacknet_v4.js",
      "home",
      {threads:1,temporary:true},
      ["--parent_pid", ns.pid]
    )
    pid = await request_exec(ns, exec_payload)
    if (pid === 0) {
      ns.tprint("ERROR: Failed to launch Automatic Hacknet Upgrade Manager after being allocated RAM.")
    }
    else {
      control_info.ram_state.servers[ram_resp.payload.host].add_process(ns, pid, hashnet_ram, "/scripts/manage_hacknet_v4.js")
      control_info.hacknet_manager_pid = pid
    }
  
    exec_payload = new ExecRequestPayload(
      ns.pid,
      "/scripts/manage_pservers_v3.js",
      "home",
      {threads:1,temporary:true},
      ["--parent_pid", ns.pid]
    )
    pid = await request_exec(ns, exec_payload)
    if (pid === 0) {
      ns.tprint("ERROR: Failed to launch Automatic Personal Server Manager after being allocated RAM.")
    }
    else {
      control_info.ram_state.servers[ram_resp.payload.host].add_process(ns, pid, pserv_ram, "/scripts/manage_pservers_v3.js")
      control_info.pserver_manager_pid = pid
    }
    // Either of these two processes can enqueue the Free Ram Manager
  }

  if (ns.getServerMaxRam("home") >= 128) {
    exec_payload = new ExecRequestPayload(
      ns.pid,
      "/scripts/manage_codecontracts.js",
      "home",
      {threads:1,temporary:true},
      ["--parent_pid", ns.pid]
    )
    pid = await request_exec(ns, exec_payload)
    if (pid === 0) {
      ns.tprint("ERROR: Failed to launch Code Contract Manager after being allocated RAM.")
    }
    else {
      control_info.ram_state.servers[ram_resp.payload.host].add_process(ns, pid, cct_ram, "/scripts/manage_codecontracts.js")
      control_info.code_contract_manager_pid = pid
    }

    exec_payload = new ExecRequestPayload(
      ns.pid,
      gang_file,
      "home",
      {threads:1,temporary:true},
      ["--parent_pid", ns.pid]
    )
    pid = await request_exec(ns, exec_payload)
    if (pid === 0) {
      ns.tprint("ERROR: Failed to launch Gang Manager after being allocated RAM.")
    }
    else {
      control_info.ram_state.servers[ram_resp.payload.host].add_process(ns, pid, gang_ram, gang_file)
      control_info.gang_manager_pid = pid
    }

    exec_payload = new ExecRequestPayload(
      ns.pid,
      sleeve_file,
      "home",
      {threads:1,temporary:true},
      ["--parent_pid", ns.pid]
    )
    pid = await request_exec(ns, exec_payload)
    if (pid === 0) {
      ns.tprint("ERROR: Failed to launch Sleeve Manager after being allocated RAM.")
    }
    else {
      control_info.ram_state.servers[ram_resp.payload.host].add_process(ns, pid, sleeve_ram, sleeve_file)
      control_info.sleeve_manager_pid = pid
    }
  }

  return Promise.resolve()
}

/**
 * 
 * @param {import("@ns").NS} ns 
 * @param {ProcessInfo} control_info
 * @param {number} old_pid 
 * @param {string} filename 
 */
async function reboot_process(ns, control_info, old_pid, filename) {
  // TODO: Write the function
  let server = control_info.ram_state.servers["home"]
  let ram_cost = ns.getScriptRam(filename)
  if (isNaN(old_pid)) {
    server.remove_dead(ns)
    let exec_payload = new ExecRequestPayload(
      ns.pid,
      filename,
      "home",
      {threads:1,temporary:true},
      ["--parent_pid", ns.pid]
    )
    let new_pid = await request_exec(ns, exec_payload)
    if (new_pid === 0) {
      ns.tprint(`ERROR: Failed to run '${filename}' on home`)
      return Promise.resolve(0)
    }
    let result = server.add_process(ns, new_pid, ram_cost, filename)
    if (result) {
      return Promise.resolve(new_pid)
    }
    else {
      let kill_payload = new KillRequestPayload(
        ns.pid
       ,new_pid
      )
      let kill_success = await request_kill(ns, kill_payload)
      ns.tprint(`ERROR: Failed to add '${filename}' to the RAM state.`)
      if (!kill_success) {
        ns.tprint(`ERROR: Failed to kill process ${new_pid} after failing to add it to the RAM state.`)
      }
      return Promise.resolve(0)
    }
  }
  else {
    if (control_info.ram_state.servers["home"].processes[old_pid] === undefined) {
      ns.tprint(`ERROR: PID ${old_pid} not found in RAM State on 'home' server`)
      return Promise.resolve(0)
    }
    let old_process = server.processes[old_pid]
    if (!(old_process.filename == filename)) {
      ns.tprint(`ERROR: PID ${old_pid} is not running '${filename}', instead running '${old_process.filename}'`)
      return Promise.resolve(0)
    }
    if (ram_cost == old_process.ram_cost) {
      // Simplest Case: Ram costs of the two scripts are the same, simply replace the running script
      let kill_payload = new KillRequestPayload(
        ns.pid
       ,old_pid
      )
      let kill_success = await request_kill(ns, kill_payload)
      if (!kill_success) {ns.tprint(`ERROR: Failed to kill PID ${old_pid} despite it running.`)}
      server.remove_process(ns, old_pid)
      let exec_payload = new ExecRequestPayload(
        ns.pid,
        filename,
        "home",
        {threads:1,temporary:true},
        ["--parent_pid", ns.pid]
      )
      let new_pid = await request_exec(ns, exec_payload)
      if (new_pid === 0) {
        ns.tprint(`ERROR: Failed to run '${filename}' on home.`)
        return Promise.resolve(0)
      }
      let result = server.add_process(ns, new_pid, ram_cost, filename)
      if (result) {
        return Promise.resolve(new_pid)
      }
      else {
        let kill_payload = new KillRequestPayload(
          ns.pid
        ,new_pid
        )
        let kill_success = await request_kill(ns, kill_payload)
        ns.tprint(`ERROR: Failed to add '${filename}' to the RAM state.`)
        if (!kill_success) {
          ns.tprint(`ERROR: Failed to kill process ${new_pid} after failing to add it to the RAM state.`)
        }
        return Promise.resolve(0)
      }
    }
    if (ram_cost != old_process.ram_cost) {
      // New RAM Cost is larger than the Old RAM Cost
      // Probably best to just reboot
      let kill_payload = new KillRequestPayload(
        ns.pid
       ,old_pid
      )
      let kill_success = await request_kill(ns, kill_payload)
      if (!kill_success) {ns.tprint(`ERROR: Failed to kill PID ${old_pid} despite it running.`)}
      let boot_pid = 0
      while (boot_pid === 0) {
        let exec_payload = new ExecRequestPayload(
          ns.pid,
          "/scripts/boot/reboot.js",
          "home",
          {threads:1,temporary:true},
          ["--all"]
        )
        boot_pid = await request_exec(ns, exec_payload)
        await ns.sleep(4)
      }
      // I mean we probably won't get much further than this due to reboot being called, but still better than not returning a value
      return Promise.resolve(0)
    }
    return Promise.resolve(0)
  }
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const CONTROL_PARAM_HANDLER = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(PORT_IDS.BITNODE_MULTS_HANDLER)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)
  const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(PORT_IDS.RAM_REQUEST_HANDLER)
  const RAM_PROVIDE_HANDLER   = ns.getPortHandle(PORT_IDS.RAM_PROVIDE_HANDLER)
  const SCAN_PROVIDE_HANDLER  = ns.getPortHandle(PORT_IDS.SCAN_PROVIDE_HANDLER)
  const arg_flags = ns.flags([
    ["exec_pid",NaN]
  ])
  let control_info = new ProcessInfo()
  control_info.exec_manager_pid = arg_flags.exec_pid
  control_info.control_pid = ns.pid

  init(ns)
  update_TUI(ns, control_info, true)
  ns.ui.openTail()
  ns.ui.resizeTail(X_SIZE, Y_SIZE)

  ns.ui.setTailTitle("Control Script V4.0 - PID: " + control_info.control_pid)

  log(ns,"Start the Server Scanner.")
  await start_server_scanner(ns, control_info, SCAN_PROVIDE_HANDLER)

  log(ns,"Ensure our control parameters are written to their ports.")
  await populate_information_ports(ns, control_info, CONTROL_PARAM_HANDLER, BITNODE_MULTS_HANDLER, SERVER_INFO_HANDLER)
  update_TUI(ns, control_info, true)

  log(ns,"Start the RAM manager.")
  await start_ram_manager(ns, control_info, RAM_PROVIDE_HANDLER)
  update_TUI(ns, control_info, true)

  log(ns,"Start our other managers.")
  await start_managers(ns, control_info)
  update_TUI(ns, control_info, true)

  log(ns,"Control Process online. Starting Program Loop.")
  while(true){
    update_TUI(ns, control_info)
    let awaiting_update = true
    let update = {}
    while (awaiting_update) {
      while(UPDATE_HANDLER.empty()) {
        await ns.sleep(4)
        update_TUI(ns, control_info)
      }
      if (typeof UPDATE_HANDLER.peek() === typeof {}) {ns.tprint(UPDATE_HANDLER.peek())}
      update = JSON.parse(UPDATE_HANDLER.peek())
      if (
          update.action === "request_action"
      ||  update.action === "death_react"
      ) {
        awaiting_update = false 
        UPDATE_HANDLER.read()
      }
      else {
        await ns.sleep(4)
      }
    }

    //log(ns,"Action Type: " + update.action)
    if (update.action === "request_action") {
      // let request_action = update.request_action
      // let server_to_target = request_action.target 
      // let ram_needed = 0
      let filename = ""
      let old_pid
      let pid
      switch (update.request_action.script_action) {
        case "reboot_ctrl_param":
          // Reboot the Control Parameter script
          filename = "/scripts/core/manage_control_parameters.js"
          old_pid = control_info.control_parameters_pid
          pid = await reboot_process(ns, control_info, old_pid, filename)
          if (pid === 0) {ns.tprint(`ERROR: Failed to reboot ${filename} (${old_pid}).`)}
          else {control_info.control_parameters_pid = pid}
          break
        case "reboot_server_scan":
          // Reboot the Server Scanning script
          filename = "/scripts/core/manage_server_scanning.js"
          old_pid = control_info.server_scan_manager_pid
          pid = await reboot_process(ns, control_info, old_pid, filename)
          if (pid === 0) {ns.tprint(`ERROR: Failed to reboot ${filename} (${old_pid}).`)}
          else {control_info.server_scan_manager_pid = pid}
          break
        case "reboot_server_info":
          // Reboot the Server Info Handler script
          filename = "/scripts/util/handle_server_info.js"
          old_pid = control_info.server_info_handler_pid
          pid = await reboot_process(ns, control_info, old_pid, filename)
          if (pid === 0) {ns.tprint(`ERROR: Failed to reboot ${filename} (${old_pid}).`)}
          else {control_info.server_info_handler_pid = pid}
          break
        case "reboot_root_manager":
          // Reboot the Rooting Manager script
          filename = "/scripts/manage_rooting.js"
          old_pid = control_info.root_manager_pid
          pid = await reboot_process(ns, control_info, old_pid, filename)
          if (pid === 0) {ns.tprint(`ERROR: Faile to reboot ${filename} (${old_pid}).`)}
          else {control_info.root_manager_pid = pid}
          break
        case "reboot_batch_manager":
          // Reboot the Hack/Prep Manager Manager script
          filename = "/scripts/manage_hacking_v4.js"
          old_pid = control_info.hacking_manager_pid
          pid = await reboot_process(ns, control_info, old_pid, filename)
          if (pid === 0) {ns.tprint(`ERROR: Failed to reboot ${filename} (${old_pid}).`)}
          else {control_info.hacking_manager_pid = pid}
          break
        case "reboot_hacknet":
          // Reboot the Hacknet Upgrade Manager script
          filename = "/scripts/manage_hacknet_v4.js"
          old_pid = control_info.hacknet_manager_pid
          pid = await reboot_process(ns, control_info, old_pid, filename)
          if (pid === 0) {ns.tprint(`ERROR: Failed to reboot ${filename} (${old_pid}).`)}
          else {control_info.hacknet_manager_pid = pid}
          break
        case "reboot_pserver":
          // Reboot the Personal Server Manager script
          filename = "/scripts/manage_pservers_v3.js"
          old_pid = control_info.pserver_manager_pid
          pid = await reboot_process(ns, control_info, old_pid, filename)
          if (pid === 0) {ns.tprint(`ERROR: Failed to reboot ${filename} (${old_pid}).`)}
          else {control_info.pserver_manager_pid = pid}
          break
        case "reboot_cctmang":
          // Reboot the Code Contract Manager script
          filename = "/scripts/manage_codecontracts.js"
          old_pid = control_info.code_contract_manager_pid
          pid = await reboot_process(ns, control_info, old_pid, filename)
          if (pid === 0) {ns.tprint(`ERROR: Failed to reboot ${filename} (${old_pid}).`)}
          else {control_info.code_contract_manager_pid = pid}
          break
        case "reboot_freeram":
          // Reboot the Free RAM Consumer script
          filename = "/scripts/manage_free_ram_v3.js"
          old_pid = control_info.free_ram_manager_pid
          pid = await reboot_process(ns, control_info, old_pid, filename)
          if (pid === 0) {ns.tprint(`ERROR: Failed to reboot ${filename} (${old_pid}).`)}
          else {control_info.free_ram_manager_pid = pid}
          break
        case "reboot_gang":
          // Reboot the Gang Manger script
          filename = "/scripts/manage_gang.js"
          old_pid = control_info.gang_manager_pid
          pid = await reboot_process(ns, control_info, old_pid, filename)
          if (pid === 0) {ns.tprint(`ERROR: Failed to reboot ${filename} (${old_pid}).`)}
          else {control_info.gang_manager_pid = pid}
          break
        case "reboot_sleeve_mgr":
          // Reboot the Sleeve Manager script
          filename = "/scripts/manage_sleeves.js"
          old_pid = control_info.sleeve_manager_pid
          pid = await reboot_process(ns, control_info, old_pid, filename)
          if (pid === 0) {ns.tprint(`ERROR: Failed to reboot ${filename} (${old_pid}).`)}
          else {control_info.sleeve_manager_pid = pid}
          break
      }
      if (filename === "") {
        ns.tprint("ERROR Action '" + update.request_action.script_action + "' requested, but not known.")
      }
       
    }
    else if (update.action === "death_react") {
      /** @type {number[]} */
      let pid_array = update.death_react.pids_to_kill
      
      for (let pid of pid_array) {
        let kill_payload = new KillRequestPayload(
          ns.pid
         ,parseInt(pid)
        )
        await request_kill(ns, kill_payload)
      }
    }
    await ns.sleep(4)
  }
}