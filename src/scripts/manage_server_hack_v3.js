import { PORT_IDS } from "/src/scripts/boot/manage_ports"
import { make_request, RAM_MESSAGES, RAMDeathPayload, RAMReleasePayload, RAMRequest, RAMRequestPayload } from "/src/scripts/util/ram_management"
import { round_ram_cost } from "/src/scripts/util/rounding"

class BatchPartInfo {
  threads;
  addMsec;

  constructor() {
    this.threads = 0
    this.addMsec = 0
  }
}

class BatchInfo {
  batch_cnt_to_saturate;
  batches_running;
  weaken_time;
  ram_needed;
  do_hacks;
  batch_hack;
  batch_weaken_hack;
  batch_grow;
  batch_weaken_grow;

  constructor() {
    this.batch_cnt_to_saturate = 0
    this.batches_running = 0
    this.weaken_time = 0
    this.ram_needed = 0
    this.do_hacks = false
    this.batch_hack = new BatchPartInfo()
    this.batch_weaken_hack = new BatchPartInfo()
    this.batch_grow = new BatchPartInfo()
    this.batch_weaken_grow = new BatchPartInfo()
  }
}

class ProcessInfo {
  target;
  pid;
  mock_server;
  batch_info;
  current_action;
  last_ui_update;
  max_server_name_length;

  /** @param {import("@ns").NS} ns  */
  constructor(ns, target, pid) {
    this.target      = target
    this.pid         = pid
    this.mock_server = ns.formulas.mockServer()
    this.batch_info  = new BatchInfo()
    this.current_action = ""
    this.last_ui_update = 0
    this.max_server_name_length = 0
  }
}

const X_SIZE = 650
const Y_SIZE = 245

/**
 * @param {import("@ns").NS} ns 
 * @param {string} target_server 
 * @param {import("@ns").NetscriptPort} control_params
 * @param {import("@ns").Server} mock_server
 * @returns {BatchInfo} A batch definition.
 */
function construct_batch(ns, target_server, control_params, mock_server) {
  let player_info = ns.getPlayer()

  // Check to see if we've hacked more money from the server than we expect
  let hack_threads = control_params.hacker.min_hack_threads_for_batch
  let hack_analyze = ns.formulas.hacking.hackPercent(mock_server, player_info)
  let money_gained = mock_server.moneyMax * (hack_analyze * hack_threads)

  let do_hacks = true
  if (mock_server.moneyAvailable < (mock_server.moneyMax - (money_gained*1.05))) {do_hacks = false}

  // Setup Server Object for use with Formulas API
  mock_server.hackDifficulty = mock_server.minDifficulty
  if (do_hacks) {mock_server.moneyAvailable = mock_server.moneyMax}

  let batch_info = {}

  //TODO: Account for Hacking Level going up due to previous batches completing 
  //REMINDER: Time to execute is determined at the time hack(), grow() or weaken() is *called*.
  //          The *EFFECT* of those calls is determined at the moment of finishing and is determined
  //          by the servers state at that moment, and the players stats at that moment.

  let hack_time   = ns.formulas.hacking.hackTime  (mock_server, player_info)
  let grow_time   = ns.formulas.hacking.growTime  (mock_server, player_info)
  let weaken_time = ns.formulas.hacking.weakenTime(mock_server, player_info)

  //hack_threads = control_params.hacker.min_hack_threads_for_batch
  hack_analyze = ns.formulas.hacking.hackPercent(mock_server, player_info)
    
  money_gained = mock_server.moneyMax * (hack_analyze * hack_threads)
  let grow_threads = ns.formulas.hacking.growThreads(mock_server, player_info, mock_server.moneyMax, 1)
  while (grow_threads < 1) {
    hack_threads += 1
    money_gained = mock_server.moneyMax * (hack_analyze * hack_threads)
    mock_server.moneyAvailable = mock_server.moneyMax - money_gained
    grow_threads = ns.formulas.hacking.growThreads(mock_server, player_info, mock_server.moneyMax, 1)
    if (grow_threads > 1) {
      hack_threads -= 1
      money_gained = mock_server.moneyMax * (hack_analyze * hack_threads)
      mock_server.moneyAvailable = mock_server.moneyMax - money_gained
      grow_threads = ns.formulas.hacking.growThreads(mock_server, player_info, mock_server.moneyMax, 1)
      break
    }
  }

  grow_threads = Math.ceil(grow_threads)
  let weaken_threads_for_growth = Math.ceil((0.004 * grow_threads) / 0.05)
  let weaken_threads_for_hack   = Math.ceil((0.002 * hack_threads) / 0.05)

  let delay = 4
  let weaken_hack_delay = 0
  let hack_delay = (weaken_time - hack_time) - delay
  let weaken_grow_delay = 2 * delay
  let grow_delay = (weaken_time - grow_time) + delay

  // Avoid Floating Point imprecission when multiplying. I mean really.
  let ram_needed = round_ram_cost(
    1.75 * (weaken_threads_for_hack + weaken_threads_for_growth + grow_threads) // Weaken RAM
  + 1.7  * hack_threads
  )

  // Need to max with (1) here as when the weaken time becomes smaller than the batch_time_interval we get (0)
  batch_info.batch_cnt_to_saturate = Math.max(Math.floor(weaken_time / control_params.hacker.hack_batch_time_interval),1)
  batch_info.weaken_time = weaken_time
  batch_info.ram_needed = ram_needed
  batch_info.do_hacks = do_hacks
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
 * 
 * @param {import("@ns").NS} ns 
 * @param {ProcessInfo} info 
 */
function update_TUI(ns, info, force_update) {
  if ((info.last_ui_update + 1000 > performance.now()) && !force_update) {
    return
  }
  info.last_ui_update = performance.now()
  let tail_properties = ns.self().tailProperties
  if (!(tail_properties === null)) {
    if (!(tail_properties.height === Y_SIZE) || !(tail_properties.width === X_SIZE)) {
      ns.ui.resizeTail(X_SIZE, Y_SIZE)
    }
  }

  ns.clearLog()
  ns.print(`╔${"╦".padStart(36,"═").padEnd(65, "═")}╗`)
  ns.print(`║ Target Server: ${info.target.padStart(info.max_server_name_length)} ║ Doing Hacks: ${info.batch_info.do_hacks.toString().padStart(14)} ║`)
  ns.print(`║ Ram Needed: ${ns.formatRam(info.batch_info.ram_needed.toFixed(0)).padStart(info.max_server_name_length + 3)} ║ Server: ${("$" + ns.formatNumber(info.mock_server.moneyAvailable,2,1e3)).padStart(8)} / ${("$" + ns.formatNumber(info.mock_server.moneyMax,2,1e3)).padStart(8)} ║`)
  ns.print(`║ Batches Needed: ${info.batch_info.batch_cnt_to_saturate.toFixed(0).padStart(info.max_server_name_length - 1)} ║ Batches Running: ${info.batch_info.batches_running.toFixed(0).padStart(10)} ║`)
  ns.print(`║ Batch Hack Threads: ${info.batch_info.batch_hack.threads.toFixed(0).padStart(info.max_server_name_length - 5)} ║ Weaken Hack Threads: ${info.batch_info.batch_weaken_hack.threads.toFixed(0).padStart(6)} ║`)
  ns.print(`║ Batch Grow Threads: ${info.batch_info.batch_grow.threads.toFixed(0).padStart(info.max_server_name_length - 5)} ║ Weaken Grow Threads: ${info.batch_info.batch_weaken_grow.threads.toFixed(0).padStart(6)} ║`)
  ns.print(`╠${"╩".padStart(36,"═").padEnd(65, "═")}╣`)
  ns.print(`║ Current Action: ${info.current_action.padEnd(47)} ║`)
  ns.print(`╚${"".padStart(65, "═")}╝`)
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const CONTROL_PARAMETERS    = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)
  const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(PORT_IDS.RAM_REQUEST_HANDLER)
  const our_pid   = ns.pid
  const arg_flags = ns.flags([
    ["target",""]
  ])
  ns.disableLog("ALL")
  //ns.enableLog("exec")

  ns.ui.setTailTitle("Manage Server Hacking V3.0 - PID: " + our_pid)

  if (arg_flags.target == "") {
    ns.tprint("No Target Server specified for manage_server.js")
    ns.exit()
  }
  let PROCESS_INFO = new ProcessInfo(ns, arg_flags.target, our_pid)
  PROCESS_INFO.current_action = "Awaiting Control Parameters"
  
  while(CONTROL_PARAMETERS.empty()){
    await ns.sleep(4)
  }

  PROCESS_INFO.current_action = "Prepping Future Cleanup"

  let control_params = JSON.parse(CONTROL_PARAMETERS.peek())
  let target_info = JSON.parse(SERVER_INFO_HANDLER.peek())[arg_flags.target]
  let batch_tracker = []
  let batches_needed = 0
  let ram_needed = 0

  let pre_exec = 0
  let post_exec = 0

  ns.atExit(function() {
    ns.tprint(`atExit handler for hack script (${our_pid})`)
    let pid_array = []
    for (let batch of batch_tracker) {
      pid_array.push(batch[0],batch[3][0],batch[3][1],batch[3][2])
    }
    ns.tprint(`atExit handler for hack script: Write UPDATE death react (${our_pid})`)
    UPDATE_HANDLER.write(
      JSON.stringify({
        "action" : "death_react"
       ,"death_react": {
          "pids_to_kill" : pid_array
        }
      })
    )
    ns.tprint(`atExit handler for hack script: Write RAM Request death react (${our_pid})`)
    let payload = new RAMDeathPayload(our_pid)
    let request = new RAMRequest(RAM_MESSAGES.RAM_DEATH, payload)
    RAM_REQUEST_HANDLER.write(JSON.stringify(request))
  })

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
  let prior_ui_update_time = performance.now()
  update_TUI(ns, PROCESS_INFO, true)

  while(true) {
    await ns.sleep(4)    
    // TODO: We will need to deal with the situation where we are hacking the server and we either get into a situation where we are no longer prepped between
    //       batch launches, *or* the Hacknet Servers are targeting the same server as we are and are actively increasing the Maximum Money our server can
    //       hold. Perhaps just throw in some extra hack and weaken threads?

    //ns.print("Updating Control Parameters")
    control_params = JSON.parse(CONTROL_PARAMETERS.peek())
    target_info = JSON.parse(SERVER_INFO_HANDLER.peek())[arg_flags.target]
    //ns.print("Begining analysis")
    mock_server.hackDifficulty       = ns.getServerSecurityLevel(arg_flags.target)
    mock_server.maxRam               = target_info.max_ram
    mock_server.minDifficulty        = target_info.min_diff
    mock_server.moneyAvailable       = ns.getServerMoneyAvailable(arg_flags.target)
    mock_server.moneyMax             = target_info.max_money
    mock_server.numOpenPortsRequired = target_info.num_ports_req
    mock_server.requiredHackingSkill = target_info.hack_lvl_req
    mock_server.serverGrowth         = target_info.growth
    
    PROCESS_INFO.mock_server = mock_server
    PROCESS_INFO.current_action = "Prepping Batch Information"
    PROCESS_INFO.max_server_name_length = control_params.servers.max_name_length
    update_TUI(ns, PROCESS_INFO, true)
    let batch_info = construct_batch(ns, arg_flags.target, control_params, mock_server)

    PROCESS_INFO.batch_info = batch_info
    PROCESS_INFO.batch_info.batches_running = batch_tracker.length

    //ns.print("Analyis complete; batch constructed.\n"+JSON.stringify(batch_info))

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
      PROCESS_INFO.current_action = "Waiting for batch with PID " + batch_pid_to_watch + " to finish"
      update_TUI(ns, PROCESS_INFO, true)
      while(ns.isRunning(batch_pid_to_watch)) {
        await ns.sleep(4)
      }
      // Final process of the batch is complete

      if (batch_tracker.length >= batches_needed) {
        // Release the Ram of the batch that just finished.
        PROCESS_INFO.current_action = "Releasing RAM due to more batches being queued than needed"
        update_TUI(ns, PROCESS_INFO, true)
        let payload = new RAMReleasePayload(ns.self().pid, batch_server, batch_ram_use)
        let request = new RAMRequest(RAM_MESSAGES.RAM_RELEASE, payload)
        let rel_resp = await make_request(ns, request)
        if (!(rel_resp.payload.result === "OK")) {ns.tprint(`ERROR: Failed to release RAM.`)}
        launch_batch = false
      }
      else if (batch_tracker.length < batches_needed) {
        // Launch a new batch with the server and RAM of the previous batch
        PROCESS_INFO.current_action = "Launching a new batch "
        if (batch_ram_use > ram_needed) {
          PROCESS_INFO.current_action += "using existing RAM but releasing a bit of it"
          update_TUI(ns, PROCESS_INFO, true)
          // Release the difference between the two rams
          let payload = new RAMReleasePayload(ns.self().pid, batch_server, round_ram_cost(batch_ram_use - ram_needed))
          let request = new RAMRequest(RAM_MESSAGES.RAM_RELEASE, payload)
          let rel_resp = await make_request(ns, request)
          if (!(rel_resp.payload.result === "OK")) {ns.tprint(`ERROR: Failed to release RAM.`)}
          // And use the remaining RAM in the new batch
          launch_batch = true
          server_to_use = batch_server
        }
        else if (batch_ram_use < ram_needed) {
          PROCESS_INFO.current_action += "releasing the old RAM and getting new RAM"
          update_TUI(ns, PROCESS_INFO, true)
          // Release the RAM from the previous batch
          let payload = new RAMReleasePayload(ns.self().pid, batch_server, batch_ram_use)
          let request = new RAMRequest(RAM_MESSAGES.RAM_RELEASE, payload)
          let rel_resp = await make_request(ns, request)
          if (!(rel_resp.payload.result === "OK")) {ns.tprint(`ERROR: Failed to release RAM.`)}
          // Request new RAM
          payload = new RAMRequestPayload(ns.self().pid, ns.self().filename, ram_needed)
          request = new RAMRequest(RAM_MESSAGES.RAM_REQUEST, payload)
          let req_resp = await make_request(ns, request)
          if (req_resp.payload.result === "OK") {
            // And use the RAM in the new batch
            launch_batch = true
            server_to_use = req_resp.payload.host
          }
          else {
            launch_batch = false
          }
        }
        else if (batch_ram_use = ram_needed)
        {
          PROCESS_INFO.current_action += "using the exact same RAM"
          update_TUI(ns, PROCESS_INFO, true)
          launch_batch = true
          server_to_use = batch_server
        }
      }
    }
    else if (batch_tracker.length < batches_needed) {
      PROCESS_INFO.current_action = "Launching new batch by getting new RAM"
      update_TUI(ns, PROCESS_INFO, true)
      // Request new RAM
      let payload = new RAMRequestPayload(ns.self().pid, ns.self().filename, ram_needed)
      let request = new RAMRequest(RAM_MESSAGES.RAM_REQUEST, payload)
      let ram_resp = await make_request(ns, request)
      // And use the RAM in the new batch
      if (ram_resp.payload.result === "OK") {
        launch_batch = true
        server_to_use = ram_resp.payload.host
      }
      else {
        launch_batch = false
        PROCESS_INFO.current_action = "Unable to get new RAM for new batch"
        update_TUI(ns, PROCESS_INFO, true)

        // Check if a batch that we launched earlier has died and we can launch another batch using its RAM
        if (batch_tracker.length > 0) {
          if (!ns.isRunning(parseInt(batch_tracker[0][0]))) {
            let batch_to_use = batch_tracker.shift()
            if (batch_to_use[2] = ram_needed) {
              // A prior batch has died and has RAM we can reuse
              launch_batch = true
              server_to_use = batch_to_use[1]
            }
            else {
              // A prior batch has died, but we can't reuse, so we release the RAM
              let payload = new RAMReleasePayload(ns.self().pid, batch_to_use[1], batch_to_use[2])
              let request = new RAMRequest(RAM_MESSAGES.RAM_RELEASE, payload)
              let rel_resp = await make_request(ns, request)
              if (!(rel_resp.payload.result === "OK")) {ns.tprint(`ERROR: Failed to release RAM.`)}
            }
          }
        }
      }
    }

    if (!(launch_batch === undefined)) {
      if (launch_batch) {
        pre_exec = performance.now()
        let await_time = (post_exec === undefined) ? control_params.hacker.hack_batch_time_interval : Math.max(control_params.hacker.hack_batch_time_interval - (pre_exec - post_exec), 10)
        PROCESS_INFO.current_action = "Awaiting " + ns.formatNumber(await_time,0) + " milliseconds"
        update_TUI(ns, PROCESS_INFO, true)
        await ns.sleep(await_time)
        //ns.print("Execution time of loop: " + (pre_exec - post_exec) + " / " + await_time + " / " + control_params.hacker.hack_batch_time_interval)
        let hack_pid = 0
        if (batch_info.do_hacks) {
          hack_pid          = ns.exec("/scripts/util/dynamic/hack_v3.js"  , server_to_use, {threads: batch_info.batch_hack.threads       ,temporary: true}, arg_flags.target, batch_info.batch_hack.addMsec)
        }
        let weaken_hack_pid = ns.exec("/scripts/util/dynamic/weaken_v3.js", server_to_use, {threads: batch_info.batch_weaken_hack.threads,temporary: true}, arg_flags.target, batch_info.batch_weaken_hack.addMsec)
        let grow_pid        = ns.exec("/scripts/util/dynamic/grow_v3.js"  , server_to_use, {threads: batch_info.batch_grow.threads       ,temporary: true}, arg_flags.target, batch_info.batch_grow.addMsec)
        let weaken_grow_pid = ns.exec("/scripts/util/dynamic/weaken_v3.js", server_to_use, {threads: batch_info.batch_weaken_grow.threads,temporary: true}, arg_flags.target, batch_info.batch_weaken_grow.addMsec)
        post_exec = performance.now()

        if ((
              hack_pid      === 0
          &&  batch_info.do_hacks)
        ||  weaken_hack_pid === 0
        ||  grow_pid        === 0
        ||  weaken_grow_pid === 0
        ) {
          let pid_to_kill = []
          if (!(hack_pid        === 0)) pid_to_kill.push(hack_pid)
          if (!(weaken_hack_pid === 0)) pid_to_kill.push(weaken_hack_pid)
          if (!(grow_pid        === 0)) pid_to_kill.push(grow_pid)
          if (!(weaken_grow_pid === 0)) pid_to_kill.push(weaken_grow_pid)
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
        }
        else {
          let new_batch = [
            weaken_grow_pid,
            server_to_use,
            ram_needed,
            [hack_pid, weaken_hack_pid, grow_pid]
          ]
          batch_tracker.push(new_batch)
        }
      }
    }
    if (performance.now() > (prior_ui_update_time + (1000/60))) {
      update_TUI(ns, PROCESS_INFO)
    }
  }
}