/**
 * @param {NS} ns
 * @param {number} ram_needed 
 * @param {NetscriptPort} ram_request_handler 
 * @param {NetscriptPort} ram_provide_handler 
 */
async function request_ram(ns, ram_needed, ram_request_handler, ram_provide_handler) {
  let ram_request = {
    "action"   : "request_ram",
    "amount"   : ram_needed,
    "requester": ns.pid
  }

  ns.print("Awaiting space in RAM Request Handler to Request new RAM.")
  while(!ram_request_handler.tryWrite(JSON.stringify(ram_request))){
    await ns.sleep(50)
  }
  ns.print("Finished Awaiting RAM Request Handler.")

  let awaiting_response = true
  let ram_response = {}
  ns.print("Awaiting Response.")
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
  ns.print("Finished Awaiting Response.")

  if (!(ram_response.result === "OK")) {
    return Promise.resolve({
      "result": ram_response.result,
      "reason": ram_response.failure_reason
    })
  }
  else {
    return Promise.resolve({
      "result": ram_response.result,
      "server": ram_response.server,
      "amount": ram_response.amount
    })
  }
}

/**
 * @param {NS} ns
 * @param {string} server_to_release_from 
 * @param {number} ram_amount 
 * @param {NetscriptPort} ram_request_handler 
 * @param {NetscriptPort} ram_provide_handler 
 */
async function release_ram(ns, server_to_release_from, ram_amount, ram_request_handler, ram_provide_handler) {
  let ram_request = {
    "action"   : "release_ram",
    "server"   : server_to_release_from,
    "amount"   : ram_amount,
    "requester": ns.pid
  }

  ns.print("Awaiting space in RAM Request Handler to Release old RAM.")
  while(!ram_request_handler.tryWrite(JSON.stringify(ram_request))){
    await ns.sleep(50)
  }
  ns.print("Finished Awaiting RAM Request Handler.")

  let awaiting_response = true
  let ram_response = {}
  ns.print("Awaiting Response.")
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
  ns.print("Finished Awaiting Response.")

  if (!(ram_response.result === "OK")) {
    ns.tprint("ERROR RAM Manager didn't let us release " + ram_amount + " RAM from " + server_to_release_from)
  }

  return Promise.resolve()
}

/** @param {NS} ns */
export async function main(ns) {
  const our_pid   = ns.pid
  const arg_flags = ns.flags([
    ["target",""]
  ])
  const SERVER_INFO_HANDLER = ns.getPortHandle(3)
  const UPDATE_HANDLER      = ns.getPortHandle(4)
  const RAM_REQUEST_HANDLER = ns.getPortHandle(5)
  const RAM_PROVIDE_HANDLER = ns.getPortHandle(6)

  ns.disableLog("ALL")
  ns.enableLog("exec")

  ns.setTitle("Manage Server Preparation V2.0 - Target: " + arg_flags.target + " - PID: " + our_pid)

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

    ns.print(
      "Curr Diff: " + ns.getServerSecurityLevel(target_server) + "\n"
    + "Min Diff : " + server_info[target_server].min_diff + "\n"
    + "Curr Mon : " + ns.getServerMoneyAvailable(target_server) + "\n"
    + "Max Mon  : " + server_info[target_server].max_money
    )
    if (
        ns.getServerSecurityLevel(target_server) > server_info[target_server].min_diff
    ) {
      ns.print("Preparing Weaken Threads")
      // Prep weaken executions
      let num_threads = 0
      let decrease_needed = ns.getServerSecurityLevel(target_server) - server_info[target_server].min_diff
      num_threads = Math.floor(decrease_needed / ns.weakenAnalyze(1))
      let decrease_expected = 0
      while(analysing) {
        decrease_expected = ns.weakenAnalyze(num_threads)
        if (decrease_expected >= decrease_needed) {
          analysing = false
        }
        num_threads += 1
      }
      
      let weaken_scripts = []
      let threads_launched = 0
      let threads_remaining  = num_threads
      let threads_attempting = num_threads
      let ram_needed = 0
      for (let i = 0; i < threads_attempting; i++) {
        ram_needed = ram_needed + 1.75
      }

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
        // If we were unable to launch all threads neeeded but we have running threads ...
        if (
            attempted_single_thread
        &&  weaken_scripts.length > 0
        ) {
          ns.print("INFO Attempted Single Threads with Scripts running...")
          // ... Wait for the batches to finish, release their RAM and then attempt to start the remaining threads.
          while(weaken_scripts.length > 0) {
            ns.print("INFO Await death of script.")
            let script_info = weaken_scripts.shift()
            while(ns.isRunning(script_info[0])) {
              await ns.sleep(10)
            }
            ns.print("INFO Awaiting release of RAM from dead script.")
            await release_ram(ns, script_info[1], script_info[2], RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
          }
          threads_attempting = threads_remaining
          ram_needed = 0
          for (let i = 0; i < threads_attempting; i++) {
            ram_needed = ram_needed + 1.75
          }
          attempted_single_thread = false
        }

        ns.print("INFO Awaiting Request of RAM for new weaken script")
        let response = await request_ram(ns, ram_needed, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
        if (response.result === "OK") {
          // And use the RAM in the new batch
          ns.print("INFO Obtained RAM for " + threads_attempting + " weaken threads, launching weaken script.")
          let weaken_args = [
            "--target" , arg_flags.target,
            "--threads", threads_attempting,
            "--addMsec", 0
          ]
          let weaken_pid = ns.exec("/scripts/util/weaken_v2.js", response.server, threads_attempting, ...weaken_args)
          if (!(weaken_pid === 0)) {
            threads_launched += threads_attempting
            threads_remaining -= threads_attempting
            let weaken_script = [
              weaken_pid,
              response.server,
              ram_needed
            ]
            weaken_scripts.push(weaken_script)
          }
        }
        else {
          ns.print("WARN Failed to obtain RAM for " + threads_attempting + " weaken threads, reducing number of threads requested.")
          if (threads_attempting > 1) {
            threads_attempting = Math.floor(threads_attempting / 2)
          }
          else {
            attempted_single_thread = true
          }
          ram_needed = 0
          for (let i = 0; i < threads_attempting; i++) {
            ram_needed = ram_needed + 1.75
          }
        }
        await ns.sleep(10)
      }
      let all_released = false
      ns.print("INFO Awaiting Release of all Weaken Scripts now we've executed all necessary threads.")
      while(!all_released) {
        if (weaken_scripts.length > 0) {
          // Weaken Scripts not finished releasing
          let script_info = weaken_scripts.shift()
          while(ns.isRunning(script_info[0])) {
            await ns.sleep(10)
          }
          ns.print("INFO Awaiting release of RAM from a now dead weaken script.")
          await release_ram(ns, script_info[1], script_info[2], RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
        }
        else {
          all_released = true
        }
        await ns.sleep(10)
      }
    }
    else if (
        server_info[target_server].max_money > ns.getServerMoneyAvailable(target_server)
    ) {
      ns.print("Preparing Grow Batchs")
      // Prep grow executions
      let multiplier_needed = server_info[target_server].max_money / ns.getServerMoneyAvailable(target_server)
      let grow_threads = Math.ceil(ns.growthAnalyze(arg_flags.target,multiplier_needed))
      
      let grow_time = ns.getGrowTime(arg_flags.target)
      let weaken_time = ns.getWeakenTime(arg_flags.target)
      let weaken_delay = 0
      let grow_delay = (weaken_time - grow_time) - 50

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
        weaken_server = undefined
        grow_server   = undefined
        while (
            (   (weaken_server === undefined)
            ||  (grow_server   === undefined))
        &&  !attempted_single_thread
        ) {
          weaken_server = undefined
          grow_server   = undefined
          weaken_threads = 0
          let decrease_expected
          let analysing = true
          while(analysing) {
            weaken_threads += 1
            decrease_expected = ns.weakenAnalyze(weaken_threads)
            if (decrease_expected >= (0.004 * threads_attempting)) {
              analysing = false
            }
          }
          ns.print("Checking for " + threads_attempting + " threads of grow, " + weaken_threads + " of weaken.")
  
          weaken_ram = 0 // Weaken RAM
          for (let i = 0; i < weaken_threads; i++) {
            weaken_ram = weaken_ram + 1.75
          }
          grow_ram = 0 // Grow RAM
          for (let i = 0; i < threads_attempting; i++) {
            grow_ram = grow_ram + 1.75
          }
  
          ns.print("INFO Asking for " + (weaken_ram + grow_ram) + " RAM.")
          let total_response = await request_ram(ns, weaken_ram + grow_ram, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
          if(total_response.result === "OK") {
            ns.print("INFO Received RAM on " + total_response.server + ".")
            weaken_server = total_response.server
            grow_server   = total_response.server
          }
          else {
            ns.print("INFO Awaiting RAM for grow scripts.")
            let grow_response   = await request_ram(ns, grow_ram  , RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
            ns.print("INFO Awaiting RAM for weaken scripts.")
            let weaken_response = await request_ram(ns, weaken_ram, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
            if (
                grow_response.result === "OK"
            &&  weaken_response.result === "OK"
            ) {
              ns.print("INFO Received RAM on " + weaken_response.server + " and " + grow_response.server + ".")
              weaken_server = weaken_response.server
              grow_server   = grow_response.server
            }
            else {
              ns.print("WARN Did not get any RAM.")
              ns.print("INFO Awaiting Release of grow script RAM.")
              if (grow_response.result === "OK") await release_ram(ns, grow_response.server, grow_response.amount, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
              ns.print("INFO Awaiting Release of weaken script RAM.")
              if (weaken_response.result === "OK") await release_ram(ns, weaken_response.server, weaken_response.amount, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
              if (threads_attempting > 1) {
                threads_attempting = Math.floor(threads_attempting / 2)
              }
              else{
                attempted_single_thread = true
              }
            }
          }
        }

        // We could not find RAM for a single grow thread (+ weaken) and there are scripts already running.
        if (
            attempted_single_thread
        &&  grow_scripts.length > 0
        ) {
          // Await the running batchs finishing and Release their RAM
          while (grow_scripts.length > 0) {
            ns.print("INFO Await death of script.")
            let script_info = grow_scripts.shift()
            while(ns.isRunning(script_info[0])) {
              await ns.sleep(10)
            }
            ns.print("INFO Awaiting release of RAM from dead script.")
            // Release Weaken Scripts RAM
            await release_ram(ns, script_info[1], script_info[2], RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
            // Release Grow Scripts RAM
            await release_ram(ns, script_info[4], script_info[5], RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
          }
          threads_attempting = threads_remaining
          attempted_single_thread = false
        }
  
        if (
            threads_attempting > 0 
        &&  !(weaken_server === undefined)
        &&  !(grow_server   === undefined)
        ) {
          ns.print("INFO We have RAM for both Grow and Weaken threads.")
          let grow_args = [
            "--target" , arg_flags.target,
            "--threads", threads_attempting,
            "--addMsec", grow_delay
          ]
          let weaken_args = [
            "--target" , arg_flags.target,
            "--threads", weaken_threads,
            "--addMsec", weaken_delay
          ]
          let grow_pid   = ns.exec("/scripts/util/grow_v2.js"  , grow_server  , threads_attempting, ...grow_args  )
          let weaken_pid = ns.exec("/scripts/util/weaken_v2.js", weaken_server, weaken_threads    , ...weaken_args)
  
          if (
              grow_pid   === 0
          ||  weaken_pid === 0
          ) {
            if (!(grow_pid   === 0)) ns.kill(grow_pid)
            if (!(weaken_pid === 0)) ns.kill(weaken_pid)
            ns.print("Had to kill batch grow processes due to missing pid for " + arg_flags.target)
            ns.toast("Had to kill batch grow processes due to missing pid for " + arg_flags.target, "warning")
            await release_ram(ns, grow_server  , grow_ram  , RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
            await release_ram(ns, weaken_server, weaken_ram, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
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
      }
      // Await the running batchs finishing and Release their RAM
      while (grow_scripts.length > 0) {
        ns.print("INFO Await death of script.")
        let script_info = grow_scripts.shift()
        while(ns.isRunning(script_info[0])) {
          await ns.sleep(10)
        }
        ns.print("INFO Awaiting release of RAM from dead script.")
        // Release Weaken Scripts RAM
        await release_ram(ns, script_info[1], script_info[2], RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
        // Release Grow Scripts RAM
        await release_ram(ns, script_info[4], script_info[5], RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
      }
    }
    else {
      ns.print("Ready for Hack Batching")
      started_hack_batching = true
    }
    await ns.sleep(10)
  }
}