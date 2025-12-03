import { ExecRequestPayload, request_exec } from "/src/scripts/core/manage_exec"
import { ServerStateInfo } from "/src/scripts/core/util_server_scanning";
import { ControlParameters } from "/src/scripts//core/util_control_parameters";

import { PORT_IDS } from "/src/scripts/boot/manage_ports"
import { make_request, RAM_MESSAGES, RAMReleasePayload, RAMRequest, RAMRequestPayload } from "/src/scripts/util/ram_management"

class ChildInfoMessage {
  action;
  payload;
  constructor() {}
}

class ChildProcessInfo {
  hostname;
  filename;
  ram_usage;
  ram_provided;
  target;
  pid;

  /**
   * @param {import("@ns").NS} ns
   * @param {string} filename 
   * @param {string} target
   */
  constructor(ns, filename, target) {
    this.filename  = filename
    this.ram_usage = ns.getScriptRam(filename)
    this.target    = target
  }

  /** @param {import("@ns").NS} ns */
  async make_ram_request(ns) {
    if (!(this.hostname === undefined)) {ns.tprint(`ERROR: Attempted to request child process RAM with host already provided.`)}
    if (!(this.ram_provided === undefined)) {ns.tprint(`ERROR: Attempted to request child process RAM whith RAM already provided.`)}
    let payload = new RAMRequestPayload(ns.self().pid, ns.self().filename, this.ram_usage)
    let request = new RAMRequest(RAM_MESSAGES.RAM_REQUEST, payload)
    let resp = await make_request(ns, request)
    if (resp.payload.result === "OK") {
      this.hostname     = resp.payload.host
      this.ram_provided = resp.payload.amount
      return Promise.resolve(true)
    }
    else {
      ns.tprint(`WARN: Unable to provide RAM upon request.`)
      return Promise.resolve(false)
    }
  }

  /** @param {import("@ns").NS} ns */
  async make_ram_release(ns) {
    if (this.hostname === undefined) {ns.tprint(`ERROR: Attempted to release child process RAM with no host provided.`)}
    if (this.ram_provided === undefined) {ns.tprint(`ERROR: Attempted to release child process RAM with no RAM provided.`)}
    let payload = new RAMReleasePayload(ns.self().pid, this.hostname, this.ram_provided)
    let request = new RAMRequest(RAM_MESSAGES.RAM_RELEASE, payload)
    let resp = await make_request(ns, request)
    if (resp.payload.result === "OK") {
      this.hostname = undefined
      this.ram_provided = undefined
      return Promise.resolve(true)
    }
    else {
      return Promise.resolve(false)
    }
  }

  /** @param {import("@ns").NS} ns */
  async start(ns) {
    this.ram_usage = ns.getScriptRam(filename)
    let result = await this.make_ram_request(ns)
    if (!result) {ns.tprint(`ERROR: Unable to start child process '${this.filename}' targetting '${this.target}' due to lack of RAM.`); return Promise.resolve(0)}
    if (this.hostname === undefined) {ns.tprint(`ERROR: Attempted to start child process with no host provided.`); return Promise.resolve(0)}
    if (this.ram_provided === undefined) {ns.tprint(`ERROR: Attempted to start child process with no provided RAM.`); return Promise.resolve(0)}
    if (!(this.ram_provided === this.ram_usage)) {ns.tprint(`ERROR: RAM Usage of child process is different from RAM provided.`); return Promise.resolve(0)}
    if (!(this.pid === undefined)) {ns.tprint(`ERROR: Attempted to start already running child process.`); return Promise.resolve(0)}

    let exec_request = new ExecRequestPayload(ns.pid, this.filename, this.hostname, {threads:1,temporary:true}, ["--target", this.target])
    let req_pid = await request_exec(ns, exec_request)
    if (req_pid === 0) {
      ns.tprint(`ERROR: Failed to launch child process '${this.filename}' on ${this.hostname}`)
      return Promise.resolve(0)
    }
    else {
      this.pid = req_pid
      return Promise.resolve(this.pid)
    }
  }

  /** @param {import("@ns").NS} ns */
  async terminate(ns) {
    let handler = ns.getPortHandle(this.pid)
    while(!handler.tryWrite({
      action: "terminate"
    })) {
      await ns.sleep(4)
    }
    let recv_resp = false
    let resp
    while (!recv_resp) {
      while (handler.empty()) {
        await ns.sleep(4)
      }
      resp = handler.peek()
      if (resp.action === "terminate_resp") {
        handler.read()
        recv_resp = true
      }
    }
    this.pid = undefined
    let result = this.make_ram_release(ns)
    if (!result) {ns.tprint(`ERROR: Unable to release RAM of child process '${this.filename}' targeting '${this.target}'`); Promise.resolve(false)}
    return Promise.resolve(true)
  }

  /** @param {import("@ns").NS} ns */
  has_finished_work(ns) {
    let handler = ns.getPortHandle(this.pid)
    if (handler.empty()) {return false}
    info = handler.peek()
    if (info.action == "finished") {handler.read(); return true}
    return false
  }

  /** @param {import("@ns").NS} ns */
  has_full_batch_ram(ns) {
    let handler = ns.getPortHandle(this.pid)
    if (handler.empty()) {return false}
    info = handler.peek()
    if (info.action == "running" && info.payload.ram_state == "full") {return true}
    return false
  }
}

class ProcessInfo {
  /** @type {string} */
  most_recent_action;
  /** @type {number} */
  last_ui_update;
  /** @type {number} */
  last_manager_update;
  /** @type {Object<string, ChildProcessInfo>} */
  child_processes = {};

  constructor() {
    this.most_recent_action = 'Initializing'
    this.last_ui_update = performance.now()
    this.last_manager_update = performance.now()
  }

  /**
   * @param {import("@ns").NS} ns
   * @param {string} filename
   * @param {string} target
   */
  async start_child_process(ns, filename, target) {
    if (!(this.child_processes[target] === undefined)) {ns.tprint(`ERROR: '${target} is already the target of a child process`); return Promise.resolve(false)}
    this.child_processes[target] = new ChildProcessInfo(filename, target)
    let pid = await this.child_processes[target].start(ns)
    if (pid === 0) {
      delete this.child_processes[target]
      ns.tprint(`ERROR: Failed to launch '${filename}' targeting ${target}`)
      return Promise.resolve(false)
    }
    return Promise.resolve(true)
  }

  /**
   * @param {import("@ns").NS} ns
   * @param {string} target
   */
  async end_child_process(ns, target) {
    if (this.child_processes[target] === undefined) {ns.tprint(`INFO: '${target}' is not the target of a child process`); return Promise.resolve(true)}
    let resp = await this.child_processes[target].terminate(ns)
    if (resp) {delete this.child_processes[target]; return Promise.resolve(true)}
    ns.tprint(`ERROR: Failed to end child process '${this.child_processes[target].filename}' targeting '${target}'`)
    return Promise.resolve(false)
  }

  get_hack_managers() {
    let servers = []
    for (let child in this.child_processes) {
      if (this.child_processes[child].filename.includes("manage_server_hack")) {
        servers.push(child)
      }
    }
    return servers
  }

  get_prep_managers() {
    let servers = []
    for (let child in this.child_processes) {
      if (this.child_processes[child].filename.includes("manage_server_prep")) {
        servers.push(child)
      }
    }
    return servers
  }
}

/**
 * @param {import("@ns").NS} ns 
 */
function init(ns) {
  ns.disableLog("ALL")
}

/**
 * @param {import("@ns").NS} ns 
 * @param {ProcessInfo} process_info
 * @param {boolean} force_update
 */
function update_TUI(ns, process_info, force_update) {
  if ((process_info.last_ui_update + 1000 > performance.now()) && !force_update) {return}
  ns.clearLog()
  ns.print(`Most Recent Action: ${process_info.most_recent_action}`)
  process_info.last_ui_update = performance.now()
}

/**
 * 
 * @param {import("@ns").Server} mock 
 * @param {ServerStateInfo} server_info 
 * @returns {import("@ns").Server}
 */
function mock_server(mock, server_info) {
  mock.moneyMax       = server_info.max_money
  mock.moneyAvailable = server_info.max_money
  mock.minDifficulty  = server_info.min_diff
  mock.hackDifficulty = server_info.min_diff
  mock.serverGrowth   = server_info.growth
  return mock
}

/**
 * 
 * @param {import("@ns").NS} ns 
 * @param {ProcessInfo} process_info 
 * @param {ControlParameters} control_params 
 * @param {*} bitnode_mults
 * @param {Object<string, ServerStateInfo>} server_info
 */
async function check_prep_managers(ns, process_info, control_params, bitnode_mults, server_info) {
  let hack_targets = process_info.get_hack_managers()
  let prep_targets = process_info.get_prep_managers()
  let player = control_params.player_mgr.player
  let finished_preppers = []

  // Check if any preppers have finished their work
  for (let target in prep_targets) {
    let child_process = process_info.child_processes[target]
    if (child_process.has_finished_work(ns)) {
      finished_preppers.push(target)
    }
  }

  // End the finished preppers
  for (let target in finished_preppers) {
    let resp = process_info.end_child_process(ns, target)
    if (resp) {prep_targets = prep_targets.filter(server => server != target)}
  }

  let consider_prep = Object.keys(server_info).filter(
    function(server) {
      return  (!hack_targets.includes(server))
          &&  (!prep_targets.includes(server))
          &&  (server_info[server].max_money > 0)
          &&  (server_info[server].is_rooted)
          &&  (server_info[server].curr_money < server_info[server].max_money)
          &&  (server_info[server].curr_diff > server_info[server].min_diff)
    }
  ).sort(
    function(a,b) {
      // Negative Result means a before b
      // Zero Result means no change
      // Positive Result means b before a
      if (a === control_params.hacknet_mgr.hash_target) {return -1} // Sort the hash target to the top of the
      if (b === control_params.hacknet_mgr.hash_target) {return  1} // Prepping Queue

      let mock_a = mock_server(ns.formulas.mockServer(), server_info[a])
      let mock_b = mock_server(ns.formulas.mockServer(), server_info[b])

      return Math.sign(
          mock_b.moneyMax * ns.formulas.hacking.hackPercent(mock_b, player) * ns.formulas.hacking.hackChance(mock_b, player)
        - mock_a.moneyMax * ns.formulas.hacking.hackPercent(mock_a, player) * ns.formulas.hacking.hackChance(mock_a, player)
      )
    }
  )

  let num_to_launch = (control_params.hacker.num_of_preppers - prep_targets.length)

  while (num_to_launch > 0) {
    // Launch a new prepper
    let new_target = consider_prep.shift()
    let success = await process_info.start_child_process(ns, "/src/scripts/manage_server_prep_v4.js", new_target)
    if (!success) {consider_prep.push(new_target)}
    else {num_to_launch -= 1}
  }
}

/**
 * 
 * @param {import("@ns").NS} ns 
 * @param {ProcessInfo} process_info 
 * @param {ControlParameters} control_params 
 * @param {*} bitnode_mults
 * @param {Object<string, ServerStateInfo>} server_info
 */
async function check_hack_managers(ns, process_info, control_params, bitnode_mults, server_info) {
  let hack_targets = process_info.get_hack_managers()
  let prep_targets = process_info.get_prep_managers()
  let full_hackers = []

  // Check that all hackers have enough RAM for their batching
  for (let target in hack_targets) {
    let child_process = process_info.child_processes[target]
    if (child_process.has_full_batch_ram(ns)) {
      full_hackers.push(target)
    }
  }

  // If not all hackers have full RAM, we don't have space to run another
  if (full_hackers.length < hack_targets.length) {return}

  let consider_hack = Object.keys(server_info).filter(
    function(server) {
      return  (!hack_targets.includes(server))
          &&  (!prep_targets.includes(server))
          &&  (server_info[server].max_money > 0)
          &&  (server_info[server].is_rooted)
          &&  (server_info[server].curr_money = server_info[server].max_money)
          &&  (server_info[server].curr_diff = server_info[server].min_diff)
    }
  ).sort(
    function(a,b) {
      // Negative Result means a before b
      // Zero Result means no change
      // Positive Result means b before a
      let mock_a = mock_server(ns.formulas.mockServer(), server_info[a])
      let mock_b = mock_server(ns.formulas.mockServer(), server_info[b])

      return Math.sign(
          mock_b.moneyMax * ns.formulas.hacking.hackPercent(mock_b, player) * ns.formulas.hacking.hackChance(mock_b, player)
        - mock_a.moneyMax * ns.formulas.hacking.hackPercent(mock_a, player) * ns.formulas.hacking.hackChance(mock_a, player)
      )
    }
  )

  // If the best candidate from consider_hack is undefined it means consider_hack is empty, and so we will return.
  let best_candidate = consider_hack.shift()
  if (best_candidate === undefined) {return}

  let success = await process_info.start_child_process(ns, "/src/scripts/manage_server_hack_v4.js", best_candidate)
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const CONTROL_PARAM_HANDLER = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(PORT_IDS.BITNODE_MULTS_HANDLER)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)

  let process_info = new ProcessInfo()
  init(ns)


  ns.ui.setTailTitle("Manage Hacking V5.0 - PID: " + ns.pid)

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

  while (true) {

    if (!CONTROL_PARAM_HANDLER.empty()) {
      control_params = JSON.parse(CONTROL_PARAM_HANDLER.peek())
    }
    if (!SERVER_INFO_HANDLER.empty()) {
      server_info = JSON.parse(SERVER_INFO_HANDLER.peek())
    }
    process_info.most_recent_action = `Waiting..`
    update_TUI(ns, process_info)

    if (process_info.last_manager_update + 10000 < performance.now()) {
      process_info.most_recent_action = `Check Prep Managers`
      update_TUI(ns, process_info, true)
      await check_prep_managers(ns, process_info, control_params, bitnode_mults, server_info)
      process_info.most_recent_action = `Check Hack Managers`
      update_TUI(ns, process_info, true)
      await check_hack_managers(ns, process_info, control_params, bitnode_mults, server_info)
      process_info.last_manager_update = performance.now()
    }

    // Sleep for half a second before restarting the program loop
    await ns.sleep(4)
  }
}