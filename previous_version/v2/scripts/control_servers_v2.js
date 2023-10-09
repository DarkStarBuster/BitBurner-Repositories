import {scan_for_servers} from "/scripts/util/scan_for_servers"

const DEPTH_LIMIT = 50
const MILLIS_IN_SECOND = 1000
const SECONDS_IN_MINUTE = 60
const TIME_TO_SLEEP = MILLIS_IN_SECOND * SECONDS_IN_MINUTE * 10
const IGNORE = []


/**
 * all_server_status is an object that will hold information about all servers we have root access to.
 * 
 * It will be exposed on Port 3 as a result of JSON.stringify(all_server_status)
 * 
 * all_server_status = {
 *  "n00dles" = {
 *    "max_money": ns.getServerMaxMoney(server),
 *    "current_money": ns.getServerMoneyAvailable(server),
 *    "max_ram": ns.getServerMaxRam(server),
 *    "free_ram": ns.getServerFree
 *    "min_difficulty": ns.getServerMinSecurityLevel(server),
 *    "current_difficulty": ns.getServerSecurityLevel(server),
 *    "actions": {
 *      <PID> = {
 *        "server": <hostname>,
 *        "target": <hostname>,
 *        "action": "hack" | "grow" | "weaken" | <script_name>
 *      },
 *      <PID> ...
 *    }
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
 *    "server": <hostname>,
 *    "current_money": <number>,
 *    "current_difficulty": <number>,
 *    "free_ram": <number>,
 *    "pid_to_remove": <number>,
 *  },
 *  "request_action": {
 *    "script_action": "hack" | "grow" | "weaken" | "manage"
 *    "target": <hostname>,
 *    "threads": <number>,
 *    "addMsec": <number>,
 *    "sec_inc": <number>,
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

/** @param {NS} ns */
function populate_all_server_status(ns) {
  let rooted_servers = scan_for_servers(ns,{"is_rooted":true,"include_home":true})

  //ns.tprint(rooted_servers)

  for(var i = 0; i < rooted_servers.length; i++){
    let server = rooted_servers[i]

    let server_info = {
      "max_money": ns.getServerMaxMoney(server),
      "current_money": ns.getServerMoneyAvailable(server),
      "max_ram": ns.getServerMaxRam(server),
      "free_ram": ns.getServerMaxRam(server) - ns.getServerUsedRam(server),
      "min_difficulty": ns.getServerMinSecurityLevel(server),
      "current_difficulty": ns.getServerSecurityLevel(server),
      "actions":{}
    }

    if (server == "home") {
      let server_scripts = ns.ps(server)
      for (let script of server_scripts) {
        let action_name = ""
        switch (script.filename) {
          case "scripts/control_servers_v2.js":
            action_name = "control"
            break
          default:
            action_name = "Unknown"
            break
        }
        server_info.actions[script.pid] = {
          "server": server,
          "action": action_name,
          "target": server,
          "threads": 1
        }
      }
    }

    all_server_status[server] = server_info
  }
}

/**
 *  @param {NS} ns
 *  @param {NetscriptPort} handler
 */
function start_managers(ns, handler) {
  // Start Control Parameters Manager
  let update = {
    "action": "request_action",
    "request_action" : {
      "script_action": "params",
      "target": "home",
      "threads": 1
    }
  }

  handler.write(JSON.stringify(update))
  
  // Start BitNode Multipliers populater
  update = {
    "action": "request_action",
    "request_action" : {
      "script_action": "BNMult",
      "target": "home",
      "threads": 1
    }
  }

  handler.write(JSON.stringify(update))

  // Start the Hack/Prep Manager Manager
  update = {
    "action": "request_action",
    "request_action" : {
      "script_action": "manager",
      "target": "home",
      "threads": 1
    }
  }

  handler.write(JSON.stringify(update))

  if (ns.getServerMaxRam("home") >= 64) {
    // Start the Automatic Hacknet Upgrade Manager
    update = {
      "action": "request_action",
      "request_action": {
        "script_action": "hacknet",
        "target": "home",
        "threads": 1
      }
    }

    handler.write(JSON.stringify(update))

    // Start the Automatic Personal Server Manager
    update = {
      "action": "request_action",
      "request_action": {
        "script_action": "pserver",
        "target": "home",
        "threads": 1
      }
    }

    handler.write(JSON.stringify(update))
    // Either of these two processes finishing will start the Free Ram Manager
  }
  if (ns.getServerMaxRam("home") > 128) {
    update = {
      "action": "request_action",
      "request_action": {
        "script_action": "repopti",
        "target": "home",
        "threads": 1
      }
    }

    handler.write(JSON.stringify(update))
  }
}

/** @param {NS} ns */
export async function main(ns) {
  const CONTROL_PARAMETERS = ns.getPortHandle(1)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(2)
  const SERVER_INFO_HANDLER = ns.getPortHandle(3)
  const UPDATE_HANDLER = ns.getPortHandle(4)

  disable_logs(ns)

  // ns.tprint(JSON.stringify(all_server_status))

  CONTROL_PARAMETERS.clear()
  BITNODE_MULTS_HANDLER.clear()
  SERVER_INFO_HANDLER.clear()
  UPDATE_HANDLER.clear()

  while (!CONTROL_PARAMETERS.empty()) {
    CONTROL_PARAMETERS.clear()
    await ns.sleep(100)
  }
  while (!BITNODE_MULTS_HANDLER.empty()) {
    BITNODE_MULTS_HANDLER.clear()
    await ns.sleep(100)
  }
  while (!SERVER_INFO_HANDLER.empty()) {
    SERVER_INFO_HANDLER.clear()
    await ns.sleep(100)
  }
  while (!UPDATE_HANDLER.empty()) {
    UPDATE_HANDLER.clear()
    await ns.sleep(100)
  }

  kill_all_other_processes(ns)

  populate_all_server_status(ns)

  SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))

  start_managers(ns, UPDATE_HANDLER)

  ns.print("Starting Loop")
  while(true){
    let update_string = UPDATE_HANDLER.peek()
    ns.print("Update String at start of loop: " + update_string)
    while (update_string == "NULL PORT DATA"){
      await ns.sleep(50)
      update_string = UPDATE_HANDLER.peek()
      //ns.print("Await ended: String: " + update_string + " Is Empty: " + UPDATE_HANDLER.empty())
    }

    // Look at the top of the queue
    ns.print(update_string)
    let update = JSON.parse(update_string)
    ns.print("Recieved Update to Process")
    // for (let key in update) {
    //   ns.print("Key: " + key + " Val: " + update[key])
    // }

    // Check that the data is well formed and then update the status
    let update_action = update.action
    ns.print("Update Action Type: " + update_action)
    if (update_action == "update_info") {
      ns.print("Performing Update Info")
      let update_info = update.update_info
      let server_to_update = update_info.server
      if (all_server_status[server_to_update]) {
        let update_performed = false
        if (update_info.current_money) {
          all_server_status[server_to_update].current_money = update_info.current_money
          update_performed = true
        }
        if (update_info.money_mult) {
          all_server_status[server_to_update].current_money *= update_info.money_mult
          all_server_status[server_to_update].current_money = Math.min(all_server_status[server_to_update].current_money,ns.getServerMaxMoney(server_to_update))
          update_performed = true
        }
        if (update_info.earned_money) {
          all_server_status[server_to_update].current_money -= update_info.earned_money
          update_performed = true
        }
        if (update_info.max_ram) {
          all_server_status[server_to_update].max_ram = update_info.max_ram
          update_performed = true
        }
        if (update_info.free_ram) {
          all_server_status[server_to_update].free_ram = update_info.free_ram
          update_performed = true
        }
        if(update_info.freed_ram) {
          all_server_status[server_to_update].free_ram += update_info.freed_ram
          all_server_status[server_to_update].free_ram = Math.min(all_server_status[server_to_update].free_ram,ns.getServerMaxRam(server_to_update))
          update_performed = true
        }
        if (update_info.current_difficulty) {
          all_server_status[server_to_update].current_difficulty = update_info.current_difficulty
          update_performed = true
        }
        if (update_info.diff_reduced_by) {
          all_server_status[server_to_update].current_difficulty -= update_info.diff_reduced_by
          all_server_status[server_to_update].current_difficulty = Math.max(all_server_status[server_to_update].current_difficulty,ns.getServerMinSecurityLevel(server_to_update))
          update_performed = true
        }
        if (update_info.diff_increased_by) {
          all_server_status[server_to_update].current_difficulty += update_info.diff_increased_by
          update_performed = true
        }
        if (update_info.pid_to_remove) {
          let server_actions = {}
          for (let key in all_server_status[server_to_update].actions) {
            if (key != update_info.pid_to_remove) {
              server_actions[key] = all_server_status[server_to_update].actions[key]
            }
          }
          all_server_status[server_to_update].actions = server_actions
          update_performed = true
        }
        // No updates performed, check processes still exist
        if (!update_performed) {
          ns.print("No Update Performed - Perform Validation: " + server_to_update)
          //await ns.sleep(30000)
          let actions = ns.ps(server_to_update)
          let action_pids = []
          let server_actions = {}
          let removed_process

          for (let action of actions) {
            action_pids.push(action.pid)
          }

          for (let key in all_server_status[server_to_update].actions) {
            if (action_pids.indexOf(parseInt(key)) != -1) {
              server_actions[key] = all_server_status[server_to_update].actions[key]
            }
          }

          all_server_status[server_to_update].current_money = ns.getServerMoneyAvailable(server_to_update)
          all_server_status[server_to_update].max_ram = ns.getServerMaxRam(server_to_update)
          all_server_status[server_to_update].free_ram = ns.getServerMaxRam(server_to_update) - ns.getServerUsedRam(server_to_update)
          all_server_status[server_to_update].current_difficulty = ns.getServerSecurityLevel(server_to_update)
          all_server_status[server_to_update].actions = server_actions
        }

        // Write the update to the Info Port
        SERVER_INFO_HANDLER.clear()
        SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
      }
      else {
        // New Server to add to the port.
        all_server_status[server_to_update] = {
          "max_money": ns.getServerMaxMoney(server_to_update),
          "current_money": ns.getServerMoneyAvailable(server_to_update),
          "max_ram": ns.getServerMaxRam(server_to_update),
          "free_ram": ns.getServerMaxRam(server_to_update) - ns.getServerUsedRam(server_to_update),
          "min_difficulty": ns.getServerMinSecurityLevel(server_to_update),
          "current_difficulty": ns.getServerSecurityLevel(server_to_update),
          "actions":{}
        }

        SERVER_INFO_HANDLER.clear()
        SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
      }
    }
    else if (update_action == "request_action") {
      ns.print("Performing Request Action")
      let request_action = update.request_action
      let server_to_target = request_action.target 
      let ram_needed = 0
      let filename = ""
      if (all_server_status[server_to_target]) {
        ns.print("Performing " + request_action.script_action)
        if (
            request_action.script_action == "hack"
        ||  request_action.script_action == "grow"
        //||  request_action.script_action == "weaken"
        ) {
          let script_args = [
            "--target", server_to_target,
            "--addMsec", request_action.addMsec,
            "--threads", request_action.threads
          ]
          switch (request_action.script_action) {
            case "hack":
              ram_needed = 1.7 * request_action.threads
              filename = "scripts/hack.js"
              break
            case "grow":
              ram_needed = 1.75 * request_action.threads
              filename = "scripts/grow.js"
              break
            case "weaken":
              ram_needed = 1.75 * request_action.threads
              filename = "scripts/weaken.js"
              break
          }
          let script_pid = 0
          for(let server in all_server_status) {
            if (
                (     all_server_status[server].free_ram >= ram_needed
                  &&  server != "home"
                )
            ||  (     (all_server_status[server].free_ram - 16) >= ram_needed
                  &&  server == "home"
                )
            ) {
              script_args.push("--server")
              script_args.push(server)
              if (request_action.script_action == "grow") {
                script_args.push("--sec_inc")
                script_args.push(request_action.sec_inc)
              }
              //ns.tprint(script_args)
              script_pid = ns.exec(filename,server,request_action.threads,...script_args)
              if (script_pid != 0) {
                all_server_status[server].free_ram = all_server_status[server].free_ram - ram_needed
                all_server_status[server].actions[script_pid] = {
                  "server": server,
                  "target": server_to_target,
                  "action": request_action.script_action,
                  "threads": request_action.threads
                }
              }
              SERVER_INFO_HANDLER.clear()
              SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
              break
            }
          }
          if (script_pid == 0) {
            ns.toast("Action failed to be processed: " + request_action.script_action + " on " + server_to_target, "warning", 5000)
          }
        }
        else if (request_action.script_action == "weaken") {
          let threads_launched = 0
          let threads_remaining = request_action.threads
          let threads_attempting = request_action.threads
          let ram_needed = 1.75 * threads_attempting
          let already_checked_one_thread = false
          while (threads_remaining > 0) {
            ns.print(
              "Target: " + server_to_target
            + ". Th-Re: " + threads_remaining
            + ". Th-La: " + threads_launched
            + ". Th-At: " + threads_attempting
            + ". RAM: " + ram_needed
            )
            for (let server in all_server_status) {
              let script_args = [
                "--target", server_to_target,
                "--addMsec", request_action.addMsec,
                //"--threads", request_action.threads
              ]
              let script_pid = 0
              if (
                  (     all_server_status[server].free_ram >= ram_needed
                    &&  server != "home"
                  )
              ||  (     (all_server_status[server].free_ram - 16) >= ram_needed
                    &&  server == "home"
                  )
              ) {
                script_args.push("--threads",threads_attempting)
                script_args.push("--server",server)
                script_pid = ns.exec("scripts/weaken.js", server, threads_attempting,...script_args)
                if (script_pid != 0){
                  ns.print("Launched process " + script_pid + " on " + server)
                  all_server_status[server].free_ram = all_server_status[server].free_ram - ram_needed
                  all_server_status[server].actions[script_pid] = {
                    "server": server,
                    "target": server_to_target,
                    "action": request_action.script_action,
                    "threads": threads_attempting
                  }
                  threads_launched += threads_attempting
                  threads_remaining -= threads_attempting
                }
                else {
                  ns.print("Attempted to launch and failed?")
                }
                ns.print(
                  "Target: " + server_to_target
                + ". Th-Re: " + threads_remaining
                + ". Th-La: " + threads_launched
                + ". Th-At: " + threads_attempting
                + ". RAM: " + ram_needed
                )
              }
              
              if (threads_launched >= request_action.threads) {
                if(threads_launched > request_action.threads) {
                  ns.toast("Somehow managed to launch more weaken threads than requested", "warning")
                }
                break
              }
            }
            // If we're only checking for a single thread, and we've already checked for a single thread
            // previously, we've run out of RAM space to fit threads into
            if (threads_attempting == 1) {
              if (already_checked_one_thread) {
                break;
              }
              else {
                already_checked_one_thread = true
              }
            }
            threads_attempting = Math.min(threads_remaining, Math.ceil(threads_attempting/2))
            ram_needed = 1.75 * threads_attempting
            //await ns.sleep(200)
          }

        }
        // Action a batch grow request
        else if (request_action.script_action == "batch_grow") {
          // Example Batch Grow request format
          // let update_2 = {
          //   "action": "request_action",
          //   "request_action": {
          //     "script_action": "batch_grow",
          //     "target": arg_flags.target,
          //     "batches_needed": Math.ceil(total_num_threads / num_threads),
          //     "grow": {
          //       "threads": num_threads,
          //       "addMsec": grow_delay,
          //       "sec_inc": grow_sec_inc
          //     },
          //     "weaken_grow": {
          //       "threads": 2,
          //       "addMsec": weaken_grow_delay
          //     }
          //   }
          // }

          let batches_launched = 0
          let batches_remaining = request_action.batches_needed
          let batches_attempting = request_action.batches_needed
          let single_batch_ram = 
            1.75 * request_action.weaken_grow.threads // Weaken RAM
          + 1.75 * request_action.batch_grow.threads // Grow RAM
          let ram_needed = single_batch_ram * batches_attempting
          let already_checked_one_batch = false

          while (batches_remaining > 0) {
            ns.print(
              "Target: " + server_to_target
            + ". Ba-Re: " + batches_remaining
            + ". Ba-La: " + batches_launched
            + ". Ba-At: " + batches_attempting
            + ". RAM: " + ram_needed
            )

            // Search all servers for free ram
            for (let server in all_server_status) {
              let grow_script_args = [
                "--target", server_to_target,
                "--addMsec", request_action.batch_grow.addMsec
              ]
              let weaken_script_args = [
                "--target", server_to_target,
                "--addMsec", request_action.weaken_grow.addMsec
              ]
              let grow_script_pid = 0
              let weaken_script_pid = 0
              
              // Does this server have enough free ram to satisfy the current ram needed?
              if (
                  (     all_server_status[server].free_ram >= ram_needed
                    &&  server != "home"
                  )
              ||  (     (all_server_status[server].free_ram - 16) >= ram_needed
                    &&  server == "home"
                  )
              ) {
                grow_script_args.push(
                  "--server", server,
                  "--threads", batches_attempting * request_action.batch_grow.threads,
                  "--sec_inc", batches_attempting * request_action.batch_grow.sec_inc
                )
                weaken_script_args.push(
                  "--server", server,
                  "--threads", batches_attempting * request_action.weaken_grow.threads
                )
                grow_script_pid = ns.exec("scripts/grow.js", server, batches_attempting * request_action.batch_grow.threads,...grow_script_args)
                weaken_script_pid = ns.exec("scripts/weaken.js", server, batches_attempting * request_action.weaken_grow.threads,...weaken_script_args)

                // Check we launched both expected processes
                if (
                    grow_script_pid == 0
                ||  weaken_script_pid == 0
                ) {
                  ns.print("Had to kill batch grow processes due to missing pid")
                  ns.toast("Had to kill batch grow processes due to missing pid", "warning")
                  ns.kill(grow_script_pid)
                  ns.kill(weaken_script_pid)

                  // Something about the server we attempted to use is not reflected in the state we maintain.
                  all_server_status[server].free_ram = ns.getServerMaxRam(server) - ns.getServerUsedRam(server)
                  SERVER_INFO_HANDLER.clear()
                  SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
                }
                else {
                  batches_launched += batches_attempting
                  batches_remaining -= batches_attempting
                  all_server_status[server].free_ram = all_server_status[server].free_ram - ram_needed
                  all_server_status[server].actions[grow_script_pid] = {
                    "server": server,
                    "target": server_to_target,
                    "action": "grow",
                    "threads": batches_attempting * request_action.batch_grow.threads
                  }
                  all_server_status[server].actions[weaken_script_pid] = {
                    "server": server,
                    "target": server_to_target,
                    "action": "weaken",
                    "threads": batches_attempting * request_action.weaken_grow.threads
                  }
                  SERVER_INFO_HANDLER.clear()
                  SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
                  batches_attempting = Math.min(batches_attempting,batches_remaining)
                }
                ns.print(
                  "Target: " + server_to_target
                + ". Ba-Re: " + batches_remaining
                + ". Ba-La: " + batches_launched
                + ". Ba-At: " + batches_attempting
                + ". RAM: " + ram_needed
                )
              }
              
              if (batches_launched >= request_action.batches_needed) {
                if(batches_launched > request_action.batches_needed) {
                  ns.toast("Somehow managed to launch more batch grow batches than requested for " + server_to_target, "warning")
                  //await ns.sleep(60000)
                }
                break
              }
            }

            // If we're only checking for a single batch, and we've already checked for a single batch
            // previously, we've run out of RAM space to fit batches into
            if (batches_attempting == 1) {
              if (already_checked_one_batch) {
                break;
              }
              else {
                already_checked_one_batch = true
              }
            }
            
            // Either we have launched all necessary batches or we need
            // to reduce the number of batches we're attempting in one go
            batches_attempting = Math.min(batches_remaining, Math.ceil(batches_attempting/2))
            ram_needed = single_batch_ram * batches_attempting
            await ns.sleep(50)
          }
        }
        // Action a batch hack request
        else if (request_action.script_action == "batch_hack") {
          // Example Batch Hack request format
          // let update_3 = {
          //   "action": "request_action",
          //   "request_action": {
          //     "script_action": "batch_hack",
          //     "target": arg_flags.target,
          //     "batch_hack": {
          //       "threads": 1,
          //       "addMsec": hack_delay
          //     },
          //     "weaken_hack": {
          //       "threads": weaken_threads_for_hack,
          //       "addMsec": weaken_hack_delay 
          //     },
          //     "batch_grow": {
          //       "threads": grow_threads,
          //       "addMsec": grow_delay,
          //       "sec_inc": grow_sec_inc
          //     },
          //     "weaken_grow": {
          //       "threads": weaken_threads_for_growth,
          //       "addMsec": weaken_grow_delay
          //     }
          //   }
          // }

          let batch_server
          let ram_needed = 
            1.7 * request_action.batch_hack.threads // Hack RAM
          + 1.75 * (request_action.weaken_hack.threads + request_action.weaken_grow.threads) // Weaken RAM
          + 1.75 * request_action.batch_grow.threads // Grow RAM
          
          for(let server in all_server_status) {
            if (
                (     all_server_status[server].free_ram >= ram_needed
                  &&  server != "home"
                )
            ||  (     (all_server_status[server].free_ram - 16) >= ram_needed
                  &&  server == "home"
                )
            ) {
              batch_server = server
              break
            }
          }
          if (batch_server) {
            let hack_script_args = [
              "--target", server_to_target,
              "--addMsec", request_action.batch_hack.addMsec,
              "--threads", request_action.batch_hack.threads,
              "--server", batch_server
            ]
            let weaken_hack_script_args = [
              "--target", server_to_target,
              "--addMsec", request_action.weaken_hack.addMsec,
              "--threads", request_action.weaken_hack.threads,
              "--server", batch_server
            ]
            let grow_script_args = [
              "--target", server_to_target,
              "--addMsec", request_action.batch_grow.addMsec,
              "--threads", request_action.batch_grow.threads,
              "--server", batch_server,
              "--sec_inc", request_action.batch_grow.sec_inc
            ]
            let weaken_grow_script_args = [
              "--target", server_to_target,
              "--addMsec", request_action.weaken_grow.addMsec,
              "--threads", request_action.weaken_grow.threads,
              "--server", batch_server
            ]
            let hack_script_pid = ns.exec("scripts/hack.js",batch_server,request_action.batch_hack.threads,...hack_script_args)
            let weaken_hack_script_pid = ns.exec("scripts/weaken.js",batch_server,request_action.weaken_hack.threads,...weaken_hack_script_args)
            let grow_script_pid = ns.exec("scripts/grow.js",batch_server,request_action.batch_grow.threads,...grow_script_args)
            let weaken_grow_script_pid = ns.exec("scripts/weaken.js",batch_server,request_action.weaken_grow.threads,...weaken_grow_script_args)
            if (
                hack_script_pid == 0
            ||  weaken_hack_script_pid == 0
            ||  grow_script_pid == 0
            ||  weaken_grow_script_pid == 0
            ) {
              ns.print("Had to kill batch hack processes due to missing pid")
              ns.toast("Had to kill batch hack processes due to missing pid", "warning")
              ns.kill(hack_script_pid)
              ns.kill(weaken_grow_script_pid)
              ns.kill(grow_script_pid)
              ns.kill(weaken_grow_script_pid)

              // Something about the server we attempted to use is not reflected in the state we maintain.
              all_server_status[batch_server].free_ram = ns.getServerMaxRam(batch_server) - ns.getServerUsedRam(batch_server)
              SERVER_INFO_HANDLER.clear()
              SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
            }
            else {
              all_server_status[batch_server].free_ram = all_server_status[batch_server].free_ram - ram_needed
              all_server_status[batch_server].actions[hack_script_pid] = {
                "server": batch_server,
                "target": server_to_target,
                "action": "hack",
                "threads": request_action.batch_hack.threads
              }
              all_server_status[batch_server].actions[weaken_hack_script_pid] = {
                "server": batch_server,
                "target": server_to_target,
                "action": "weaken",
                "threads": request_action.weaken_hack.threads
              }
              all_server_status[batch_server].actions[grow_script_pid] = {
                "server": batch_server,
                "target": server_to_target,
                "action": "grow",
                "threads": request_action.batch_grow.threads
              }
              all_server_status[batch_server].actions[weaken_grow_script_pid] = {
                "server": batch_server,
                "target": server_to_target,
                "action": "weaken",
                "threads": request_action.weaken_grow.threads
              }
              SERVER_INFO_HANDLER.clear()
              SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
            }
          }
          else {
            ns.print("No Server Fit for Batch Hack work")
            ns.toast("No Server Fit for Batch Hack work","warning",5000)
          }
        }
        // Action an individual manage/prepare server request
        else if (
            request_action.script_action == "manage"
        ||  request_action.script_action == "preserv"
        ) {
          let launch_manager = true
          if (request_action.script_action == "manage") {
            filename = "scripts/manage_server_hack.js"
          }
          else if (request_action.script_action == "preserv") {
            filename = "scripts/manage_server_prep.js"
          }
          ram_needed = ns.getScriptRam(filename)
          // Try new management scripts on n00dles first
          // if (server_to_target == "n00dles") {
          //   filename = "scripts/manage_server_hack.js"
          // }

          let server_to_use = ""
          for (let server in all_server_status) {
            if (
               server == "home"
            || server.includes("pserv")
            ) {
              let server_scripts = ns.ps(server)
              for (let script of server_scripts) {
                switch (script.filename) {
                  case "scripts/manage_server_hack.js":
                    for (let script_arg of script.args){
                      if (script_arg == server_to_target){
                        launch_manager = false
                        break
                      }
                    }
                    break
                }
              }
              if (
                  server == "home"
              &&  ram_needed > all_server_status[server].free_ram - 8
              ) {
                continue
              }
              else if (
                  server.includes("pserv")
              &&  ram_needed > all_server_status[server].free_ram
              ) {
                continue
              }
              else {
                server_to_use = server
                break
              }
            }
          }
          let adjustment = 0
          if (server_to_use == "home") {
            adjustment = 8
          }
          
          if (server_to_use == "") {
            launch_manager = false
            ns.toast("Failed to launch manager for " + server_to_target + " due to lack of available RAM", "warning")
          }
          else if (ram_needed > (all_server_status[server_to_use].free_ram - adjustment)) {
            launch_manager = false
            ns.toast("Failed to launch manager for " + server_to_target + " after sever was selected, due to missing RAM", "error")
          }
          if (launch_manager) {
            let script_args = [
              "--target", server_to_target
            ]
            ns.print("Attempting to launch manager for " + server_to_target)
            let script_pid = ns.exec(filename,server_to_use,1,...script_args)
            if (script_pid != 0) {
              all_server_status[server_to_use].free_ram = all_server_status[server_to_use].free_ram - ram_needed
              all_server_status[server_to_use].actions[script_pid] = {
                "server": server_to_use,
                "target": server_to_target,
                "action": request_action.script_action,
                "threads": request_action.threads
              }
            }
            else {
              ns.toast("Failed to launch manager for " + server_to_target + " for unknown reason, pid == 0", "error")
            }
            SERVER_INFO_HANDLER.clear()
            SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
          }
          else {
            ns.toast("Failed to launch a manager for some other reason?", "error")
          }
        }
        // Action a global server manager request
        else if (request_action.script_action == "manager") {
          let filename = "scripts/manage_servers_v2.js"
          let script_pid = ns.exec(filename,"home",request_action.threads)
          if (script_pid != 0) {
            all_server_status["home"].free_ram = all_server_status["home"].free_ram - ns.getScriptRam(filename)
            all_server_status["home"].actions[script_pid] = {
              "server": "home",
              "target": request_action.target,
              "action": request_action.script_action,
              "threads": request_action.threads
            }
          }
          SERVER_INFO_HANDLER.clear()
          SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
        }
        // Action a global hacknet manager request
        else if(request_action.script_action == "hacknet") {
          let filename = "scripts/manage_hacknet.js"
          let script_pid = ns.exec(filename,"home",request_action.threads)
          if (script_pid != 0) {
            all_server_status["home"].free_ram = all_server_status["home"].free_ram - ns.getScriptRam(filename)
            all_server_status["home"].actions[script_pid] = {
              "server": "home",
              "target": request_action.target,
              "action": request_action.script_action,
              "threads": request_action.threads
            }
          }
          SERVER_INFO_HANDLER.clear()
          SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
        }
        // Action a global personal server manager request
        else if (request_action.script_action == "pserver") {
          let filename = "scripts/manage_pservers.js"
          let script_pid = ns.exec(filename,"home",request_action.threads)
          if (script_pid != 0) {
            all_server_status["home"].free_ram = all_server_status["home"].free_ram - ns.getScriptRam(filename)
            all_server_status["home"].actions[script_pid] = {
              "server": "home",
              "target": request_action.target,
              "action": request_action.script_action,
              "threads": request_action.threads
            }
          }
          SERVER_INFO_HANDLER.clear()
          SERVER_INFO_HANDLER.write(JSON.stringify(all_server_status))
        }
        // else if (request_action.script_action == "share") {
        //   all_server_status[request_action.server].free_ram = all_server_status[request_action.server].free_ram - request_action.ram_used
        //   all_server_status[request_action.server].actions[request_action.pid_to_use] = {
        //     "server": request_action.server,
        //     "target": request_action.target,
        //     "action": request_action.script_action,
        //     "threads": request_action.threads 
        //   }
        // }
        // else if (request_action.script_action == "sharer") {
        //   let filename = "scripts/manage_share.js"
        //   let script_pid = ns.run(filename)

        //   if (script_pid != 0) {
        //     all_server_status["home"].free_ram = all_server_status["home"].free_ram - ns.getScriptRam(filename)
        //     all_server_status["home"].actions[script_pid] = {
        //       "server": "home",
        //       "target": request_action.target,
        //       "action": request_action.script_action,
        //       "threads": request_action.threads
        //     }
        //   }
        // }
        else if (request_action.script_action == "weakexp") {
          all_server_status[request_action.server].free_ram = all_server_status[request_action.server].free_ram - request_action.ram_used
          all_server_status[request_action.server].actions[request_action.pid_to_use] = {
            "server": request_action.server,
            "target": request_action.target,
            "action": request_action.script_action,
            "threads": request_action.threads 
          }
        }
        else if (request_action.script_action == "freeram") {
          let filename = "scripts/manage_free_ram.js"
          let launch_script = true
          let server_scripts = ns.ps("home")          
          for (let script of server_scripts) {
            switch (script.filename) {
              case filename:
                launch_script = false
                break
            }
          }
          if (launch_script) {
            let script_pid = ns.exec(filename,"home",request_action.threads)

            if (script_pid != 0) {
              all_server_status["home"].free_ram = all_server_status["home"].free_ram - ns.getScriptRam(filename)
              all_server_status["home"].actions[script_pid] = {
                "server": "home",
                "target": request_action.target,
                "action": request_action.script_action,
                "threads": request_action.threads
              }
            }
          }
        }
        else if (request_action.script_action == "repopti") {
          let filename = "scripts/report_server_optis.js"
          let script_pid = ns.exec(filename,"home",request_action.threads)

          if (script_pid != 0) {
            all_server_status["home"].free_ram = all_server_status["home"].free_ram - ns.getScriptRam(filename)
            all_server_status["home"].actions[script_pid] = {
              "server": "home",
              "target": request_action.target,
              "action": request_action.script_action,
              "threads": request_action.threads
            }
          }
        }
        else if (request_action.script_action == "BNMult") {
          let filename = "scripts/util/populate_bitnode_mults.js"
          let script_pid = ns.exec(filename,"home",request_action.threads)

          if (script_pid != 0) {
            all_server_status["home"].free_ram = all_server_status["home"].free_ram - ns.getScriptRam(filename)
            all_server_status["home"].actions[script_pid] = {
              "server": "home",
              "target": request_action.target,
              "action": request_action.script_action,
              "threads": request_action.threads
            }
          }
        }
        else if (request_action.script_action == "cctsolv") {
          ns.tprint("WE ARE HERE")
          await ns.sleep(10000)
          let filename = "scripts/solve_cct.js"
          ram_needed = ns.getScriptRam(filename)

          let launch_solver = true
          let server_to_use = ""
          for (let server in all_server_status) {
            if (
               server == "home"
            || server.includes("pserv")
            ) {
              if (
                  server == "home"
              &&  ram_needed > all_server_status[server].free_ram - 8
              ) {
                continue
              }
              else if (
                  server.includes("pserv")
              &&  ram_needed > all_server_status[server].free_ram
              ) {
                continue
              }
              else {
                server_to_use = server
                break
              }
            }
          }
          let adjustment = 0
          if (server_to_use == "home") {
            adjustment = 8
          }
          if (server_to_use == "") {
            launch_solver = false
            ns.toast("Failed to launch solver for " + request_action.filename + " due to lack of available RAM", "warning")
          }
          else if (ram_needed > (all_server_status[server_to_use].free_ram - adjustment)) {
            launch_solver = false
            ns.toast("Failed to launch manager for " + request_action.filename + " after sever was selected, due to missing RAM", "error")
          }
          else if (ram_needed > (ns.getServerMaxRam(server_to_use) - ns.getServerUsedRam(server_to_use) - adjustment)) {
            launch_solver = false
            ns.toast("Failed to launch manager for " + request_action.filename + " after sever was selected, Real Free RAM being different", "error")
          }

          if (launch_solver) {
            let contract_info = {
              "contract_server": request_action.target,
              "contract_file": request_action.filename,
              "contract_type": request_action.contract_type,
              "contract_data": request_action.contract_data,
              "contract_attempts": request_action.contract_attempts
            }

            ns.tprint(JSON.stringify(contract_info))

            let script_args = [
              "--server", server_to_use,
              "--contract_info", JSON.stringify(contract_info)
            ]
            let script_pid = ns.exec(filename,server_to_use,request_action.threads,...script_args)

            if (script_pid != 0) {
              all_server_status[server_to_use].free_ram = all_server_status[server_to_use].free_ram - ram_needed
              all_server_status[server_to_use].actions[script_pid] = {
                "server": server_to_use,
                "target": request_action.target,
                "action": request_action.script_action,
                "threads": request_action.threads
              }
            }
            else {
              ns.toast("Failed to launch manager for another reason")
              await ns.sleep(30000)
            }
          }
        }
      }
    }
    
    // Pop the update from the queue now that we've finished it
    UPDATE_HANDLER.read()
  }
}