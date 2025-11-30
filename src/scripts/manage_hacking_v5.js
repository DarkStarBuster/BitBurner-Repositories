import { ExecRequestPayload, request_exec } from "/src/scripts/core/manage_exec"
import { ServerStateInfo } from "/src/scripts/core/util_server_scanning";
import { ControlParameters } from "/src/scripts//core/util_control_parameters";

import { PORT_IDS } from "/src/scripts/boot/manage_ports"
import { release_ram, request_ram } from "/src/scripts/util/ram_management"

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
    let response = await request_ram(ns, this.ram_usage)
    if (response.result === "OK") {
      this.hostname     = response.server
      this.ram_provided = response.amount
      return Promise.resolve(true)
    }
    else {
      return Promise.resolve(false)
    }
  }

  /** @param {import("@ns").NS} ns */
  async make_ram_release(ns) {
    if (this.hostname === undefined) {ns.tprint(`ERROR: Attempted to release child process RAM with no host provided.`)}
    if (this.ram_provided === undefined) {ns.tprint(`ERROR: Attempted to release child process RAM with no RAM provided.`)}
    let response = await release_ram(ns, this.hostname, this.ram_provided)
    if (response.result === "OK") {
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
        let response = await release_ram(ns, server, RAM_INFO[server].processes[pid].ram_cost)
        //log(ns, "RAM Release Response: " + response)
        if (!(response.result === "OK")) {
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
    if (hack_batch_cnt + batches_to_saturate_server < control_params.hacker.total_hack_batch_limit) {
      // log(ns, "Added " + server + " with " + batches_to_saturate_server + " to the list of servers we will hack")
      hack_batch_cnt += batches_to_saturate_server
      servers_to_hack.push(server)
    }
  }
  // log(ns, "Total of " + hack_batch_cnt + " hack batches are expected to be spawned")

  for (let server of managed_servers) {
    if (servers_to_hack.indexOf(server) === -1) {
      // log(ns, "Killing manager for " + server + " as we no longer want to hack it.")
      await kill_child(ns, server)
    }
  }

  for (let server of servers_to_hack) {
    // Not managing currently, request new manager
    let successful = false
    if (managed_servers.indexOf(server) == -1) {
      // log(ns, "Launching manager for " + server + ".")
      successful = await launch_child(ns, "/scripts/manage_server_hack_v3.js", server)
      if (!successful) {
        // log(ns, "Failed to launch manager for " + server + ".")
      }
    }
  }

  if (!(control_params.hacknet_mgr.hash_target === undefined)) {
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
        preping_servers.length < 10
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
    let success = await process_info.start_child_process(ns, "/src/scripts/manage_server_prep_v3.js", new_target)
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

  

  while (num_to_launch > 0) {
    // Launch a new prepper
    let new_target = consider_prep.shift()
    let success = await process_info.start_child_process(ns, "/src/scripts/manage_server_prep_v3.js", new_target)
    if (!success) {consider_prep.push(new_target)}
    else {num_to_launch -= 1}
  }
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