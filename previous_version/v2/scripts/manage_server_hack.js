/**
 * Port 4 will be a queue of actions for this script to write to.
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

const HACK_BATCH_LIMIT = 1000
const HACK_BATCH_TIME_LIMIT = 2000

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const arg_flags = ns.flags([
    ["target",""]
  ])
  const SERVER_INFO_HANDLER = ns.getPortHandle(3)
  const UPDATE_HANDLER = ns.getPortHandle(4)
  let hack_batches_needed = 0

  ns.disableLog("sleep")

  if (arg_flags.target == "") {
    ns.tprint("No Target Server specified for manage_server.js")
    ns.exit()
  }

  // Possibly at game start? Either wait to be killed, or listen for the write that follows the execution of this process.
  if (SERVER_INFO_HANDLER.empty()) {
    ns.print("Awaiting next Server Info Handler write")
    await SERVER_INFO_HANDLER.nextWrite()
  }

  let target_server = arg_flags.target
  let analysing = true
  let started_hack_batching = false

  hack_batches_needed = Math.floor(ns.getWeakenTime(target_server) / HACK_BATCH_TIME_LIMIT)

  // ns.tprint(
  //   "Server Manager [" + arg_flags.target
  // + "] Wants " + hack_batches_needed
  // + ". Due to: " + ns.getWeakenTime(arg_flags.target).toFixed(0)
  // + ". % Util: " + ns.formatPercent(HACK_BATCH_LIMIT / Math.max(hack_batches_needed,HACK_BATCH_LIMIT), 2)
  // )
  
  let server_info = JSON.parse(SERVER_INFO_HANDLER.peek())

  while(true) {
    ns.print("Begining analysis")
    server_info = JSON.parse(SERVER_INFO_HANDLER.peek())
    
    analysing = true

    if (hack_batches_needed != Math.floor(ns.getWeakenTime(target_server) / HACK_BATCH_TIME_LIMIT)) {
      hack_batches_needed = Math.floor(ns.getWeakenTime(target_server) / HACK_BATCH_TIME_LIMIT)
      // ns.tprint(
      //   "Server Manager [" + arg_flags.target
      // + "] now needs " + hack_batches_needed
      // + ". Due to: " + ns.getWeakenTime(arg_flags.target).toFixed(0)
      // + ". % Util: " + ns.formatPercent(HACK_BATCH_LIMIT / Math.max(hack_batches_needed,HACK_BATCH_LIMIT), 2)
      // )
    }

    
    ns.print("Preparing Hack Batch")

    let hack_time = ns.getHackTime(target_server)
    let grow_time = ns.getGrowTime(target_server)
    let weaken_time = ns.getWeakenTime(target_server)

    let hack_threads = 1
    let hack_analyze = ns.hackAnalyze(target_server)
    
    let money_gained = server_info[target_server].max_money * (hack_analyze * hack_threads)
    let multiplier_needed = server_info[target_server].max_money / (server_info[target_server].max_money - money_gained)
    let grow_threads = ns.growthAnalyze(target_server, multiplier_needed)
    ns.print("Threads needed to counteract a single hack thread: " + grow_threads)
    while (grow_threads < 1) {
      hack_threads += 1
      money_gained = server_info[target_server].max_money * (hack_analyze * hack_threads)
      multiplier_needed = server_info[target_server].max_money / (server_info[target_server].max_money - money_gained)
      grow_threads = ns.growthAnalyze(target_server, multiplier_needed)
      if (grow_threads > 1) {
        hack_threads -= 1
        money_gained = server_info[target_server].max_money * (hack_analyze * hack_threads)
        multiplier_needed = server_info[target_server].max_money / (server_info[target_server].max_money - money_gained)
        grow_threads = ns.growthAnalyze(target_server, multiplier_needed)
        break
      }
    }
    // if (hack_threads > 1) {
    //   ns.tprint("Threads needed to counteract a " + hack_threads + " hack thread(s): " + grow_threads)
    // }
    ns.print("Threads needed to counteract a " + hack_threads + " hack thread(s): " + grow_threads)


    grow_threads = Math.ceil(grow_threads)
    let grow_sec_inc = ns.growthAnalyzeSecurity(grow_threads)
    ns.print("Grow Sec Increase: " + grow_sec_inc)
    let weaken_threads_for_growth = 0
    let weaken_threads_for_hack = 0
    let decrease_expected = 0
    
    analysing = true
    while(analysing) {
      weaken_threads_for_growth += 1
      decrease_expected = ns.weakenAnalyze(weaken_threads_for_growth)
      if (decrease_expected >= grow_sec_inc) {
        analysing = false
      }
    }
    
    analysing = true
    while(analysing) {
      weaken_threads_for_hack += 1
      decrease_expected = ns.weakenAnalyze(weaken_threads_for_hack)
      if (decrease_expected >= (0.02 * hack_threads)) {
        analysing = false
      }
    }

    let weaken_hack_delay = 0
    let hack_delay = (weaken_time - hack_time) - 50
    let weaken_grow_delay = 100
    let grow_delay = (weaken_time - grow_time) + 50

    
    let min_ram_needed = 
      1.75 * (weaken_threads_for_hack + weaken_threads_for_growth) // Weaken RAM
    + 1.75 * grow_threads // Grow RAM
    + 1.7  * hack_threads

    let proceed_with_batch_hack = false
    for (let server in server_info) {
      if (
        server_info[server].free_ram >= min_ram_needed
      ) {
        proceed_with_batch_hack = true
        break
      }
    }
    let update_3
    if (proceed_with_batch_hack) {
      update_3 = {
        "action": "request_action",
        "request_action": {
          "script_action": "batch_hack",
          "target": target_server,
          "batch_hack": {
            "threads": hack_threads,
            "addMsec": hack_delay
          },
          "weaken_hack": {
            "threads": weaken_threads_for_hack,
            "addMsec": weaken_hack_delay 
          },
          "batch_grow": {
            "threads": grow_threads,
            "addMsec": grow_delay,
            "sec_inc": grow_sec_inc
          },
          "weaken_grow": {
            "threads": weaken_threads_for_growth,
            "addMsec": weaken_grow_delay
          }
        }
      }
      while(!UPDATE_HANDLER.tryWrite(JSON.stringify(update_3))){
        await ns.sleep(1000)
      }
    }
    else if (target_server == "n00dles") {
      ns.print("No server with " + ns.formatRam(min_ram_needed) + " RAM. Performing Basic Ass Hack that probably won't work for all servers.")
      update_3 = {
        "action": "request_action",
        "request_action": {
          "script_action": "batch_hack",
          "target": target_server,
          "batch_hack": {
            "threads": 1,
            "addMsec": hack_delay
          },
          "weaken_hack": {
            "threads": 1,
            "addMsec": weaken_hack_delay 
          },
          "batch_grow": {
            "threads": 1,
            "addMsec": grow_delay,
            "sec_inc": grow_sec_inc
          },
          "weaken_grow": {
            "threads": 1,
            "addMsec": weaken_grow_delay
          }
        }
      }
      while(!UPDATE_HANDLER.tryWrite(JSON.stringify(update_3))){
        await ns.sleep(1000)
      }
    }

    started_hack_batching = true

    // ns.print("Give some time for threads to be executed")
    // await ns.sleep(5000)

    // Check each second to see if all threads of "hack", "grow" and "weaken" targeting the target server have ended.
    let await_thread_end = true
    let num_hacks_found = 0
    let max_num_hacks = Math.min(Math.floor(ns.getWeakenTime(target_server) / HACK_BATCH_TIME_LIMIT), HACK_BATCH_LIMIT)
    ns.print("Weaken Time: " + ns.getWeakenTime(target_server))
    let all_server_info = ""
    let sleep_delay = 1000
    while(await_thread_end){
      num_hacks_found = 0
      await_thread_end = false
      ns.print("Sleep for " + sleep_delay)
      await ns.sleep(sleep_delay)
      ns.print("Check if threads are still running")
      all_server_info = JSON.parse(SERVER_INFO_HANDLER.peek())
      for (let key in all_server_info) {
        for (let action in all_server_info[key].actions) {
          if (
              all_server_info[key].actions[action].target == target_server
          &&  all_server_info[key].actions[action].action == "hack"
          ) {
            num_hacks_found += 1
            if (num_hacks_found >= max_num_hacks) {
              await_thread_end = true
              break
            }
            else {
            }
          }
        }
        if (await_thread_end) {
          ns.print(`Found (${num_hacks_found}) hack threads, awaiting thread end as >= (${max_num_hacks}) hack threads`)
          break
        }
        else {
          ns.print(`Less (${num_hacks_found}) than the max (${max_num_hacks}) number of concurrent hacks being performed, continue requesting hack batches`)
        }
      }
    }
  }
}