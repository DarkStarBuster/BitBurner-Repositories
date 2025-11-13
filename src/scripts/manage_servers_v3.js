import { scan_for_servers } from "/scripts/util/scan_for_servers"

const HACK_BATCH_LIMIT = 30
const HACK_BATCH_TIME_LIMIT = 2000
const TOTAL_HACK_BATCH_LIMIT = (6000 / 4) // <Total number of scripts we want running at any one time> / <4 as each hack batch runs 4 scripts>

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

/** @param {NS} ns */
function disable_logging(ns){
  ns.disableLog("ALL")
  ns.enableLog("exec")
}

/**
 * 
 * @param {NS} ns NetScript Environment
 * @param {number} ram_amount RAM amount to request
 * @param {NetscriptPort} ram_request_handler Handler for the Requests
 * @param {NetscriptPort} ram_provide_handler Handler for the Response
 * @returns 
 */
async function request_ram(ns, ram_amount, ram_request_handler, ram_provide_handler) {
  let ram_request = {
    "action"   : "request_ram",
    "amount"   : ram_amount,
    "requester": ns.pid
  }
  
  while(!ram_request_handler.tryWrite(JSON.stringify(ram_request))){
    await ns.sleep(50)
  }

  let awaiting_response = true
  let ram_response = {}
  while (awaiting_response) {
    while(ram_provide_handler.empty()) {
      await ns.sleep(50)
    }
    ram_response = JSON.parse(ram_provide_handler.peek())
    if (parseInt(ram_response.requester) === ns.pid) {
      awaiting_response = false
      ram_provide_handler.read()
    }
    else{
      await ns.sleep(50)
    }
  }

  if (!(ram_response.result === "OK")) {
    ns.print("WARN RAM Manager did not provide us with more RAM\n" + JSON.stringify(ram_response))
    return Promise.resolve(false)
  }
  else {
    if (RAM_INFO[ram_response.server]) {
      RAM_INFO[ram_response.server].assigned_ram += ram_response.amount
      RAM_INFO[ram_response.server].free_ram += ram_response.amount
    }
    else {
      RAM_INFO[ram_response.server] = {
        "assigned_ram": ram_response.amount,
        "free_ram"    : ram_response.amount,
        "processes"   : {}
      }
    }
  }

  return Promise.resolve(true)
}

/**
 * 
 * @param {NS} ns NetScript Environment
 * @param {string} server_to_release_from 
 * @param {number} ram_amount 
 * @param {NetscriptPort} ram_request_handler 
 * @param {NetscriptPort} ram_provide_handler 
 * @returns Boolean depending on if the RAM was successfully released
 */
async function release_ram(ns, server_to_release_from, ram_amount, ram_request_handler, ram_provide_handler) {
  let ram_request = {
    "action"   : "release_ram",
    "server"   : server_to_release_from,
    "amount"   : ram_amount,
    "requester": ns.pid
  }

  while(!ram_request_handler.tryWrite(JSON.stringify(ram_request))){
    await ns.sleep(50)
  }

  let awaiting_response = true
  let ram_response = {}
  while (awaiting_response) {
    while(ram_provide_handler.empty()) {
      await ns.sleep(50)
    }
    ram_response = JSON.parse(ram_provide_handler.peek())
    if (parseInt(ram_response.requester) === ns.pid) {
      awaiting_response = false
      ram_provide_handler.read()
    }
    else {
      await ns.sleep(50)
    }
  }

  if (!(ram_response.result === "OK")) {
    ns.tprint("ERROR RAM Manager did not allow us to release RAM\n" + JSON.stringify(ram_response))
    return Promise.resolve(false)
  }
  
  return Promise.resolve(true)
}

/**
 * @param {number} pid 
 * @param {string} filename 
 */
function add_child_process(ns, pid, filename, server, target) {
  RAM_INFO[server].free_ram -= ns.getScriptRam(filename)
  RAM_INFO[server].processes[pid] = {
    "ram_cost": ns.getScriptRam(filename),
    "filename": filename,
    "target"  : target
  }
}

/**
 * @param {NS} ns
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
      RAM_INFO[server_name].free_ram += RAM_INFO[server_name].processes[pid_found].ram_cost
      delete RAM_INFO[server_name].processes[pid_found]
    }
  }

  return runing
}

/**
 * @param {import("../../.").NS} ns - NetScript Environment
 * @param {string} filename - Script to Launch
 * @param {string} server_to_target - Server to target with the script given
 * @param {NetscriptPort} ram_request_handler - Handler to request RAM
 * @param {NetscriptPort} ram_provide_handler - Handler to listen for provided RAM
 */
async function launch_child(ns, filename, server_to_target, ram_request_handler, ram_provide_handler) {
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
    request_response = await request_ram(ns, ram_needed, ram_request_handler, ram_provide_handler)
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
    await release_ram(ns, server_to_use, RAM_INFO[server_to_use].free_ram, ram_request_handler, ram_provide_handler)
    RAM_INFO[server_to_use].free_ram = 0
    return Promise.resolve(false)
  }
}

/**
 * Kills a child process that targets the given target
 * @param {NS} ns NetScript Environment
 * @param {string} childs_target Target of the process we want to kill
 * @param {NetscriptPort} ram_request_handler
 * @param {NetscriptPort} ram_provide_handler
 */
async function kill_child(ns, childs_target, ram_request_handler, ram_provide_handler) {
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
    let result = await release_ram(ns, server_of_target_process, RAM_INFO[server_of_target_process].processes[pid_of_target_process].ram_cost, ram_request_handler, ram_provide_handler)
    RAM_INFO[server_of_target_process].free_ram += RAM_INFO[server_of_target_process].processes[pid_of_target_process].ram_cost
    if (result) {
      RAM_INFO[server_of_target_process].free_ram -= RAM_INFO[server_of_target_process].processes[pid_of_target_process].ram_cost
    }
    else {
      ns.tprint("ERROR Killed process RAM was not released.")
    }
    delete RAM_INFO[server_of_target_process].processes[pid_of_target_process]
  }
  return Promise.resolve()
}

/** 
 * @param {NS} ns
 * @param {boolean} force_update
 */
async function check_root(ns, force_update) {
  const UPDATE_HANDLER = ns.getPortHandle(4)

  let hack_dictionary = {
    "ssh" : ns.fileExists("BruteSSH.exe"),
    "ftp" : ns.fileExists("FTPCrack.exe"),
    "smtp": ns.fileExists("relaySMTP.exe"),
    "http": ns.fileExists("HTTPWorm.exe"),
    "sql" : ns.fileExists("SQLInject.exe"),
  }

  let unrooted_servers = scan_for_servers(ns, (!force_update ? {"is_rooted":false} : {"include_home":true}))

  for (let server of unrooted_servers) {
    let server_object = ns.getServer(server)
    if (
        server_object.requiredHackingSkill <= ns.getHackingLevel()
    ||  server_object.requiredHackingSkill === undefined
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
      // if (ns.getServerNumPortsRequired(server) > ports_opened) {
      //   ns.print(server + " requires " + ns.getServerNumPortsRequired(server) + " ports opened to nuke, we opened " + ports_opened)
      // }
      let newly_rooted = false
      if (server_object.numOpenPortsRequired <= ports_opened && !server_object.hasAdminRights) {
        ns.nuke(server)
        newly_rooted = true
        server_object = ns.getServer(server)
      }
      if (server_object.hasAdminRights) {
        if (newly_rooted) {
          ns.print(server + " successfully rooted")
          ns.toast("Successfully Rooted \"" + server + "\"", "success", 5000)
        }

        if (!ns.fileExists("/scripts/util/port_management.js" , server) || force_update) ns.scp("/scripts/util/port_management.js" , server)
        if (!ns.fileExists("/scripts/util/ram_management.js"  , server) || force_update) ns.scp("/scripts/util/ram_management.js"  , server)
        if (!ns.fileExists("/scripts/util/weaken_v2.js"       , server) || force_update) ns.scp("/scripts/util/weaken_v2.js"       , server)
        if (!ns.fileExists("/scripts/util/grow_v2.js"         , server) || force_update) ns.scp("/scripts/util/grow_v2.js"         , server)
        if (!ns.fileExists("/scripts/util/hack_v2.js"         , server) || force_update) ns.scp("/scripts/util/hack_v2.js"         , server)
        if (!ns.fileExists("/scripts/util/share.js"           , server) || force_update) ns.scp("/scripts/util/share.js"           , server)
        if (!ns.fileExists("/scripts/manage_server_hack_v2.js", server) || force_update) ns.scp("/scripts/manage_server_hack_v2.js", server)
        if (!ns.fileExists("/scripts/manage_server_prep_v2.js", server) || force_update) ns.scp("/scripts/manage_server_prep_v2.js", server)
        if (!ns.fileExists("/scripts/util/weaken_for_exp.js"  , server) || force_update) ns.scp("/scripts/util/weaken_for_exp.js"  , server)
        if (!ns.fileExists("/scripts/solve_cct.js"            , server) || force_update) ns.scp("/scripts/solve_cct.js"            , server)

        let update = {
          "action": "update_info",
          "update_info": {
            "server": server
          }
        }
        
        while(UPDATE_HANDLER.full()) {
          await ns.sleep(200)
        }
        UPDATE_HANDLER.write(JSON.stringify(update))
      }
    }
  }
  ns.print("Finished Rooting New Servers")
  return Promise.resolve()
}

/** @param {import("../../.").NS} ns */
async function check_manage(ns, control_params, bitnode_mults, server_info, ram_request_handler, ram_provide_handler) {

  let managed_servers = []
  let preping_servers = []
  for (let server in RAM_INFO) {
    for (let pid in RAM_INFO[server].processes) {
      if (ns.isRunning(parseInt(pid))) {
        ns.print("Live PID: " + pid)
        switch (RAM_INFO[server].processes[pid].filename) {
          case "/scripts/manage_server_hack_v2.js":
            managed_servers.push(RAM_INFO[server].processes[pid].target)
            break
          case "/scripts/manage_server_prep_v2.js":
            preping_servers.push(RAM_INFO[server].processes[pid].target)
            break
        }
      }
      else {
        ns.print("Killed PID: " + pid)
        let result = await release_ram(ns, server, RAM_INFO[server].processes[pid].ram_cost, ram_request_handler, ram_provide_handler)
        if (!result) {
          ns.tprint("ERROR PID " + pid + " is dead, but we failed to release the RAM associated with it.")
        }
        delete RAM_INFO[server].processes[pid]
      }
    }
  }

  ns.print(managed_servers.length + " Managed Server processes found")
  ns.print(preping_servers.length + " Prepare Server processes found")

  let servers = scan_for_servers(ns,{"is_rooted":true,"has_money":true})

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
      let server_a_weaken_time  = ns.formulas.hacking.weakenTime (server_a, player)
      let server_b_hack_percent = ns.formulas.hacking.hackPercent(server_b, player)
      let server_b_hack_chance  = ns.formulas.hacking.hackChance (server_b, player)
      let server_b_weaken_time  = ns.formulas.hacking.weakenTime (server_b, player)

      return (server_b_hack_percent * server_b_hack_chance * server_b.moneyMax)
      - (server_a_hack_percent * server_a_hack_chance * server_a.moneyMax)
    }
  )

  let temp_server = []
  if (bitnode_mults["ScriptHackMoneyGain"] === 0) {
    // We gain no money from hacking. We only gain the side effects from hacks being run
    // Do not start any managers or prepers
    servers = []
  }
  // else if (
  //     bitnode_mults["ScriptHackMoney"] <= 0.1 // We get 10% or less of the money we Hack from a server
  // ||  bitnode_mults["ServerMaxMoney"] <= 0.1  // Servers start with 10% or less Maximum Money
  // ) {
  //   // Focus on the hacknet target only and rely on pumping hashes into making it good
  //   let target = control_params.hacknet.hash_target
  //   let time   = control_params.hacknet.hash_time
  //   if (
  //       servers.includes(target)
  //   &&  server_info[target]
  //   &&  !(time === Infinity)
  //   &&  time < (1/control_params.hacknet.threshold)
  //   ) {
  //     temp_server.push(target)
  //   }
  //   // Yes if we ever get to the point where we have finished "upgrading" a server via hacknet hashses
  //   // we won't deal with the hacknet manager switching hash targets well. But let's cross that bridge
  //   // once we actually get there, shall we?
  //   let first_pushed = false
  //   for (let server of servers) {
  //     if (temp_server.includes(server)) {continue}
  //     if (server_info[server] === undefined) {continue}
  //     if (!first_pushed) {temp_server.push(server); first_pushed = true;}
  //     if (server === target && !(time === Infinity) && time < (1/control_params.hacknet.threshold) && !temp_server.includes(server)) {temp_server.push(server)}
  //     if (ns.getServer(server).moneyMax >= 1e12 && !temp_server.includes(server)) {temp_server.push(server)}
  //   }
  //   servers = temp_server
  //   ns.print(servers)
  // }
  else if (server_info["home"].max_ram < control_params.hacker.consider_early) {
    if (servers.includes("n00dles")  && server_info["n00dles"]) temp_server.push("n00dles")
    if (servers.includes("joesguns") && server_info["joesguns"]) temp_server.push("joesguns")
    if (servers.includes("phantasy") && server_info["phantasy"]) temp_server.push("phantasy")
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
      let server_a_weaken_time  = ns.formulas.hacking.weakenTime (server_a, player)
      let server_b_hack_percent = ns.formulas.hacking.hackPercent(server_b, player)
      let server_b_hack_chance  = ns.formulas.hacking.hackChance (server_b, player)
      let server_b_weaken_time  = ns.formulas.hacking.weakenTime (server_b, player)

      return (server_b_hack_percent * server_b_hack_chance * server_b.moneyMax)
      - (server_a_hack_percent * server_a_hack_chance * server_a.moneyMax)
    }
  )

  // TODO: Narrow down prep managers to only prep the single most profitable un-preped server at a time.

  let hackable_servers = []
  let servers_to_prep = []

  for (let server of servers) {
    if (server_info[server] === undefined) {
      ns.print("Skip servers that are not in the server_info object.")
      continue
    }
    let server_object = ns.getServer(server)
    if (
      (
          server_object.hackDifficulty != server_info[server].min_diff
      ||  server_object.moneyAvailable != server_info[server].max_money
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
      await kill_child(ns, server, ram_request_handler, ram_provide_handler)
    }
  }

  for (let server of servers_to_hack) {
    // Not managing currently, request new manager
    let successful = false
    if (managed_servers.indexOf(server) == -1) {
      ns.print("Launching manager for " + server + ".")
      successful = await launch_child(ns, "/scripts/manage_server_hack_v2.js", server, ram_request_handler, ram_provide_handler)
      if (!successful) {
        ns.print("Failed to launch manager for " + server + ".")
      }
    }
  }

  if (!preping_servers.includes(control_params.hacknet.hash_target) && servers_to_prep[0] === control_params.hacknet.hash_target) {
    for (let server of preping_servers) {
      ns.print("Killing preper for " + server + " as we need space to prep the hash target")
      await kill_child(ns, server, ram_request_handler, ram_provide_handler)
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
      successful = await launch_child(ns, "/scripts/manage_server_prep_v2.js", server, ram_request_handler, ram_provide_handler)
      if (!successful) {
        ns.print("Failed to launch prepper for " + server + ".")
      }
      break
    }
  }

  ns.print("Finished requesting new manager processes")
  return Promise.resolve()
}

/** @param {NS} ns */
export async function main(ns) {
  const CONTROL_PARAMETERS    = ns.getPortHandle(1)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(2)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(3)
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(5)
  const RAM_PROVIDE_HANDLER   = ns.getPortHandle(6)
  
  // Disable logging of things in this script
  disable_logging(ns)

  for(let server in RAM_INFO) {
    delete RAM_INFO[server]
  }

  ns.setTitle("Manage Servers V3.0 - PID: " + ns.pid)

  while (
      CONTROL_PARAMETERS.empty()
  ||  BITNODE_MULTS_HANDLER.empty()
  ||  SERVER_INFO_HANDLER.empty()
  ) {
    await ns.sleep(50)
  }

  let control_params = JSON.parse(CONTROL_PARAMETERS.peek())
  let bitnode_mults  = JSON.parse(BITNODE_MULTS_HANDLER.peek())
  let server_info    = JSON.parse(SERVER_INFO_HANDLER.peek())

  // Sleep for half a second before starting the loop
  await ns.sleep(500)

  let loop_count = 0
  let initialised = false

  while (true) {

    if (!CONTROL_PARAMETERS.empty()) {
      control_params = JSON.parse(CONTROL_PARAMETERS.peek())
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
      await check_manage(ns, control_params, bitnode_mults, server_info, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
    }

    // Sleep for half a second before restarting the program loop
    await ns.sleep(500)
    loop_count += 1
  }
}