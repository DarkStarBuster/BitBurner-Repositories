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

async function check_ram_usage(ns, batches_needed, ram_needed, ram_request_handler, ram_provide_handler) {
  let total_ram_needed = batches_needed * ram_needed

  let total_ram_found = 0
  for (let server in RAM_INFO) {
    total_ram_found += RAM_INFO[server].assigned_ram
  }

  if (total_ram_found < total_ram_needed) {
    // We need to request more RAM
    
    // Attempt 1: Be Greedy and see if we can get a single server with all the RAM we need
    let ram_request = {
      "action"   : "request_ram",
      "amount"   : total_ram_needed,
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
      // Being Greedy didn't work.
      // We will have to request each batchs RAM individually
      let ram_batch_request = {
        "action"   : "request_batch_ram",
        "amount"   : ram_needed,
        "batches"  : batches_needed,
        "requester": ns.pid
      }
    }
    else {
      // Being Greedy DID work.
      // We can release all other RAM we have and just use this one server for all our scripts.
      if (RAM_INFO[ram_response.server]) {
        // We alredy have RAM on the server we've been granted more on
      }
      else {
        // The Server is new to us
        RAM_INFO[ram_response.server] = {
          "assigned_ram": ram_response.amount,
          "free_ram"    : ram_response.amount,
          "processes"   : {}
        }
      }
    }

  }
  if (total_ram_found > total_ram_needed) {
    // We have more RAM than we need
  }
}

/**
 * @param {NS} ns 
 * @param {string} target_server 
 * @param {NetscriptPort} control_params 
 * @returns A batch definition.
 */
function construct_batch(ns, target_server, control_params) {
  let player_info = ns.getPlayer()
  let server_info = ns.getServer(target_server)
  // Setup Server Object for use with Formulas API
  server_info.hackDifficulty = server_info.minDifficulty
  server_info.moneyAvailable = server_info.moneyMax

  let batch_info = {}

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
  }
  
  analysing = true
  while(analysing) {
    weaken_threads_for_hack += 1
    decrease_expected = ns.weakenAnalyze(weaken_threads_for_hack)
    if (decrease_expected >= (0.002 * hack_threads)) {
      analysing = false
    }
  }

  let weaken_hack_delay = 0
  let hack_delay = (weaken_time - hack_time) - 50
  let weaken_grow_delay = 100
  let grow_delay = (weaken_time - grow_time) + 50

  
  let ram_needed = 
    1.75 * (weaken_threads_for_hack + weaken_threads_for_growth) // Weaken RAM
  + 1.75 * grow_threads // Grow RAM
  + 1.7  * hack_threads

  batch_info.batch_cnt_to_saturate = Math.floor(weaken_time / control_params.hacker.hack_batch_time_interval)
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

  return batch_info
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
    ns.tprint("ERROR RAM Manager didn't let us release " + ram_amount + " RAM from " + server_to_release_from)
  }

  return Promise.resolve()
}

/** @param {NS} ns */
export async function main(ns) {
  const arg_flags = ns.flags([
    ["target",""]
  ])
  ns.disableLog("sleep")

  if (arg_flags.target == "") {
    ns.tprint("No Target Server specified for manage_server.js")
    ns.exit()
  }

  const CONTROL_PARAMETERS    = ns.getPortHandle(1)
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(5)
  const RAM_PROVIDE_HANDLER   = ns.getPortHandle(6)
  
  while(CONTROL_PARAMETERS.empty()){
    await ns.sleep(50)
  }

  let control_params = JSON.parse(CONTROL_PARAMETERS.peek())
  let batch_tracker = []
  let batches_needed = 0
  let ram_needed = 0

  while(true) {
    let start = Date.now()

    ns.print("Updating Control Parameters")
    control_params = JSON.parse(CONTROL_PARAMETERS.peek())
    ns.print("Begining analysis")

    let batch_info = construct_batch(ns, arg_flags.target, control_params)

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
      while(ns.isRunning(batch_pid_to_watch)) {
        await ns.sleep(10)
      }
      // Final process of the batch is complete

      if (batch_tracker.length >= batches_needed) {
        // Release the Ram of the batch that just finished.
        await release_ram(batch_server, batch_ram_use, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
        launch_batch = false
        ns.print("INFO Released RAM from a batch we no longer need.")
      }
      else if (batch_tracker.length < batches_needed) {
        // Launch a new batch with the server and RAM of the previous batch
        if (batch_ram_use > ram_needed) {
          // Release the difference between the two rams
          await release_ram(batch_server, batch_ram_use - ram_needed, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
          // And use the remaining RAM in the new batch
          launch_batch = true
          server_to_use = batch_server
          ns.print("INFO Released some RAM from a batch we had previously and used the rest for the next iteration.")
        }
        if (batch_ram_use < ram_needed) {
          // Release the RAM from the previous batch
          await release_ram(batch_server, batch_ram_use, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
          // Request new RAM
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
      let response = await request_ram(ns, ram_needed, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
      // And use the RAM in the new batch
      if (response.result === "OK") {
        launch_batch = true
        server_to_use = response.server
        ns.print("INFO Requested RAM for a new batch successfully.")
      }
      else {
        launch_batch = false
        ns.print("WARN Failed to obtain RAM for a new batch.")
      }
    }

    if (!(launch_batch === undefined)) {
      if (launch_batch) {
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

        let hack_pid        = ns.exec("/scripts/util/hack_v2.js"  , server_to_use, batch_info.batch_hack.threads       , ...hack_args)
        let weaken_hack_pid = ns.exec("/scripts/util/weaken_v2.js", server_to_use, batch_info.batch_weaken_hack.threads, ...weaken_hack_args)
        let grow_pid        = ns.exec("/scripts/util/grow_v2.js"  , server_to_use, batch_info.batch_grow.threads       , ...grow_args)
        let weaken_grow_pid = ns.exec("/scripts/util/weaken_v2.js", server_to_use, batch_info.batch_weaken_grow.threads, ...weaken_grow_args)

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
            ram_needed
          ]
          batch_tracker.push(new_batch)
          ns.print("Launched batch " + batch_tracker.length)
        }
      }
    }
    else {
      ns.toast("Weird situation in server hack manager targetting " + arg_flags.target)
    }
    let end = Date.now()

    let await_time = Math.max(control_params.hacker.hack_batch_time_interval - (end - start), 100)
    ns.print("Execution time of loop: " + (end - start) + " /" + await_time + " / " + control_params.hacker.hack_batch_time_interval)
    await ns.sleep(await_time)
  }
}