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

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const arg_flags = ns.flags([
    ["target",""]
  ])
  const SERVER_INFO_HANDLER = ns.getPortHandle(3)
  const UPDATE_HANDLER = ns.getPortHandle(4)

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
  
  let server_info = JSON.parse(SERVER_INFO_HANDLER.peek())

  while(!started_hack_batching) {
    ns.print("Begining analysis")  
    server_info = JSON.parse(SERVER_INFO_HANDLER.peek())
    analysing = true

    if (
        ns.getServerSecurityLevel(target_server) > server_info[target_server].min_difficulty
    ) {
      ns.print("Preparing Weaken Threads")
      // Prep weaken executions
      let num_threads = 0
      let decrease_needed = ns.getServerSecurityLevel(target_server) - server_info[target_server].min_difficulty
      let decrease_expected = 0
      while(analysing) {
        num_threads += 1
        decrease_expected = ns.weakenAnalyze(num_threads)
        if (decrease_expected >= decrease_needed) {
          analysing = false
        }
      }
      let update = {
        "action": "request_action",
        "request_action": {
          "script_action": "weaken",
          "target": arg_flags.target,
          "threads": num_threads,
          "addMsec": 0
        }
      }
      while(!UPDATE_HANDLER.tryWrite(JSON.stringify(update))) {
        await ns.sleep(1000)
      }
    }
    else if (
        server_info[target_server].max_money > ns.getServerMoneyAvailable(target_server)
    ) {
      ns.print("Preparing Grow Batch")
      // Prep grow executions
      let total_num_threads = 0
      let num_threads = 0
      let multiplier_needed = server_info[target_server].max_money / ns.getServerMoneyAvailable(target_server)
      total_num_threads = Math.ceil(ns.growthAnalyze(arg_flags.target,multiplier_needed))
      
      let single_weaken = ns.weakenAnalyze(2)
      let grow_sec_inc = ns.growthAnalyzeSecurity(2, arg_flags.target)
      num_threads = Math.min(total_num_threads, Math.floor(single_weaken / grow_sec_inc) * 2)
      grow_sec_inc = ns.growthAnalyzeSecurity(num_threads, arg_flags.target)

      let grow_time = ns.getGrowTime(arg_flags.target)
      let weaken_time = ns.getWeakenTime(arg_flags.target)
      let weaken_grow_delay = 0
      let grow_delay = (weaken_time - grow_time) - 50

      let min_ram_needed = 
        1.75 * 2 // Weaken RAM
      + 1.75 * num_threads // Grow RAM

      let proceed_with_batch_grow = false
      for (let server in server_info) {
        if (
          server_info[server].free_ram >= min_ram_needed
        ) {
          proceed_with_batch_grow = true
          break
        }
      }

      if (proceed_with_batch_grow) {
        ns.print("Multiplier Needed: " + multiplier_needed + ", # Threads Needed: " + total_num_threads + ", # Threads/Batch: " + num_threads)
        let update_2 = {
          "action": "request_action",
          "request_action": {
            "script_action": "batch_grow",
            "target": arg_flags.target,
            "batches_needed": Math.ceil(total_num_threads / num_threads),
            "batch_grow": {
              "threads": num_threads,
              "addMsec": grow_delay,
              "sec_inc": grow_sec_inc
            },
            "weaken_grow": {
              "threads": 2,
              "addMsec": weaken_grow_delay
            }
          }
        }
        ns.print("Preparing request")
        ns.print(JSON.stringify(update_2))
        while(!UPDATE_HANDLER.tryWrite(JSON.stringify(update_2))) {
          await ns.sleep(1000)
        }
      }
      else {
        let grow_sec_inc = ns.growthAnalyzeSecurity(1, arg_flags.target)
        let update_2_alt = {
          "action": "request_action",
          "request_action": {
            "script_action": "grow",
            "target": arg_flags.target,
            "addMsec": 0,
            "threads": 1,
            "sec_inc": grow_sec_inc
          }
        }
        ns.print("Preparing request")
        ns.print(JSON.stringify(update_2_alt))
        while(!UPDATE_HANDLER.tryWrite(JSON.stringify(update_2_alt))) {
          await ns.sleep(1000)
        }
      }
    }
    else {
      ns.print("Ready for Hack Batching")
      started_hack_batching = true
    }

    ns.print("Give some time for threads to be executed")
    await ns.sleep(1000)

    // Check each second to see if all threads of "hack", "grow" and "weaken" targeting the target server have ended.
    let await_thread_end = true
    ns.print("Weaken Time: " + ns.getWeakenTime(arg_flags.target))
    let all_server_info = {}
    let sleep_delay = 1000
    while(await_thread_end){
      await_thread_end = false
      ns.print("Sleep for " + sleep_delay)
      await ns.sleep(sleep_delay)
      ns.print("Check if threads are still running")
      all_server_info = JSON.parse(SERVER_INFO_HANDLER.peek())
      for (let key in all_server_info) {
        //ns.print("Check server " + key)
        for (let action in all_server_info[key].actions) {
          //ns.print("Action " + action + " is " + all_server_info[key].actions[action].action + " on " + all_server_info[key].actions[action].target)
          if (
              all_server_info[key].actions[action].target == arg_flags.target
          &&  (     all_server_info[key].actions[action].action == "weaken"
                ||  all_server_info[key].actions[action].action == "grow"
              )
          ) {
            ns.print("Threads are still performing " + all_server_info[key].actions[action].action +  " against " + arg_flags.target + " on " + key)
            switch (all_server_info[key].actions[action].action) {
              case "weaken":
                sleep_delay = Math.floor(ns.getWeakenTime(arg_flags.target) / 10)
                break
              case "grow":
                sleep_delay = Math.floor(ns.getGrowTime(arg_flags.target) / 10)
                break
            }
            await_thread_end = true
            break
          }
        }
      }
    }
  }

  let update_message = {
    "action": "update_info",
    "update_info": {
      "server": "home",
      "freed_ram": 4.9 * arg_flags.threads,
      "pid_to_remove": ns.pid
    }
  }

  while(UPDATE_HANDLER.full()) {
    await ns.sleep(1000 + ((ns.pid * 10) % 1000))
  }
  while (!UPDATE_HANDLER.tryWrite(JSON.stringify(update_message))){
    await ns.sleep(1000 + ((ns.pid * 10) % 1000))
  }
}