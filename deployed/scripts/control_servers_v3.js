import {scan_for_servers} from "/scripts/util/scan_for_servers"

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
 * It will be exposed on Port 3 as a result of JSON.stringify(all_server_status)
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
let all_server_status = {}

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

/** @param {NS} ns */
function disable_logs(ns) {
  ns.disableLog("ALL")
  ns.enableLog("exec")
}

/**
 * @param {NS} ns
 */
function kill_all_other_processes(ns) {
  let rooted_servers = scan_for_servers(ns,{"is_rooted":true,"include_home":true})

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
    }
  }
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
  all_server_status[server] = {
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
    handler.write(JSON.stringify(all_server_status))
  }
}

/**
 * Update all servers static statistics in all_server_stats
 * 
 * @param {NS} ns - Netscript Environment
 * @param {NetscriptPort} handler - Handler that will handle the port writing
 */
function populate_all_server_stats(ns, handler) {
  let all_servers = scan_for_servers(ns,{"include_home":true})

  for (let server of all_servers) {
    update_server_stats(ns, server, null, true)
  }

  handler.clear()
  handler.write(JSON.stringify(all_server_status))
}

/**
 * @param {NS} ns Netscript Environment
 * @param {NetscriptPort} control_param_handler 
 * @param {NetscriptPort} bitnode_mults_handler
 */
async function populate_control_and_bitnode_stats(ns, control_param_handler, bitnode_mults_handler) {
  let pid = ns.exec("/scripts/util/control_parameters.js","home",1)
  if (pid === 0) ns.tprint("ERROR Failed to launch Control Parameters script after being allocated RAM")

  while(control_param_handler.empty()) {
    await ns.sleep(50)
  }

  pid = ns.exec("/scripts/util/populate_bitnode_mults.js","home",1)
  if (pid === 0) ns.tprint("ERROR Failed to launch BitNode Multipliers script after being allocated RAM")

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

  while(ram_provide_handler.empty()) {
    await ns.sleep(50)
  }

  let ram_manager_response = ram_provide_handler.read()
  if (!(ram_manager_response === "OK")) {
    ns.tprint(ram_manager_response)
    ns.exit()
  }

  let ram_request = {
    "action": "request_ram",
    "amount": ns.getScriptRam("/scripts/manage_ram.js") + ns.getScriptRam("/scripts/control_servers_v3.js"),
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
    ns.tprint("ERROR RAM Manager somehow failed to Provide RAM for our and its own existance despite both scripts running up until this point")
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

  ns.print("RAM Manager Launched")
  ns.print("Server " + ram_response.server + " has " + RAM_INFO[ram_response.server].assigned_ram + " assigned. And " + RAM_INFO[ram_response.server].free_ram)

  return Promise.resolve()
}

/**
 * @param {NS} ns
 * @param {number} pid 
 * @param {string} filename 
 * @param {string} server
 */
function add_child_process(ns, pid, filename, server) {
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
  let runing = false
  let pid_found
  let server_name
  for (let server in RAM_INFO) {
    for(let pid in RAM_INFO[server].processes) {
      if (RAM_INFO[server].processes[pid].filename == filename) {
        runing = ns.isRunning(parseInt(pid))
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
    ns.print("Server " + server + " has free_ram: " + RAM_INFO[server].free_ram)
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
  let ram_needed = 0
  ram_needed += ns.getScriptRam("/scripts/manage_servers_v3.js")
  if (ns.getServerMaxRam("home") >= 64) {
    ram_needed += ns.getScriptRam("/scripts/manage_hacknet_v2.js")
    ram_needed += ns.getScriptRam("/scripts/manage_pservers_v2.js")
    ram_needed += ns.getScriptRam("/scripts/manage_codecontracts.js")
    ram_needed += ns.getScriptRam("/scripts/manage_free_ram_v2.js")
  }

  let ram_request = {
    "action": "request_ram",
    "amount": ram_needed,
    "requester": ns.pid
  }

  ns.print("RAM Request: " + JSON.stringify(ram_request))

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
  }

  ns.print("RAM Response: " + JSON.stringify(ram_response))

  if (!(ram_response.result === "OK")) {
    ns.tprint("ERROR RAM Manager failed to provide RAM for the requested managers.")
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
    ns.print("Server " + ram_response.server + " has " + ram_response.amount + " assigned.")
  }

  let pid = ns.exec("/scripts/manage_servers_v3.js",ram_response.server,1)
  if (pid === 0) ns.tprint("ERROR Failed to launch Hack/Prep Manager Manager after being allocated RAM")
  else add_child_process(ns,pid,"/scripts/manage_servers_v3.js",ram_response.server)

  if (ns.getServerMaxRam("home") >= 64) {
    pid = ns.exec("/scripts/manage_hacknet_v2.js",ram_response.server,1)
    if (pid === 0) ns.tprint("ERROR Failed to launch Automatic Hacknet Upgrade Manager after being allocated RAM")
    else add_child_process(ns,pid,"/scripts/manage_hacknet_v2.js",ram_response.server)
  
    pid = ns.exec("/scripts/manage_pservers_v2.js",ram_response.server,1)
    if (pid === 0) ns.tprint("ERROR Failed to launch Automatic Personal Server Manager after being allocated RAM")
    else add_child_process(ns,pid,"/scripts/manage_pservers_v2.js",ram_response.server)
    // Either of these two processes can enqueue the Free Ram Manager
    await ns.sleep(10000)
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
  const CONTROL_PARAM_HANDLER = ns.getPortHandle(1)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(2)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(3)
  const UPDATE_HANDLER        = ns.getPortHandle(4)
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(5)
  const RAM_PROVIDE_HANDLER   = ns.getPortHandle(6)

  disable_logs(ns)

  CONTROL_PARAM_HANDLER.clear()
  BITNODE_MULTS_HANDLER.clear()
  SERVER_INFO_HANDLER.clear()
  UPDATE_HANDLER.clear()
  RAM_REQUEST_HANDLER.clear()
  RAM_PROVIDE_HANDLER.clear()

  while (!CONTROL_PARAM_HANDLER.empty()) {
    CONTROL_PARAM_HANDLER.clear()
    await ns.sleep(50)
  }
  while (!BITNODE_MULTS_HANDLER.empty()) {
    BITNODE_MULTS_HANDLER.clear()
    await ns.sleep(50)
  }
  while (!SERVER_INFO_HANDLER.empty()) {
    SERVER_INFO_HANDLER.clear()
    await ns.sleep(50)
  }
  while (!UPDATE_HANDLER.empty()) {
    UPDATE_HANDLER.clear()
    await ns.sleep(50)
  }
  while (!RAM_REQUEST_HANDLER.empty()) {
    RAM_REQUEST_HANDLER.clear()
    await ns.sleep(50)
  }
  while (!RAM_PROVIDE_HANDLER.empty()) {
    RAM_PROVIDE_HANDLER.clear()
    await ns.sleep(50)
  }

  // Clear the slate
  kill_all_other_processes(ns)

  // Gather Statistics of the environment we are working in
  populate_all_server_stats(ns, SERVER_INFO_HANDLER)

  // Ensure our control parameters are written to their ports
  await populate_control_and_bitnode_stats(ns, CONTROL_PARAM_HANDLER, BITNODE_MULTS_HANDLER)

  // Start the RAM manager
  await start_ram_manager(ns, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)

  // Start our other managers
  await start_managers(ns, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)

  ns.print("Starting Loop")
  while(true){
    let update_string = UPDATE_HANDLER.peek()
    //ns.print("Update String at start of loop: " + update_string)
    while (update_string === "NULL PORT DATA"){
      await ns.sleep(50)
      update_string = UPDATE_HANDLER.peek()
      //ns.print("Await ended: String: " + update_string + " Is Empty: " + UPDATE_HANDLER.empty())
    }

    // Look at the top of the queue
    //ns.print(update_string)
    let update = JSON.parse(update_string)
    //ns.print("Recieved Update to Process")
    // for (let key in update) {
    //   ns.print("Key: " + key + " Val: " + update[key])
    // }

    //ns.print("Action Type: " + update.action)
    if (update.action === "update_info") {
      //ns.print("Performing Update Info")
      update_server_stats(ns, update.update_info.server, SERVER_INFO_HANDLER)
    }
    else if (update.action === "request_action") {
      ns.print("Performing Request Action")
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
          filename = "/scripts/manage_hacknet_v2.js"
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

      if (!child_is_running(ns, filename)) {
        await launch_child(ns, filename, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
      }      

      // if (all_server_status[server_to_target]) {
      //   ns.print("Performing " + request_action.script_action)
        

      //   if (
      //       request_action.script_action == "hack"
      //   ||  request_action.script_action == "grow"
      //   //||  request_action.script_action == "weaken"
      //   ) {
      //     let script_args = [
      //       "--target", server_to_target,
      //       "--addMsec", request_action.addMsec,
      //       "--threads", request_action.threads
      //     ]
      //     switch (request_action.script_action) {
      //       case "hack":
      //         ram_needed = 1.7 * request_action.threads
      //         filename = "scripts/hack.js"
      //         break
      //       case "grow":
      //         ram_needed = 1.75 * request_action.threads
      //         filename = "scripts/grow.js"
      //         break
      //       case "weaken":
      //         ram_needed = 1.75 * request_action.threads
      //         filename = "scripts/weaken.js"
      //         break
      //     }
      //     let script_pid = 0
      //     for(let server in all_server_status) {
      //       if (
      //           (     all_server_status[server].free_ram >= ram_needed
      //             &&  server != "home"
      //           )
      //       ||  (     (all_server_status[server].free_ram - 16) >= ram_needed
      //             &&  server == "home"
      //           )
      //       ) {
      //         script_args.push("--server")
      //         script_args.push(server)
      //         if (request_action.script_action == "grow") {
      //           script_args.push("--sec_inc")
      //           script_args.push(request_action.sec_inc)
      //         }
      //         //ns.tprint(script_args)
      //         script_pid = ns.exec(filename,server,request_action.threads,...script_args)
      //         if (script_pid != 0) {
      //           all_server_status[server].free_ram = all_server_status[server].free_ram - ram_needed
      //           all_server_status[server].actions[script_pid] = {
      //             "server": server,
      //             "target": server_to_target,
      //             "action": request_action.script_action,
      //             "threads": request_action.threads
      //           }
      //         }
      //         SERVER_INFO_HANDLER.clear()
      //         SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
      //         break
      //       }
      //     }
      //     if (script_pid == 0) {
      //       ns.toast("Action failed to be processed: " + request_action.script_action + " on " + server_to_target, "warning", 5000)
      //     }
      //   }
      //   else if (request_action.script_action == "weaken") {
      //     let threads_launched = 0
      //     let threads_remaining = request_action.threads
      //     let threads_attempting = request_action.threads
      //     let ram_needed = 1.75 * threads_attempting
      //     let already_checked_one_thread = false
      //     while (threads_remaining > 0) {
      //       ns.print(
      //         "Target: " + server_to_target
      //       + ". Th-Re: " + threads_remaining
      //       + ". Th-La: " + threads_launched
      //       + ". Th-At: " + threads_attempting
      //       + ". RAM: " + ram_needed
      //       )
      //       for (let server in all_server_status) {
      //         let script_args = [
      //           "--target", server_to_target,
      //           "--addMsec", request_action.addMsec,
      //           //"--threads", request_action.threads
      //         ]
      //         let script_pid = 0
      //         if (
      //             (     all_server_status[server].free_ram >= ram_needed
      //               &&  server != "home"
      //             )
      //         ||  (     (all_server_status[server].free_ram - 16) >= ram_needed
      //               &&  server == "home"
      //             )
      //         ) {
      //           script_args.push("--threads",threads_attempting)
      //           script_args.push("--server",server)
      //           script_pid = ns.exec("scripts/weaken.js", server, threads_attempting,...script_args)
      //           if (script_pid != 0){
      //             ns.print("Launched process " + script_pid + " on " + server)
      //             all_server_status[server].free_ram = all_server_status[server].free_ram - ram_needed
      //             all_server_status[server].actions[script_pid] = {
      //               "server": server,
      //               "target": server_to_target,
      //               "action": request_action.script_action,
      //               "threads": threads_attempting
      //             }
      //             threads_launched += threads_attempting
      //             threads_remaining -= threads_attempting
      //           }
      //           else {
      //             ns.print("Attempted to launch and failed?")
      //           }
      //           ns.print(
      //             "Target: " + server_to_target
      //           + ". Th-Re: " + threads_remaining
      //           + ". Th-La: " + threads_launched
      //           + ". Th-At: " + threads_attempting
      //           + ". RAM: " + ram_needed
      //           )
      //         }
              
      //         if (threads_launched >= request_action.threads) {
      //           if(threads_launched > request_action.threads) {
      //             ns.toast("Somehow managed to launch more weaken threads than requested", "warning")
      //           }
      //           break
      //         }
      //       }
      //       // If we're only checking for a single thread, and we've already checked for a single thread
      //       // previously, we've run out of RAM space to fit threads into
      //       if (threads_attempting == 1) {
      //         if (already_checked_one_thread) {
      //           break;
      //         }
      //         else {
      //           already_checked_one_thread = true
      //         }
      //       }
      //       threads_attempting = Math.min(threads_remaining, Math.ceil(threads_attempting/2))
      //       ram_needed = 1.75 * threads_attempting
      //       //await ns.sleep(200)
      //     }

      //   }
      //   // Action a batch grow request
      //   else if (request_action.script_action == "batch_grow") {
      //     // Example Batch Grow request format
      //     // let update_2 = {
      //     //   "action": "request_action",
      //     //   "request_action": {
      //     //     "script_action": "batch_grow",
      //     //     "target": arg_flags.target,
      //     //     "batches_needed": Math.ceil(total_num_threads / num_threads),
      //     //     "grow": {
      //     //       "threads": num_threads,
      //     //       "addMsec": grow_delay,
      //     //       "sec_inc": grow_sec_inc
      //     //     },
      //     //     "weaken_grow": {
      //     //       "threads": 2,
      //     //       "addMsec": weaken_grow_delay
      //     //     }
      //     //   }
      //     // }

      //     let batches_launched = 0
      //     let batches_remaining = request_action.batches_needed
      //     let batches_attempting = request_action.batches_needed
      //     let single_batch_ram = 
      //       1.75 * request_action.weaken_grow.threads // Weaken RAM
      //     + 1.75 * request_action.batch_grow.threads // Grow RAM
      //     let ram_needed = single_batch_ram * batches_attempting
      //     let already_checked_one_batch = false

      //     while (batches_remaining > 0) {
      //       ns.print(
      //         "Target: " + server_to_target
      //       + ". Ba-Re: " + batches_remaining
      //       + ". Ba-La: " + batches_launched
      //       + ". Ba-At: " + batches_attempting
      //       + ". RAM: " + ram_needed
      //       )

      //       // Search all servers for free ram
      //       for (let server in all_server_status) {
      //         let grow_script_args = [
      //           "--target", server_to_target,
      //           "--addMsec", request_action.batch_grow.addMsec
      //         ]
      //         let weaken_script_args = [
      //           "--target", server_to_target,
      //           "--addMsec", request_action.weaken_grow.addMsec
      //         ]
      //         let grow_script_pid = 0
      //         let weaken_script_pid = 0
              
      //         // Does this server have enough free ram to satisfy the current ram needed?
      //         if (
      //             (     all_server_status[server].free_ram >= ram_needed
      //               &&  server != "home"
      //             )
      //         ||  (     (all_server_status[server].free_ram - 16) >= ram_needed
      //               &&  server == "home"
      //             )
      //         ) {
      //           grow_script_args.push(
      //             "--server", server,
      //             "--threads", batches_attempting * request_action.batch_grow.threads,
      //             "--sec_inc", batches_attempting * request_action.batch_grow.sec_inc
      //           )
      //           weaken_script_args.push(
      //             "--server", server,
      //             "--threads", batches_attempting * request_action.weaken_grow.threads
      //           )
      //           grow_script_pid = ns.exec("scripts/grow.js", server, batches_attempting * request_action.batch_grow.threads,...grow_script_args)
      //           weaken_script_pid = ns.exec("scripts/weaken.js", server, batches_attempting * request_action.weaken_grow.threads,...weaken_script_args)

      //           // Check we launched both expected processes
      //           if (
      //               grow_script_pid == 0
      //           ||  weaken_script_pid == 0
      //           ) {
      //             ns.print("Had to kill batch grow processes due to missing pid")
      //             ns.toast("Had to kill batch grow processes due to missing pid", "warning")
      //             ns.kill(grow_script_pid)
      //             ns.kill(weaken_script_pid)

      //             // Something about the server we attempted to use is not reflected in the state we maintain.
      //             all_server_status[server].free_ram = ns.getServerMaxRam(server) - ns.getServerUsedRam(server)
      //             SERVER_INFO_HANDLER.clear()
      //             SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
      //           }
      //           else {
      //             batches_launched += batches_attempting
      //             batches_remaining -= batches_attempting
      //             all_server_status[server].free_ram = all_server_status[server].free_ram - ram_needed
      //             all_server_status[server].actions[grow_script_pid] = {
      //               "server": server,
      //               "target": server_to_target,
      //               "action": "grow",
      //               "threads": batches_attempting * request_action.batch_grow.threads
      //             }
      //             all_server_status[server].actions[weaken_script_pid] = {
      //               "server": server,
      //               "target": server_to_target,
      //               "action": "weaken",
      //               "threads": batches_attempting * request_action.weaken_grow.threads
      //             }
      //             SERVER_INFO_HANDLER.clear()
      //             SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
      //             batches_attempting = Math.min(batches_attempting,batches_remaining)
      //           }
      //           ns.print(
      //             "Target: " + server_to_target
      //           + ". Ba-Re: " + batches_remaining
      //           + ". Ba-La: " + batches_launched
      //           + ". Ba-At: " + batches_attempting
      //           + ". RAM: " + ram_needed
      //           )
      //         }
              
      //         if (batches_launched >= request_action.batches_needed) {
      //           if(batches_launched > request_action.batches_needed) {
      //             ns.toast("Somehow managed to launch more batch grow batches than requested for " + server_to_target, "warning")
      //             //await ns.sleep(60000)
      //           }
      //           break
      //         }
      //       }

      //       // If we're only checking for a single batch, and we've already checked for a single batch
      //       // previously, we've run out of RAM space to fit batches into
      //       if (batches_attempting == 1) {
      //         if (already_checked_one_batch) {
      //           break;
      //         }
      //         else {
      //           already_checked_one_batch = true
      //         }
      //       }
            
      //       // Either we have launched all necessary batches or we need
      //       // to reduce the number of batches we're attempting in one go
      //       batches_attempting = Math.min(batches_remaining, Math.ceil(batches_attempting/2))
      //       ram_needed = single_batch_ram * batches_attempting
      //       await ns.sleep(50)
      //     }
      //   }
      //   // Action a batch hack request
      //   else if (request_action.script_action == "batch_hack") {
      //     // Example Batch Hack request format
      //     // let update_3 = {
      //     //   "action": "request_action",
      //     //   "request_action": {
      //     //     "script_action": "batch_hack",
      //     //     "target": arg_flags.target,
      //     //     "batch_hack": {
      //     //       "threads": 1,
      //     //       "addMsec": hack_delay
      //     //     },
      //     //     "weaken_hack": {
      //     //       "threads": weaken_threads_for_hack,
      //     //       "addMsec": weaken_hack_delay 
      //     //     },
      //     //     "batch_grow": {
      //     //       "threads": grow_threads,
      //     //       "addMsec": grow_delay,
      //     //       "sec_inc": grow_sec_inc
      //     //     },
      //     //     "weaken_grow": {
      //     //       "threads": weaken_threads_for_growth,
      //     //       "addMsec": weaken_grow_delay
      //     //     }
      //     //   }
      //     // }

      //     let batch_server
      //     let ram_needed = 
      //       1.7 * request_action.batch_hack.threads // Hack RAM
      //     + 1.75 * (request_action.weaken_hack.threads + request_action.weaken_grow.threads) // Weaken RAM
      //     + 1.75 * request_action.batch_grow.threads // Grow RAM
          
      //     for(let server in all_server_status) {
      //       if (
      //           (     all_server_status[server].free_ram >= ram_needed
      //             &&  server != "home"
      //           )
      //       ||  (     (all_server_status[server].free_ram - 16) >= ram_needed
      //             &&  server == "home"
      //           )
      //       ) {
      //         batch_server = server
      //         break
      //       }
      //     }
      //     if (batch_server) {
      //       let hack_script_args = [
      //         "--target", server_to_target,
      //         "--addMsec", request_action.batch_hack.addMsec,
      //         "--threads", request_action.batch_hack.threads,
      //         "--server", batch_server
      //       ]
      //       let weaken_hack_script_args = [
      //         "--target", server_to_target,
      //         "--addMsec", request_action.weaken_hack.addMsec,
      //         "--threads", request_action.weaken_hack.threads,
      //         "--server", batch_server
      //       ]
      //       let grow_script_args = [
      //         "--target", server_to_target,
      //         "--addMsec", request_action.batch_grow.addMsec,
      //         "--threads", request_action.batch_grow.threads,
      //         "--server", batch_server,
      //         "--sec_inc", request_action.batch_grow.sec_inc
      //       ]
      //       let weaken_grow_script_args = [
      //         "--target", server_to_target,
      //         "--addMsec", request_action.weaken_grow.addMsec,
      //         "--threads", request_action.weaken_grow.threads,
      //         "--server", batch_server
      //       ]
      //       let hack_script_pid = ns.exec("scripts/hack.js",batch_server,request_action.batch_hack.threads,...hack_script_args)
      //       let weaken_hack_script_pid = ns.exec("scripts/weaken.js",batch_server,request_action.weaken_hack.threads,...weaken_hack_script_args)
      //       let grow_script_pid = ns.exec("scripts/grow.js",batch_server,request_action.batch_grow.threads,...grow_script_args)
      //       let weaken_grow_script_pid = ns.exec("scripts/weaken.js",batch_server,request_action.weaken_grow.threads,...weaken_grow_script_args)
      //       if (
      //           hack_script_pid == 0
      //       ||  weaken_hack_script_pid == 0
      //       ||  grow_script_pid == 0
      //       ||  weaken_grow_script_pid == 0
      //       ) {
      //         ns.print("Had to kill batch hack processes due to missing pid")
      //         ns.toast("Had to kill batch hack processes due to missing pid", "warning")
      //         ns.kill(hack_script_pid)
      //         ns.kill(weaken_grow_script_pid)
      //         ns.kill(grow_script_pid)
      //         ns.kill(weaken_grow_script_pid)

      //         // Something about the server we attempted to use is not reflected in the state we maintain.
      //         all_server_status[batch_server].free_ram = ns.getServerMaxRam(batch_server) - ns.getServerUsedRam(batch_server)
      //         SERVER_INFO_HANDLER.clear()
      //         SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
      //       }
      //       else {
      //         all_server_status[batch_server].free_ram = all_server_status[batch_server].free_ram - ram_needed
      //         all_server_status[batch_server].actions[hack_script_pid] = {
      //           "server": batch_server,
      //           "target": server_to_target,
      //           "action": "hack",
      //           "threads": request_action.batch_hack.threads
      //         }
      //         all_server_status[batch_server].actions[weaken_hack_script_pid] = {
      //           "server": batch_server,
      //           "target": server_to_target,
      //           "action": "weaken",
      //           "threads": request_action.weaken_hack.threads
      //         }
      //         all_server_status[batch_server].actions[grow_script_pid] = {
      //           "server": batch_server,
      //           "target": server_to_target,
      //           "action": "grow",
      //           "threads": request_action.batch_grow.threads
      //         }
      //         all_server_status[batch_server].actions[weaken_grow_script_pid] = {
      //           "server": batch_server,
      //           "target": server_to_target,
      //           "action": "weaken",
      //           "threads": request_action.weaken_grow.threads
      //         }
      //         SERVER_INFO_HANDLER.clear()
      //         SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
      //       }
      //     }
      //     else {
      //       ns.print("No Server Fit for Batch Hack work")
      //       ns.toast("No Server Fit for Batch Hack work","warning",5000)
      //     }
      //   }
      //   // Action an individual manage/prepare server request
      //   else if (
      //       request_action.script_action == "manage"
      //   ||  request_action.script_action == "preserv"
      //   ) {
      //     let launch_manager = true
      //     if (request_action.script_action == "manage") {
      //       filename = "scripts/manage_server_hack.js"
      //     }
      //     else if (request_action.script_action == "preserv") {
      //       filename = "scripts/manage_server_prep.js"
      //     }
      //     ram_needed = ns.getScriptRam(filename)
      //     // Try new management scripts on n00dles first
      //     // if (server_to_target == "n00dles") {
      //     //   filename = "scripts/manage_server_hack.js"
      //     // }

      //     let server_to_use = ""
      //     for (let server in all_server_status) {
      //       if (
      //          server == "home"
      //       || server.includes("pserv")
      //       ) {
      //         let server_scripts = ns.ps(server)
      //         for (let script of server_scripts) {
      //           switch (script.filename) {
      //             case "scripts/manage_server_hack.js":
      //               for (let script_arg of script.args){
      //                 if (script_arg == server_to_target){
      //                   launch_manager = false
      //                   break
      //                 }
      //               }
      //               break
      //           }
      //         }
      //         if (
      //             server == "home"
      //         &&  ram_needed > all_server_status[server].free_ram - 8
      //         ) {
      //           continue
      //         }
      //         else if (
      //             server.includes("pserv")
      //         &&  ram_needed > all_server_status[server].free_ram
      //         ) {
      //           continue
      //         }
      //         else {
      //           server_to_use = server
      //           break
      //         }
      //       }
      //     }
      //     let adjustment = 0
      //     if (server_to_use == "home") {
      //       adjustment = 8
      //     }
          
      //     if (server_to_use == "") {
      //       launch_manager = false
      //       ns.toast("Failed to launch manager for " + server_to_target + " due to lack of available RAM", "warning")
      //     }
      //     else if (ram_needed > (all_server_status[server_to_use].free_ram - adjustment)) {
      //       launch_manager = false
      //       ns.toast("Failed to launch manager for " + server_to_target + " after sever was selected, due to missing RAM", "error")
      //     }
      //     if (launch_manager) {
      //       let script_args = [
      //         "--target", server_to_target
      //       ]
      //       ns.print("Attempting to launch manager for " + server_to_target)
      //       let script_pid = ns.exec(filename,server_to_use,1,...script_args)
      //       if (script_pid != 0) {
      //         all_server_status[server_to_use].free_ram = all_server_status[server_to_use].free_ram - ram_needed
      //         all_server_status[server_to_use].actions[script_pid] = {
      //           "server": server_to_use,
      //           "target": server_to_target,
      //           "action": request_action.script_action,
      //           "threads": request_action.threads
      //         }
      //       }
      //       else {
      //         ns.toast("Failed to launch manager for " + server_to_target + " for unknown reason, pid == 0", "error")
      //       }
      //       SERVER_INFO_HANDLER.clear()
      //       SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
      //     }
      //     else {
      //       ns.toast("Failed to launch a manager for some other reason?", "error")
      //     }
      //   }
      //   // Action a global server manager request
      //   else if (request_action.script_action == "manager") {
      //     let filename = "scripts/manage_servers_v2.js"
      //     let script_pid = ns.exec(filename,"home",request_action.threads)
      //     if (script_pid != 0) {
      //       all_server_status["home"].free_ram = all_server_status["home"].free_ram - ns.getScriptRam(filename)
      //       all_server_status["home"].actions[script_pid] = {
      //         "server": "home",
      //         "target": request_action.target,
      //         "action": request_action.script_action,
      //         "threads": request_action.threads
      //       }
      //     }
      //     SERVER_INFO_HANDLER.clear()
      //     SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
      //   }
      //   // Action a global hacknet manager request
      //   else if(request_action.script_action == "hacknet") {
      //     let filename = "scripts/manage_hacknet.js"
      //     let script_pid = ns.exec(filename,"home",request_action.threads)
      //     if (script_pid != 0) {
      //       all_server_status["home"].free_ram = all_server_status["home"].free_ram - ns.getScriptRam(filename)
      //       all_server_status["home"].actions[script_pid] = {
      //         "server": "home",
      //         "target": request_action.target,
      //         "action": request_action.script_action,
      //         "threads": request_action.threads
      //       }
      //     }
      //     SERVER_INFO_HANDLER.clear()
      //     SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
      //   }
      //   // Action a global personal server manager request
      //   else if (request_action.script_action == "pserver") {
      //     let filename = "scripts/manage_pservers.js"
      //     let script_pid = ns.exec(filename,"home",request_action.threads)
      //     if (script_pid != 0) {
      //       all_server_status["home"].free_ram = all_server_status["home"].free_ram - ns.getScriptRam(filename)
      //       all_server_status["home"].actions[script_pid] = {
      //         "server": "home",
      //         "target": request_action.target,
      //         "action": request_action.script_action,
      //         "threads": request_action.threads
      //       }
      //     }
      //     SERVER_INFO_HANDLER.clear()
      //     SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
      //   }
      //   else if (request_action.script_action == "weakexp") {
      //     all_server_status[request_action.server].free_ram = all_server_status[request_action.server].free_ram - request_action.ram_used
      //     all_server_status[request_action.server].actions[request_action.pid_to_use] = {
      //       "server": request_action.server,
      //       "target": request_action.target,
      //       "action": request_action.script_action,
      //       "threads": request_action.threads 
      //     }
      //   }
      //   else if (request_action.script_action == "freeram") {
      //     let filename = "scripts/manage_free_ram.js"
      //     let launch_script = true
      //     let server_scripts = ns.ps("home")          
      //     for (let script of server_scripts) {
      //       switch (script.filename) {
      //         case filename:
      //           launch_script = false
      //           break
      //       }
      //     }
      //     if (launch_script) {
      //       let script_pid = ns.exec(filename,"home",request_action.threads)

      //       if (script_pid != 0) {
      //         all_server_status["home"].free_ram = all_server_status["home"].free_ram - ns.getScriptRam(filename)
      //         all_server_status["home"].actions[script_pid] = {
      //           "server": "home",
      //           "target": request_action.target,
      //           "action": request_action.script_action,
      //           "threads": request_action.threads
      //         }
      //       }
      //     }
      //   }
      //   else if (request_action.script_action == "repopti") {
      //     let filename = "scripts/report_server_optis.js"
      //     let script_pid = ns.exec(filename,"home",request_action.threads)

      //     if (script_pid != 0) {
      //       all_server_status["home"].free_ram = all_server_status["home"].free_ram - ns.getScriptRam(filename)
      //       all_server_status["home"].actions[script_pid] = {
      //         "server": "home",
      //         "target": request_action.target,
      //         "action": request_action.script_action,
      //         "threads": request_action.threads
      //       }
      //     }
      //   }
      //   else if (request_action.script_action == "BNMult") {
      //     let filename = "scripts/util/populate_bitnode_mults.js"
      //     let script_pid = ns.exec(filename,"home",request_action.threads)

      //     if (script_pid != 0) {
      //       all_server_status["home"].free_ram = all_server_status["home"].free_ram - ns.getScriptRam(filename)
      //       all_server_status["home"].actions[script_pid] = {
      //         "server": "home",
      //         "target": request_action.target,
      //         "action": request_action.script_action,
      //         "threads": request_action.threads
      //       }
      //     }
      //   }
      //   else if (request_action.script_action == "cctsolv") {
      //     ns.tprint("WE ARE HERE")
      //     await ns.sleep(10000)
      //     let filename = "scripts/solve_cct.js"
      //     ram_needed = ns.getScriptRam(filename)

      //     let launch_solver = true
      //     let server_to_use = ""
      //     for (let server in all_server_status) {
      //       if (
      //          server == "home"
      //       || server.includes("pserv")
      //       ) {
      //         if (
      //             server == "home"
      //         &&  ram_needed > all_server_status[server].free_ram - 8
      //         ) {
      //           continue
      //         }
      //         else if (
      //             server.includes("pserv")
      //         &&  ram_needed > all_server_status[server].free_ram
      //         ) {
      //           continue
      //         }
      //         else {
      //           server_to_use = server
      //           break
      //         }
      //       }
      //     }
      //     let adjustment = 0
      //     if (server_to_use == "home") {
      //       adjustment = 8
      //     }
      //     if (server_to_use == "") {
      //       launch_solver = false
      //       ns.toast("Failed to launch solver for " + request_action.filename + " due to lack of available RAM", "warning")
      //     }
      //     else if (ram_needed > (all_server_status[server_to_use].free_ram - adjustment)) {
      //       launch_solver = false
      //       ns.toast("Failed to launch manager for " + request_action.filename + " after sever was selected, due to missing RAM", "error")
      //     }
      //     else if (ram_needed > (ns.getServerMaxRam(server_to_use) - ns.getServerUsedRam(server_to_use) - adjustment)) {
      //       launch_solver = false
      //       ns.toast("Failed to launch manager for " + request_action.filename + " after sever was selected, Real Free RAM being different", "error")
      //     }

      //     if (launch_solver) {
      //       let contract_info = {
      //         "contract_server": request_action.target,
      //         "contract_file": request_action.filename,
      //         "contract_type": request_action.contract_type,
      //         "contract_data": request_action.contract_data,
      //         "contract_attempts": request_action.contract_attempts
      //       }

      //       ns.tprint(JSON.stringify(contract_info))

      //       let script_args = [
      //         "--server", server_to_use,
      //         "--contract_info", JSON.stringify(contract_info)
      //       ]
      //       let script_pid = ns.exec(filename,server_to_use,request_action.threads,...script_args)

      //       if (script_pid != 0) {
      //         all_server_status[server_to_use].free_ram = all_server_status[server_to_use].free_ram - ram_needed
      //         all_server_status[server_to_use].actions[script_pid] = {
      //           "server": server_to_use,
      //           "target": request_action.target,
      //           "action": request_action.script_action,
      //           "threads": request_action.threads
      //         }
      //       }
      //       else {
      //         ns.toast("Failed to launch manager for another reason")
      //         await ns.sleep(30000)
      //       }
      //     }
      //   }
      // }
    }
    
    // Pop the update from the queue now that we've finished it
    UPDATE_HANDLER.read()
  }
}