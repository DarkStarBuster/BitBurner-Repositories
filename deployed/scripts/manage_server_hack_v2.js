/**
 * @param {NS} ns 
 * @param {string} target_server 
 * @param {NetscriptPort} control_params 
 * @returns A batch definition.
 */
async function construct_batch(ns, target_server, control_params) {
  let player_info = ns.getPlayer()
  let server_info = ns.getServer(target_server)
  // Setup Server Object for use with Formulas API
  server_info.hackDifficulty = server_info.minDifficulty
  server_info.moneyAvailable = server_info.moneyMax

  let batch_info = {}

  //TODO: Account for Hacking Level going up due to previous batches completing 
  //REMINDER: Time to execute is determined at the time hack(), grow() or weaken() is *called*.
  //          The *EFFECT* of those calls is determined at the moment of finishing and is determined
  //          by the servers state at that moment, and the players stats at that moment.

  let hack_time   = ns.formulas.hacking.hackTime  (server_info, player_info)
  let grow_time   = ns.formulas.hacking.growTime  (server_info, player_info)
  let weaken_time = ns.formulas.hacking.weakenTime(server_info, player_info)

  let hack_threads = control_params.hacker.min_hack_threads_for_batch
  let hack_analyze = ns.formulas.hacking.hackPercent(server_info, player_info)
    
  let money_gained = server_info.moneyMax * (hack_analyze * hack_threads)
  server_info.moneyAvailable = server_info.moneyMax - money_gained
  let grow_threads = ns.formulas.hacking.growThreads(server_info, player_info, server_info.moneyMax, 1)
  while (grow_threads < 1) {
    hack_threads += 1
    money_gained = server_info.moneyMax * (hack_analyze * hack_threads)
    server_info.moneyAvailable = server_info.moneyMax - money_gained
    grow_threads = ns.formulas.hacking.growThreads(server_info, player_info, server_info.moneyMax, 1)
    if (grow_threads > 1) {
      hack_threads -= 1
      money_gained = server_info.moneyMax * (hack_analyze * hack_threads)
      server_info.moneyAvailable = server_info.moneyMax - money_gained
      grow_threads = ns.formulas.hacking.growThreads(server_info, player_info, server_info.moneyMax, 1)
      break
    }
    await ns.sleep(10)
  }

  grow_threads = Math.ceil(grow_threads)
  let weaken_threads_for_growth = 0
  let weaken_threads_for_hack = 0
  let decrease_expected = 0
  
  let analysing = true
  while(analysing) {
    weaken_threads_for_growth += 1
    decrease_expected = ns.weakenAnalyze(weaken_threads_for_growth)
    if (decrease_expected >= (0.004 * grow_threads)) {
      analysing = false
    }
    await ns.sleep(10)
  }
  
  analysing = true
  while(analysing) {
    weaken_threads_for_hack += 1
    decrease_expected = ns.weakenAnalyze(weaken_threads_for_hack)
    if (decrease_expected >= (0.002 * hack_threads)) {
      analysing = false
    }
    await ns.sleep(10)
  }

  let weaken_hack_delay = 0
  let hack_delay = (weaken_time - hack_time) - 50
  let weaken_grow_delay = 100
  let grow_delay = (weaken_time - grow_time) + 50

  // Avoid Floating Point imprecission when multiplying. I mean really.
  let ram_needed = 0
  for (let i = 0; i < (weaken_threads_for_hack + weaken_threads_for_growth + grow_threads); i++) {
    ram_needed = ram_needed + 1.75
  }
  for (let i = 0; i < hack_threads; i++) {
    ram_needed = ram_needed + 1.7
  }
  // ram_needed = 
  //   1.75 * (weaken_threads_for_hack + weaken_threads_for_growth) // Weaken RAM
  // + 1.75 * grow_threads // Grow RAM
  // + 1.7  * hack_threads

  batch_info.batch_cnt_to_saturate = Math.floor(weaken_time / control_params.hacker.hack_batch_time_interval)
  batch_info.weaken_time = weaken_time
  batch_info.ram_needed = ram_needed
  batch_info.batch_hack = {}
  batch_info.batch_hack.threads = hack_threads
  batch_info.batch_hack.addMsec = hack_delay
  batch_info.batch_weaken_hack = {}
  batch_info.batch_weaken_hack.threads = weaken_threads_for_hack
  batch_info.batch_weaken_hack.addMsec = weaken_hack_delay
  batch_info.batch_grow = {}
  batch_info.batch_grow.threads = grow_threads
  batch_info.batch_grow.addMsec = grow_delay
  batch_info.batch_weaken_grow = {}
  batch_info.batch_weaken_grow.threads = weaken_threads_for_growth
  batch_info.batch_weaken_grow.addMsec = weaken_grow_delay

  return Promise.resolve(batch_info)
}

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

  ns.print("Awaiting space in RAM Request Handler to request new RAM.")
  while(!ram_request_handler.tryWrite(JSON.stringify(ram_request))){
    await ns.sleep(50)
  }
  ns.print("Finished Awaiting RAM Request Handler.")

  let awaiting_response = true
  let ram_response = {}
  ns.print("Awaiting Response.")
  while (awaiting_response) {
    ns.print("Wait until Provider is not empty")
    while(ram_provide_handler.empty()) {
      await ns.sleep(50)
    }
    ns.print("Provider is not empty: " + JSON.parse(ram_provide_handler.peek()))
    ram_response = JSON.parse(ram_provide_handler.peek())
    if (parseInt(ram_response.requester) === ns.pid) {
      ns.print("This is a response for us.")
      awaiting_response = false
      ram_provide_handler.read()
    }
    else{
      ns.print("This is not a response for us.")
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
async function release_ram(ns, target, server_to_release_from, ram_amount, ram_request_handler, ram_provide_handler) {
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
    ns.tprint("ERROR Target: " + target + ". RAM Manager didn't let us release " + ram_amount + " RAM from " + server_to_release_from)
  }

  return Promise.resolve()
}

/** @param {NS} ns */
export async function main(ns) {
  const our_pid   = ns.pid
  const arg_flags = ns.flags([
    ["target",""]
  ])
  ns.disableLog("ALL")
  ns.enableLog("exec")

  ns.setTitle("Manage Server Hacking V2.0 - Target: " + arg_flags.target + " - PID: " + our_pid)

  if (arg_flags.target == "") {
    ns.tprint("No Target Server specified for manage_server.js")
    ns.exit()
  }

  const CONTROL_PARAMETERS    = ns.getPortHandle(1)
  const UPDATE_HANDLER        = ns.getPortHandle(4)
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(5)
  const RAM_PROVIDE_HANDLER   = ns.getPortHandle(6)
  
  while(CONTROL_PARAMETERS.empty()){
    await ns.sleep(50)
  }

  let control_params = JSON.parse(CONTROL_PARAMETERS.peek())
  let batch_tracker = []
  let batches_needed = 0
  let ram_needed = 0

  let pre_exec = 0
  let post_exec = 0

  ns.atExit(function() {
    let pid_array = []
    for (let batch of batch_tracker) {
      pid_array.push(batch[0],batch[3][0],batch[3][1],batch[3][2])
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

  while(true) {

    ns.print("Updating Control Parameters")
    control_params = JSON.parse(CONTROL_PARAMETERS.peek())
    ns.print("Begining analysis")

    let batch_info = await construct_batch(ns, arg_flags.target, control_params)

    ns.print("Analyis complete; batch constructed.\n"+JSON.stringify(batch_info))

    if (
        !(batch_info.batch_cnt_to_saturate === batches_needed)
    ||  !(batch_info.ram_needed === ram_needed)
    ) {
      batches_needed = batch_info.batch_cnt_to_saturate
      ram_needed = batch_info.ram_needed
      //check_ram_usage(ns, batches_needed, ram_needed, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
    }

    let launch_batch
    let server_to_use
    // We have batches running that we need to wait to finish before we launch the next batch
    if (batch_tracker.length >= batches_needed) {
      // Get next batch to finish
      let next_batch = batch_tracker.shift()
      let batch_pid_to_watch = next_batch[0]
      let batch_server       = next_batch[1]
      let batch_ram_use      = next_batch[2]
      // Wait for the batch to finish
      ns.print("INFO Running more or exactly the number of Batches compared to Batches needed. Await Batch " + batch_pid_to_watch + " finishing.")
      while(ns.isRunning(batch_pid_to_watch)) {
        await ns.sleep(10)
      }
      // Final process of the batch is complete

      if (batch_tracker.length >= batches_needed) {
        // Release the Ram of the batch that just finished.
        ns.print("INFO Released RAM from a batch we no longer need. Awaiting RAM release.")
        await release_ram(ns, arg_flags.target, batch_server, batch_ram_use, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
        launch_batch = false
      }
      else if (batch_tracker.length < batches_needed) {
        // Launch a new batch with the server and RAM of the previous batch
        if (batch_ram_use > ram_needed) {
          // Release the difference between the two rams
          ns.print("INFO Released some RAM from a batch we had previously and used the rest for the next iteration. Awaiting RAM release")
          await release_ram(ns, arg_flags.target, batch_server, batch_ram_use - ram_needed, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
          // And use the remaining RAM in the new batch
          launch_batch = true
          server_to_use = batch_server
        }
        if (batch_ram_use < ram_needed) {
          // Release the RAM from the previous batch
          ns.print("INFO Awaiting the Release of RAM from previous batch as we need more for this one.")
          await release_ram(ns, arg_flags.target, batch_server, batch_ram_use, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
          // Request new RAM
          ns.print("INFO Awaiting Request for more RAM")
          let response = await request_ram(ns, ram_needed, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
          if (response.result === "OK") {
            // And use the RAM in the new batch
            launch_batch = true
            server_to_use = response.server
            ns.print("INFO Obtained RAM for a batch we had previously but needed more RAM for the next iteration.")
          }
          else {
            launch_batch = false
            ns.print("WARN Failed to obtain RAM for a batch we had previously but needed more RAM for the next iteration.")
          }
        }
        if (batch_ram_use = ram_needed)
        {
          launch_batch = true
          server_to_use = batch_server
          ns.print("INFO Reused the same RAM for a batch.")
        }
      }
    }
    else if (batch_tracker.length < batches_needed) {
      // Request new RAM
      ns.print("INFO Awaiting Request of RAM for new batch.")
      let response = await request_ram(ns, ram_needed, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
      // And use the RAM in the new batch
      if (response.result === "OK") {
        launch_batch = true
        server_to_use = response.server
        ns.print("INFO Requested RAM for a new batch successfully.")
      }
      else {
        launch_batch = false
        ns.print("WARN Failed to obtain RAM for a new batch. Batches Running: " + batch_tracker.length)

        // Check if a batch that we launched earlier has died and we can launch another batch using its RAM
        if (batch_tracker.length > 0) {
          ns.print("INFO Check for possible finished batches to reuse.")
          if (!ns.isRunning(parseInt(batch_tracker[0][0]))) {
            ns.print("INFO Batch " + batch_tracker[0][0] + " finished and can be checked for reuse.")
            let batch_to_use = batch_tracker.shift()
            if (batch_to_use[2] = ram_needed) {
              // A prior batch has died and has RAM we can reuse
              launch_batch = true
              server_to_use = batch_to_use[1]
              ns.print("INFO Reused RAM from an already finished batch instead.")
            }
            else {
              // A prior batch has died, but we can't reuse, so we release the RAM
              ns.print("INFO Awaiting Release of RAM from an already finished batch.")
              await release_ram(ns, arg_flags.target, batch_to_use[1], batch_to_use[2], RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
            }
          }
          else {
            ns.print("INFO Batch " + batch_tracker[0][0] + " has not finished yet.")
          }
        }
      }
    }

    if (!(launch_batch === undefined)) {
      if (launch_batch) {
        ns.print("Launching Scripts")
        let hack_args = [
          "--target" , arg_flags.target,
          "--addMsec", batch_info.batch_hack.addMsec,
          "--threads", batch_info.batch_hack.threads
        ]
        let weaken_hack_args = [
          "--target" , arg_flags.target,
          "--addMsec", batch_info.batch_weaken_hack.addMsec,
          "--threads", batch_info.batch_weaken_hack.threads
        ]
        let grow_args = [
          "--target" , arg_flags.target,
          "--addMsec", batch_info.batch_grow.addMsec,
          "--threads", batch_info.batch_grow.threads
        ]
        let weaken_grow_args = [
          "--target" , arg_flags.target,
          "--addMsec", batch_info.batch_weaken_grow.addMsec,
          "--threads", batch_info.batch_weaken_grow.threads
        ]
        pre_exec = Date.now()
        let await_time = (post_exec === undefined) ? control_params.hacker.hack_batch_time_interval : Math.max(control_params.hacker.hack_batch_time_interval - (pre_exec - post_exec), 100)
        await ns.sleep(await_time)
        ns.print("Execution time of loop: " + (pre_exec - post_exec) + " / " + await_time + " / " + control_params.hacker.hack_batch_time_interval)
        let hack_pid        = ns.exec("/scripts/util/hack_v2.js"  , server_to_use, batch_info.batch_hack.threads       , ...hack_args)
        let weaken_hack_pid = ns.exec("/scripts/util/weaken_v2.js", server_to_use, batch_info.batch_weaken_hack.threads, ...weaken_hack_args)
        let grow_pid        = ns.exec("/scripts/util/grow_v2.js"  , server_to_use, batch_info.batch_grow.threads       , ...grow_args)
        let weaken_grow_pid = ns.exec("/scripts/util/weaken_v2.js", server_to_use, batch_info.batch_weaken_grow.threads, ...weaken_grow_args)
        post_exec = Date.now()

        if (
            hack_pid        === 0
        ||  weaken_hack_pid === 0
        ||  grow_pid        === 0
        ||  weaken_grow_pid === 0
        ) {
          if (!(hack_pid        === 0)) ns.kill(hack_pid)
          if (!(weaken_hack_pid === 0)) ns.kill(weaken_hack_pid)
          if (!(grow_pid        === 0)) ns.kill(grow_pid)
          if (!(weaken_grow_pid === 0)) ns.kill(weaken_grow_pid)
          ns.print("Had to kill batch hack processes due to missing pid")
          ns.toast("Had to kill batch hack processes due to missing pid", "warning")
        }
        else {
          let new_batch = [
            weaken_grow_pid,
            server_to_use,
            ram_needed,
            [hack_pid, weaken_hack_pid, grow_pid]
          ]
          batch_tracker.push(new_batch)
          ns.print("Launched batch " + batch_tracker.length)
        }
      }
    }
    else {
      ns.toast("Weird situation in server hack manager targetting " + arg_flags.target)
    }
    await ns.sleep(10)
  }
}