import { PORT_IDS } from "/src/scripts/util/constant_utilities"
import { release_ram, request_ram } from "/src/scripts/util/ram_management"
import { round_ram_cost } from "/src/scripts/util/rounding"
import { append_to_file, delete_file, rename_file } from "/src/scripts/util/file_management"

const LOG_FILENAME = "logs/manage_server_prep_curr"
const PRIOR_LOG_FILENAME = "logs/manage_server_prep_prior"
const FILE_EXTENSION = ".txt"

/**
 * @param {import("@ns").NS} ns 
 */
function init_file_log(ns, target){
  if (ns.fileExists(PRIOR_LOG_FILENAME + target + FILE_EXTENSION)) {
    delete_file(ns, PRIOR_LOG_FILENAME + target + FILE_EXTENSION)
  }
  if (ns.fileExists(LOG_FILENAME + target + FILE_EXTENSION)) {
    rename_file(ns, LOG_FILENAME + target + FILE_EXTENSION, PRIOR_LOG_FILENAME + target + FILE_EXTENSION)
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {string} message 
 */
function log(ns, target, message) {
  append_to_file(ns, LOG_FILENAME + target + FILE_EXTENSION, message + "\n")
}


/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const our_pid   = ns.pid
  const arg_flags = ns.flags([
    ["target",""]
  ])
  const SERVER_INFO_HANDLER = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)
  const UPDATE_HANDLER      = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
  const RAM_REQUEST_HANDLER = ns.getPortHandle(PORT_IDS.RAM_REQUEST_HANDLER)

  ns.disableLog("ALL")
  ns.enableLog("exec")

  ns.ui.setTailTitle("Manage Server Preparation V3.0 - Target: " + arg_flags.target + " - PID: " + our_pid)
  init_file_log(ns, arg_flags.target)

  if (arg_flags.target == "") {
    ns.tprint("No Target Server specified for manage_server.js")
    ns.exit()
  }

  const mock_server = ns.formulas.mockServer()
  mock_server.backdoorInstalled = false
  mock_server.cpuCores = 1
  mock_server.ftpPortOpen = true
  mock_server.hasAdminRights = true
  mock_server.hostname = arg_flags.target
  mock_server.httpPortOpen = true
  mock_server.ip = "1.1.1.1"
  mock_server.isConnectedTo = false
  mock_server.openPortCount = 5
  mock_server.organizationName = arg_flags.target
  mock_server.purchasedByPlayer = false
  mock_server.ramUsed = 0
  mock_server.smtpPortOpen = true
  mock_server.sqlPortOpen = true
  mock_server.sshPortOpen = true

  let started_hack_batching = false
  let server_info = JSON.parse(SERVER_INFO_HANDLER.peek())[arg_flags.target]

  while(!started_hack_batching) {
    log(ns, arg_flags.target, "Start Loop")
    await ns.sleep(4)
  
    server_info = JSON.parse(SERVER_INFO_HANDLER.peek())[arg_flags.target]
    mock_server.hackDifficulty       = ns.getServerSecurityLevel(arg_flags.target)
    mock_server.maxRam               = server_info.max_ram
    mock_server.minDifficulty        = server_info.min_diff
    mock_server.moneyAvailable       = ns.getServerMoneyAvailable(arg_flags.target)
    mock_server.moneyMax             = server_info.max_money
    mock_server.numOpenPortsRequired = server_info.num_ports_req
    mock_server.requiredHackingSkill = server_info.hack_lvl_req
    mock_server.serverGrowth         = server_info.growth

    let diff = mock_server.hackDifficulty - server_info.min_diff
    if (diff > 0) {
      log(ns, arg_flags.target, "diff > 0")
      // Prep weaken executions
      let num_threads = Math.ceil((diff) / 0.05)
      
      let weaken_scripts = []
      let threads_launched = 0
      let threads_remaining  = num_threads
      let threads_attempting = num_threads
      let ram_needed = round_ram_cost(1.75 * threads_attempting)

      ns.atExit(function() {
        let pid_array = []
        for (let info of weaken_scripts) {
          pid_array.push(info[0])
        }
        UPDATE_HANDLER.write(
          JSON.stringify({
            "action" : "death_react"
           ,"death_react": {
              "pids_to_kill" : pid_array
            }
          })
        )
        RAM_REQUEST_HANDLER.write(
          JSON.stringify({
            "action" : "death_react"
           ,"pid" : our_pid
          })
        )
      })

      let attempted_single_thread = false
      while (threads_remaining > 0) {
        log(ns, arg_flags.target, "threads remaining > 0: " + threads_remaining)
        // If we were unable to launch all threads neeeded but we have running threads ...
        if (
            attempted_single_thread
        &&  weaken_scripts.length > 0
        ) {
          // ... Wait for the batches to finish, release their RAM and then attempt to start the remaining threads.
          while(weaken_scripts.length > 0) {
            let script_info = weaken_scripts.shift()
            while(ns.isRunning(script_info[0])) {
              await ns.sleep(4)
            }
            await release_ram(ns, script_info[1], script_info[2])
          }
          threads_attempting = threads_remaining
          ram_needed = round_ram_cost(1.75 * threads_attempting)
          attempted_single_thread = false
        }

        let response = await request_ram(ns, ram_needed)
        if (response.result === "OK") {
          // And use the RAM in the new batch
          let weaken_pid = ns.exec("/scripts/util/weaken_v3.js", response.server, {threads: threads_attempting, temporary: true}, arg_flags.target, 0)
          if (!(weaken_pid === 0)) {
            threads_launched += threads_attempting
            threads_remaining -= threads_attempting
            weaken_scripts.push([weaken_pid, response.server, ram_needed])
          }
        }
        else {
          if (threads_attempting > 1) {
            threads_attempting = Math.floor(threads_attempting / 2)
          }
          else {
            attempted_single_thread = true
          }
          ram_needed = round_ram_cost(1.75 * threads_attempting)
        }
        await ns.sleep(4)
      }
      let all_released = false
      while(!all_released) {
        log(ns, arg_flags.target, "waiting for all to be released")
        if (weaken_scripts.length > 0) {
          // Weaken Scripts not finished releasing
          let script_info = weaken_scripts.shift()
          while(ns.isRunning(script_info[0])) {
            await ns.sleep(4)
          }
          await release_ram(ns, script_info[1], script_info[2])
        }
        else {
          all_released = true
        }
        await ns.sleep(4)
      }
    }
    else if (mock_server.moneyMax > mock_server.moneyAvailable) {
      log(ns, arg_flags.target, "moneyMax > moneyAvailable")
      // Prep grow executions
      let p = ns.getPlayer()
      let grow_threads = ns.formulas.hacking.growThreads(mock_server, p, mock_server.moneyMax, 1)
      let grow_time    = ns.formulas.hacking.growTime   (mock_server, p)
      let weaken_time  = ns.formulas.hacking.weakenTime (mock_server, p)
      let weaken_delay = 0
      let grow_delay = (weaken_time - grow_time) - 4

      let weaken_server
      let grow_server
      let weaken_ram = 0
      let grow_ram   = 0
      let weaken_threads
      
      let grow_scripts = []
      let threads_launched = 0
      let threads_remaining  = grow_threads
      let threads_attempting = grow_threads

      ns.atExit(function() {
        let pid_array = []
        for (let info of grow_scripts) {
          pid_array.push(info[0],info[3])
        }
        UPDATE_HANDLER.write(
          JSON.stringify({
            "action" : "death_react"
           ,"death_react": {
              "pids_to_kill" : pid_array
            }
          })
        )
        RAM_REQUEST_HANDLER.write(
          JSON.stringify({
            "action" : "death_react"
           ,"pid" : our_pid
          })
        )
      })

      let attempted_single_thread = false
      while (threads_remaining > 0) {
        log(ns, arg_flags.target, "threads remaining > 0: " + threads_remaining)
        weaken_server = undefined
        grow_server   = undefined
        while (
            (   (weaken_server === undefined)
            ||  (grow_server   === undefined))
        &&  !attempted_single_thread
        ) {
          weaken_server = undefined
          grow_server   = undefined
          weaken_threads = Math.ceil((0.004 * threads_attempting) / 0.05)
          weaken_ram = round_ram_cost(1.75 * weaken_threads)
          grow_ram = round_ram_cost(1.75 * threads_attempting)
  
          let total_response = await request_ram(ns, weaken_ram + grow_ram)
          if(total_response.result === "OK") {
            weaken_server = total_response.server
            grow_server   = total_response.server
          }
          else {
            let grow_response   = await request_ram(ns, grow_ram)
            let weaken_response = await request_ram(ns, weaken_ram)
            if (
                grow_response.result === "OK"
            &&  weaken_response.result === "OK"
            ) {
              weaken_server = weaken_response.server
              grow_server   = grow_response.server
            }
            else {
              if (grow_response.result === "OK") {
                await release_ram(ns, grow_response.server, grow_response.amount)
              }
              if (weaken_response.result === "OK") {
                await release_ram(ns, weaken_response.server, weaken_response.amount)
              }
              if (threads_attempting > 1) {
                threads_attempting = Math.floor(threads_attempting / 2)
              }
              else{
                attempted_single_thread = true
              }
            }
          }
          await ns.sleep(4)
        }

        // We could not find RAM for a single grow thread (+ weaken) and there are scripts already running.
        if (
            attempted_single_thread
        &&  grow_scripts.length > 0
        ) {
          // Await the running batchs finishing and Release their RAM
          while (grow_scripts.length > 0) {
            let script_info = grow_scripts.shift()
            while(ns.isRunning(script_info[0])) {
              await ns.sleep(4)
            }
            // Release Weaken Scripts RAM
            await release_ram(ns, script_info[1], script_info[2])
            // Release Grow Scripts RAM
            await release_ram(ns, script_info[4], script_info[5])
          }
          threads_attempting = threads_remaining
          attempted_single_thread = false
        }
  
        if (
            threads_attempting > 0 
        &&  !(weaken_server === undefined)
        &&  !(grow_server   === undefined)
        ) {
          let grow_pid   = ns.exec("/scripts/util/grow_v3.js"  , grow_server  , {threads: threads_attempting, temporary: true}, arg_flags.target, grow_delay)
          let weaken_pid = ns.exec("/scripts/util/weaken_v3.js", weaken_server, {threads: weaken_threads    , temporary: true}, arg_flags.target, weaken_delay)
          
          if (
              grow_pid   === 0
          ||  weaken_pid === 0
          ) {
            let pid_to_kill = []
            if (!(grow_pid   === 0)) pid_to_kill.push(grow_pid)
            if (!(weaken_pid === 0)) pid_to_kill.push(weaken_pid)
            if (pid_to_kill.length > 0) {
              while(
                !UPDATE_HANDLER.tryWrite(
                  JSON.stringify({
                    "action" : "death_react"
                   ,"death_react": {
                      "pids_to_kill" : pid_to_kill
                    }
                  })
                )
              ) {
                await ns.sleep(4)
              }
            }
            await release_ram(ns, grow_server, grow_ram)
            await release_ram(ns, weaken_server, weaken_ram)
          }
          else {
            ns.print("INFO Record Grow and Weaken scripts we launched")
            threads_launched += threads_attempting
            threads_remaining -= threads_attempting
            let batch_info = [
              weaken_pid,
              weaken_server,
              weaken_ram,
              grow_pid,
              grow_server,
              grow_ram
            ]
            grow_scripts.push(batch_info)
            grow_server = undefined
            weaken_server = undefined
          }
        }
        await ns.sleep(4)
      }
      // Await the running batchs finishing and Release their RAM
      while (grow_scripts.length > 0) {
        let script_info = grow_scripts.shift()
        while(ns.isRunning(script_info[0])) {
          await ns.sleep(4)
        }
        // Release Weaken Scripts RAM
        await release_ram(ns, script_info[1], script_info[2])
        // Release Grow Scripts RAM
        await release_ram(ns, script_info[4], script_info[5])
      }
    }
    else {
      log(ns, arg_flags.target, "start hack batching")
      started_hack_batching = true
    }
  }
}