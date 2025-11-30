import { COLOUR, colourize } from "/src/scripts/util/constant_utilities"
import { round_ram_cost } from "/src/scripts/util/rounding"
import { PORT_IDS } from "/src/scripts/boot/manage_ports"

const RAM_STATE = {}
let RAM_STATE_ORDERED = []
const IGNORE_LIST = ["hacknet"]

const X_SIZE = 1228

class SliceInfo {
  pid;
  pid_filename;
  slice_amount;

  /**
   * @param {number} pid 
   * @param {string} pid_filename
   * @param {number} slice_amount 
   */
  constructor(pid, pid_filename, slice_amount) {
    this.pid = pid
    this.pid_filename = pid_filename
    this.slice_amount = slice_amount
  }
}

class ServerRAMInfo {
  /** @type {number} */
  max_ram;
  /** @type {number} */
  free_ram;
  /** @type {Object<number, SliceInfo>} */
  ram_slices;

  constructor(max_ram) {
    this.max_ram = max_ram
    this.free_ram = max_ram
    this.ram_slices = {}
  }
}

class ProcessInfo {
  /** @type {number} */
  last_ui_update;
  /** @type {string} */
  last_action;
  /** @type {Object<string, ServerRAMInfo>} */
  ram_state;
  /** @type {number} */
  total_ram;
  /** @type {number} */
  max_server_name_length;
  /** */
  process_flags;

  /** @param {import("@ns").NS} ns */
  constructor(ns) {
    this.last_ui_update = performance.now()
    this.ram_state = {}
    this.total_ram = 0
    this.max_server_name_length = 0
    this.process_flags = ns.flags([
      ["parent_pid", undefined]
    ])
  }
}

/**
 * @param {import("@ns").NS} ns
 * @param {ProcessInfo} process_info
 * @param {boolean} force_update
 */
function update_TUI(ns, process_info, force_update = false) {
  if ((process_info.last_ui_update + 1000 > performance.now()) && !force_update) {
    return
  }
  process_info.last_ui_update = performance.now()

  ns.clearLog()

  const DIV_COLOUR = colourize(COLOUR.BLACK , 4)
  const RED_COLOUR = colourize(COLOUR.RED   , 9)
  const ORA_COLOUR = colourize(COLOUR.ORANGE, 9)
  const YEL_COLOUR = colourize(COLOUR.YELLOW, 9)
  const GRE_COLOUR = colourize(COLOUR.GREEN , 9)
  const DEF_COLOUR = colourize(COLOUR.DEFAULT)

  let table_strings = []
  let server_cnt = 0
  let row_length = 3
  let height = 1

  let prev_row = 0
  let row = 0
  for (let server of Object.keys(process_info.ram_state)) {
    row = Math.floor(server_cnt / row_length)
    if (row != prev_row) {
      table_strings[(row*height)+1] = undefined
      prev_row = row
    }
    if ((server_cnt % row_length) != 0) {
      table_strings[(row*height)+0] = table_strings[(row*height)+0].replace("╗","╦")
      table_strings[(row*height)+1] = table_strings[(row*height)+1].replace("╝","╩")
    }
    if (row == 0) {
      table_strings[(row*height)+0] = (table_strings[(row*height)+0] || DIV_COLOUR + "╔") + "".padEnd(41, "═") + "╗"
    }
    else {
      table_strings[((row-1)*height)+1] = table_strings[((row-1)*height)+1].replace("╚","╠").replace("╩","╬")
      if ((server_cnt + 1) % row_length == 0) {
        table_strings[((row-1)*height)+1] = table_strings[((row-1)*height)+1].replace("╝","╣")
      }
    }
    let percent = ((process_info.ram_state[server].max_ram - process_info.ram_state[server].free_ram) / process_info.ram_state[server].max_ram) * 100
    let ram_use_colour
    if (percent > 90) {
      ram_use_colour = RED_COLOUR
    }
    else if (percent > 75) {
      ram_use_colour = ORA_COLOUR
    }
    else if (percent > 60) {
      ram_use_colour = YEL_COLOUR
    }
    else {
      ram_use_colour = GRE_COLOUR
    }
    table_strings[(row*height)+1] = (table_strings[(row*height)+1] || DIV_COLOUR + "║") + `${DEF_COLOUR} ${server.padEnd(process_info.max_server_name_length)}: ${ram_use_colour}${ns.formatRam(process_info.ram_state[server].max_ram - process_info.ram_state[server].free_ram).padStart(8)} / ${ns.formatRam(process_info.ram_state[server].max_ram).padStart(8)} ${DIV_COLOUR}║`
    table_strings[(row*height)+2] = ((table_strings[(row*height)+2] || DIV_COLOUR + "╚") + "".padEnd(41, "═") + "╝").replace("╝═","╩═")
    server_cnt++
  }
  let num_add_end_brace = 3 - Math.round(((server_cnt / row_length)%1)/(1/3))
  if (num_add_end_brace < 3) { 
    for (let i = 1; i <= num_add_end_brace; i++) {
      table_strings[Math.floor(server_cnt / row_length)+1] = table_strings[Math.floor(server_cnt / row_length)+1] + "".padEnd(41, "═") + "╝"
      table_strings[Math.floor(server_cnt / row_length)+1] = table_strings[Math.floor(server_cnt / row_length)+1].replace("║═", DIV_COLOUR + "╠═")
    }
  }

  ns.print(`Last Action: ${process_info.last_action}`)
  for (let string of table_strings) {
    ns.print(string)
  }

  let rows = Math.floor((server_cnt-1) / row_length) + 1
  let y_size = 0
  let height_for_title_bar = 33
  let height_per_line = 24
  let height_per_row = 24 * 1
  y_size = height_for_title_bar + (height_per_row * rows) + (height_per_line * 3)
  // if (rows > 1) {
  //   y_size = y_size + (height_per_line * (rows - 1))
  // }

  let tail_properties = ns.self().tailProperties
  if (!(tail_properties === null)) {
    if (!(tail_properties.height === y_size) || !(tail_properties.width === X_SIZE)) {
      ns.ui.resizeTail(X_SIZE, y_size)
    }
  }
}

/**
 * @param {import("@ns").NS} ns
 * @param {import("@ns").NetscriptPort} server_info_handler
 * @param {import("@ns").NetscriptPort} control_parameters
 * @param {ProcessInfo} process_info
 */
async function initialise_ram_manager(ns, server_info_handler, control_parameters, process_info) {

  while(
        server_info_handler.empty()
    ||  control_parameters.empty()
  ) {
    await ns.sleep(4)
  }
  let server_info   = JSON.parse(server_info_handler.peek())
  let control_param = JSON.parse(control_parameters.peek())

  RAM_STATE_ORDERED = []

  process_info.max_server_name_length = control_param.servers.max_name_length
  for (let server in server_info) {
    if (server_info[server].is_rooted) {
      process_info.ram_state[server] = new ServerRAMInfo(server_info[server].max_ram)
    }
  }

  //pid -1 is the terminal so we have ram to run scripts in the terminal.
  if (process_info.ram_state["home"].free_ram < control_param.home.free_amt) {
    return Promise.resolve({
      action: "init"
     ,result: "NOK"
     ,requester: process_info.process_flags.parent_pid
     ,failure_reason: "ERROR - Home RAM insufficient for control parameters requested reserved amount"
    })
  }
  process_info.ram_state["home"].free_ram = round_ram_cost(process_info.ram_state["home"].free_ram - control_param.home.free_amt)
  process_info.ram_state["home"].ram_slices[-1] = new SliceInfo(-1, "terminal", control_param.home.free_amt)

  // Negative Result means a before b
  // Zero Result means no change
  // Positive Result means b before a
  RAM_STATE_ORDERED = Object.keys(process_info.ram_state).sort(
    function(a,b) {
      return process_info.ram_state[b].max_ram - process_info.ram_state[a].max_ram
    }
  )

  return Promise.resolve({
    action: "init"
   ,result: "OK"
   ,requester: process_info.process_flags.parent_pid
  })
}

/**
 * @param {import("@ns").NetscriptPort} server_info_handler
 * @param {ProcessInfo} process_info
 */
async function update_max_ram_state(ns, server_info_handler, process_info) {

  while (server_info_handler.empty()) {
    await ns.sleep(4)
  }
  let server_info = JSON.parse(server_info_handler.peek())
  let total_ram = 0

  for (let server in server_info) {
    if (process_info.ram_state[server]) {
      process_info.ram_state[server].free_ram = round_ram_cost((server_info[server].max_ram - process_info.ram_state[server].max_ram) + process_info.ram_state[server].free_ram)
      process_info.ram_state[server].max_ram = server_info[server].max_ram
    }
    else if (server_info[server].is_rooted){
      process_info.ram_state[server] = new ServerRAMInfo(server_info[server].max_ram)
    }
    total_ram = round_ram_cost(total_ram + server_info[server].max_ram)
  }

  process_info.total_ram = total_ram

  // Negative Result means a before b
  // Zero Result means no change
  // Positive Result means b before a
  RAM_STATE_ORDERED = Object.keys(process_info.ram_state).sort(
    function(a,b) {
      return process_info.ram_state[b].max_ram - process_info.ram_state[a].max_ram
    }
  )

  return Promise.resolve()
}

/**
 * @param {import("@ns").NS} ns
 * @param {number} ram_amount
 * @param {number} ram_requester
 * @param {string} ram_requester_filename
 * @param {ProcessInfo} process_info
 * @param {boolean} include_hacknet
 * @returns {Object}
 */
function find_ram(ns, ram_amount, ram_requester, ram_requester_filename, process_info, include_hacknet = false) {

  let found_existing = false
  let server_to_reserve_on

  let servers_to_ignore = []
  for (let string of IGNORE_LIST) {
    if (
        include_hacknet
    &&  string.includes("hacknet")
    ) {
      continue
    }
    servers_to_ignore.push(string)
  }
  // if (include_hacknet) {
  //   ns.print("Include Hacknet")
  //   ns.print("Servers to Ignore: " + servers_to_ignore)
  // }

  let avl_ram_servers = RAM_STATE_ORDERED.filter(
    function(server) {
      for (let i=0; i < servers_to_ignore.length; i++) {
        if (server.includes(servers_to_ignore[i])) {
          return false
        }
      }
      return true
    }
  )
  // if (include_hacknet) {
  //   ns.print("Servers to find RAM on: " + avl_ram_servers)
  // }

  for (let server of avl_ram_servers) {
    //ns.print("Checking server " + server + " for free RAM: " + ram_state[server].free_ram)
    for (let pid in process_info.ram_state[server].ram_slices) {
      if (
          pid == ram_requester
      &&  process_info.ram_state[server].free_ram >= ram_amount
      ) {
        // ns.print("Found existing RAM slice on " + server + " with enough free RAM to accomodate the additional request.")
        server_to_reserve_on = server
        found_existing = true
        break
      }
    }
  }

  if (server_to_reserve_on === undefined) {
    for (let server of avl_ram_servers) {
      //ns.print("Checking server " + server + " for free RAM: " + ram_state[server].free_ram)
      if (process_info.ram_state[server].free_ram >= ram_amount) {
        // ns.print("Found server " + server + " with enough free RAM to accomodate the request.")
        server_to_reserve_on = server
        break
      }
    }
  }

  if (server_to_reserve_on === undefined) {
    // ns.print("No server found with " + ram_amount + " RAM free.")
    return {
      "action"        : "request_ram",
      "result"        : "NOK",
      "failure_reason": "ERROR Failed to find server to allocate RAM from",
      "requester"     : ram_requester
    }
  }
  else {
    process_info.ram_state[server_to_reserve_on].free_ram = round_ram_cost(process_info.ram_state[server_to_reserve_on].free_ram - ram_amount)
    if (found_existing) {
      process_info.ram_state[server_to_reserve_on].ram_slices[ram_requester].slice_amount = round_ram_cost(process_info.ram_state[server_to_reserve_on].ram_slices[ram_requester].slice_amount + ram_amount)
    }
    else {
      process_info.ram_state[server_to_reserve_on].ram_slices[ram_requester] = new SliceInfo(ram_requester, ram_requester_filename, ram_amount)
    }
    // ns.print("Returning RAM Request Response from " + ram_requester)
    return {
      "action"   : "request_ram",
      "result"   : "OK",
      "requester": ram_requester,
      "server"   : server_to_reserve_on,
      "amount"   : ram_amount
    }
  }
}

/**
 * @param {import("@ns").NS} ns
 * @param {string} ram_server
 * @param {number} ram_amount
 * @param {number} ram_requester
 * @param {ProcessInfo} process_info
 * @returns {Object}
 */
function release_ram(ns, ram_server, ram_amount, ram_requester, process_info) {
  if (process_info.ram_state[ram_server] === undefined) {
    // ns.tprint("ERROR Server (" + ram_server + ") does not exist in the RAM State")
    return {
      "action"        : "release_ram",
      "result"        : "NOK",
      "failure_reason": "ERROR Server does not exist in the RAM State",
      "server"        : ram_server,
      "amount"        : ram_amount,
      "requester"     : ram_requester
    }
  }

  if (process_info.ram_state[ram_server].ram_slices[ram_requester] === undefined) {
    // ns.tprint("ERROR Server does not have RAM allocated to this process (" + ram_requester + ") ")
    return {
      "action"        : "release_ram",
      "result"        : "NOK",
      "failure_reason": "ERROR Server does not have RAM allocated to this process",
      "server"        : ram_server,
      "amount"        : ram_amount,
      "requester"     : ram_requester
    }
  }

  if (process_info.ram_state[ram_server].ram_slices[ram_requester].slice_amount < ram_amount) {
    // ns.tprint("ERROR Servers RAM allocated to this process (" + ram_requester + ") is less (" + RAM_STATE[ram_server].ram_slices[ram_requester].slice_amount + ") than the amount to release (" + ram_amount + ")")
    return {
      "action"        : "release_ram",
      "result"        : "NOK",
      "failure_reason": "ERROR Severs RAM allocated to this process is less than the amount to release",
      "server"        : ram_server,
      "amount"        : ram_amount,
      "requester"     : ram_requester
    }
  }

  process_info.ram_state[ram_server].free_ram = round_ram_cost(process_info.ram_state[ram_server].free_ram + ram_amount)
  process_info.ram_state[ram_server].ram_slices[ram_requester].slice_amount = round_ram_cost(process_info.ram_state[ram_server].ram_slices[ram_requester].slice_amount - ram_amount)
  if (process_info.ram_state[ram_server].ram_slices[ram_requester].slice_amount === 0) {
    delete process_info.ram_state[ram_server].ram_slices[ram_requester]
  }

  // ns.print("Returning Release RAM Response from " + ram_requester)
  return {
    "action"   : "release_ram",
    "result"   : "OK",
    "requester": ram_requester
  }
}

/**
 * @param {string} server 
 * @param {number} amount 
 * @param {number} requester 
 * @param {string} requester_filename 
 * @param {ProcessInfo} process_info 
 * @returns 
 */
function free_ram_request(server, amount, requester, requester_filename, process_info) {
  if (process_info.ram_state[server] === undefined) {
    return {
      "action"        : "free_ram_request"
     ,"result"        : "NOK"
     ,"failure_reason": "ERROR Server \"" + server + "\" does not exist in the RAM State"
     ,"server"        : server
     ,"requester"     : requester
    }
  }

  process_info.ram_state[server].free_ram = round_ram_cost(process_info.ram_state[server].free_ram - amount)
  process_info.ram_state[server].ram_slices[requester] = {
    "slice_amount" : amount
   ,"pid_filename" : requester_filename
  }

  return {
    "action"   : "free_ram_request"
   ,"result"   : "OK"
   ,"requester": requester
   ,"server"   : server
   ,"amount"   : amount
  }
}

/**
 * @param {string} server 
 * @param {number} requester 
 * @param {ProcessInfo} process_info
 * @returns 
 */
function free_ram_release(server, requester, process_info) {
  if (process_info.ram_state[server] === undefined) {
    return {
      "action"        : "free_ram_release"
     ,"result"        : "NOK"
     ,"failure_reason": "ERROR Server does not exist in the RAM State"
     ,"server"        : server
     ,"requester"     : requester
    }
  }

  if (process_info.ram_state[server].ram_slices[requester] === undefined) {
    return {
      "action"        : "free_ram_release",
      "result"        : "NOK",
      "failure_reason": "ERROR Server does not have RAM allocated to this process",
      "server"        : server,
      "requester"     : requester
    }
  }

  process_info.ram_state[server].free_ram = round_ram_cost(process_info.ram_state[server].free_ram + process_info.ram_state[server].ram_slices[requester].slice_amount)
  delete process_info.ram_state[server].ram_slices[requester]

  return {
    "action"   : "free_ram_release"
   ,"result"   : "OK"
   ,"requester": requester
  }
}

/**
 * @param {string} server 
 * @param {number} requester 
 * @param {ProcessInfo} process_info
 * @returns 
 */
function free_ram_enquire(server, requester, process_info) {
  if (process_info.ram_state[server] === undefined) {
    return {
      "action"        : "free_ram_enquire"
     ,"result"        : "NOK"
     ,"failure_reason": "ERROR Server does not exist in the RAM State"
     ,"server"        : server
     ,"requester"     : requester
    }
  }
  
  return {
    "action"   : "free_ram_enquire"
   ,"result"   : "OK"
   ,"requester": requester
   ,"max"      : process_info.ram_state[server].max_ram
   ,"free"     : process_info.ram_state[server].free_ram
  }
}

/**
 * @param {string} server 
 * @param {number} requester 
 * @param {ProcessInfo} process_info
 * @returns 
 */
function pid_on_server_enquire(server, requester, process_info) {
  if (process_info.ram_state[server] === undefined) {
    return {
      "action"        : "pid_on_server_enquire"
     ,"result"        : "NOK"
     ,"failure_reason": "ERROR Server does not exist in the RAM State"
     ,"server"        : server
     ,"requester"     : requester
    }
  }

  if (process_info.ram_state[server].ram_slices[requester] === undefined) {
    return {
      "action"   : "pid_on_server_enquire"
     ,"result"   : "OK"
     ,"server"   : server
     ,"requester": requester
     ,"present"  : false
    }
  }
  else {
    return {
      "action"   : "pid_on_server_enquire"
     ,"result"   : "OK"
     ,"server"   : server
     ,"requester": requester
     ,"present"  : true
    }
  }
}

/**
 * @param {number} pid_to_release 
 * @param {ProcessInfo} process_info 
 */
function release_pids_ram(pid_to_release, process_info) {
  for (let server in process_info.ram_state) {
    for (let pid in process_info.ram_state[server].ram_slices) {
      //ns.print("PID: " + parseInt(pid) + " TYPE: " + typeof parseInt(pid) + " RELEASE: " + pid_to_release + " TYPE: " + typeof pid_to_release)
      if (parseInt(pid) === pid_to_release) {
        process_info.ram_state[server].free_ram = round_ram_cost(process_info.ram_state[server].free_ram + process_info.ram_state[server].ram_slices[pid].slice_amount)
        delete process_info.ram_state[server].ram_slices[pid]
      }
    }
  }
}

/**
 * @param {import("@ns").NS} ns
 * @param {Object<string, ServerRAMInfo>} ram_state
 */
function audit_ram_state(ns, ram_state) {
  for (let server in ram_state) {
    for (let pid in ram_state[server].ram_slices) {
      if (pid === "-1") {
        continue
      } //exclude the terminal process ^^;
      if (!ns.isRunning(parseInt(pid))) {
        ns.tprint(`ERROR: RAM State contained dead process '${ram_state[server].ram_slices[pid].pid_filename}' (${ram_state[server].ram_slices[pid].pid}) ${ns.formatRam(ram_state[server].ram_slices[pid].slice_amount)}`)
        ram_state[server].free_ram = round_ram_cost(ram_state[server].free_ram + ram_state[server].ram_slices[pid].slice_amount)
        delete ram_state[server].ram_slices[pid]
      }
    }
  }
}

/**
 * @param {import("@ns").NS} ns
 */
export async function main(ns) {
  const CONTROL_PARAMETERS    = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(PORT_IDS.RAM_REQUEST_HANDLER)
  const RAM_PROVIDE_HANDLER   = ns.getPortHandle(PORT_IDS.RAM_PROVIDE_HANDLER)
  const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
  

  ns.disableLog("ALL")

  ns.ui.setTailTitle("Manage RAM V2.0 - PID: " + ns.pid)

  let initialised = false
  let process_info = new ProcessInfo(ns)

  // ns.atExit(function() {
  //   UPDATE_HANDLER.write(
  //     JSON.stringify({
  //       action : "request_action"
  //      ,request_action: {
  //         script_action : "reboot"
  //       }
  //     })
  //   )
  // })

  while (
        !RAM_PROVIDE_HANDLER.empty()
    ||  !RAM_REQUEST_HANDLER.empty()
  ) {
    RAM_PROVIDE_HANDLER.clear()
    RAM_REQUEST_HANDLER.clear()
  }

  while (
      CONTROL_PARAMETERS.empty()
  ||  SERVER_INFO_HANDLER.empty()
  ) {
    await ns.sleep(4)
  }

  while (true) {
    if (!CONTROL_PARAMETERS.empty()) {
      let control_param = JSON.parse(CONTROL_PARAMETERS.peek())
      process_info.max_server_name_length = control_param.servers.max_name_length
    }

    if (!initialised) {
      //ns.print("Initializing...")
      let init_msg = await initialise_ram_manager(ns, SERVER_INFO_HANDLER, CONTROL_PARAMETERS, process_info)
      RAM_PROVIDE_HANDLER.write(JSON.stringify(init_msg))
      initialised = true
      //ns.print("Finished Initializing.")
    }

    process_info.last_action = "Checking RAM Provider Port For Dead Processes"
    update_TUI(ns, process_info, true)
    if (!RAM_PROVIDE_HANDLER.empty()) {
      let checking = true
      while (checking) {
        //ns.tprint(RAM_PROVIDE_HANDLER.peek())
        let check = JSON.parse(RAM_PROVIDE_HANDLER.peek())
        if (!ns.isRunning(parseInt(check.requester))) {
          RAM_PROVIDE_HANDLER.read()
          if (RAM_PROVIDE_HANDLER.empty()) {
            checking = false
          }
        }
        else {
          checking = false
        }
      }
    }

    process_info.last_action = "Checking RAM State for Dead Processes"
    //TODO: Actually write this function
    audit_ram_state(ns, process_info.ram_state)

    process_info.last_action = "Reading RAM Request Port"
    update_TUI(ns, process_info, true)
    while (RAM_REQUEST_HANDLER.empty()) {
      update_TUI(ns, process_info)
      await ns.sleep(200)
    }

    if (initialised) {
      //ns.print("Updating Max RAM available...")
      process_info.last_action = "Updating Max RAM State"
      update_TUI(ns, process_info, true)
      await update_max_ram_state(ns, SERVER_INFO_HANDLER, process_info)
      update_TUI(ns, process_info, true)
      //ns.tprint(JSON.stringify(SERVER_INFO_HANDLER.peek()))
      //ns.print("Finished updating.")
    }

    // let ram_request = {
    //   "action"   : "request_ram" | "release_ram" | "enquire_total_ram"
    //   "server"   : <stirng>
    //   "amount"   : <number>
    //   "requester": <pid>
    // }

    let ram_request = JSON.parse(RAM_REQUEST_HANDLER.read())
    // ns.print("Performing " + ram_request.action + " action.")
    let response = {}
    switch (ram_request.action) {
      case "request_ram":
        process_info.last_action = "Processing RAM Request"
        update_TUI(ns, process_info, true)
        if (ram_request.include_hacknet) {
          response = find_ram(ns, ram_request.amount, ram_request.requester, ram_request.requester_file, process_info, ram_request.include_hacknet)
        }
        else {
          response = find_ram(ns, ram_request.amount, ram_request.requester, ram_request.requester_file, process_info)
        }
        break
      case "release_ram":
        process_info.last_action = "Processing RAM Release"
        update_TUI(ns, process_info, true)
        response = release_ram(ns, ram_request.server, ram_request.amount, ram_request.requester, process_info)
        break
      case "free_ram_request":
        process_info.last_action = "Processing Free RAM Request"
        update_TUI(ns, process_info, true)
        response = free_ram_request(ram_request.server, ram_request.amount, ram_request.requester, ram_request.requester_file, process_info)
        break
      case "free_ram_release":
        process_info.last_action = "Processing Free RAM Release"
        update_TUI(ns, process_info, true)
        response = free_ram_release(ram_request.server, ram_request.requester, process_info)
        break
      case "free_ram_enquire":
        process_info.last_action = "Processing Free RAM Enquirey"
        update_TUI(ns, process_info, true)
        response = free_ram_enquire(ram_request.server, ram_request.requester, process_info)
        break
      case "pid_on_server_enquire":
        process_info.last_action = "Processing PID on Server Enquirey"
        update_TUI(ns, process_info, true)
        response = pid_on_server_enquire(ram_request.server, ram_request.requester, process_info)
        break
      case "death_react":
        process_info.last_action = "Processing Death Reaction"
        update_TUI(ns, process_info, true)
        release_pids_ram(ram_request.pid, process_info)
        break
      case "enquire_total_ram":
        response = {
          "action"   : ram_request.action,
          "result"   : "OK",
          "requester": ram_request.requester,
          "amount"   : process_info.total_ram
        }
        break
      case "print_ram_state":
        response = {
          "action": ram_request.action,
          "result": "OK",
          "requester": ram_request.requester,
          "state" : process_info.ram_state
        }
        break
      // //TODO: Consolidate a PIDs RAM onto as few servers as possible?
      // //   Maybe just as few low numbered P-Servers as possible? (To allow RAM Consumer processes to start)
      // case "request_consolidation":
      //   break
    }

    process_info.last_action = "Writing Response To RAM Provider Port"
    update_TUI(ns, process_info, true)
    if (!(ram_request.action === "death_react")) {
      if (ns.isRunning(parseInt(response.requester))) {
        // ns.print("Attempting to Write response to Handler.")
        while(!RAM_PROVIDE_HANDLER.tryWrite(JSON.stringify(response))) {
          await ns.sleep(4)
        }
        // ns.print("Response written.")
      }
      else {
        // ns.print("Requester killed while awaiting our response.")
      }
    }

    //await ns.sleep(4)
  }
}