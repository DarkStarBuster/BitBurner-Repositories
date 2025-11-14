import { PORT_IDS } from "/src/development/scripts/util/constant_utilities"

const RAM_STATE = {}
let RAM_STATE_ORDERED = []
const IGNORE_LIST = ["hacknet"]

/**
 * @param {import("@ns").NetscriptPort} server_info_handler
 * @param {import("@ns").NetscriptPort} control_parameters
 */
function initialise_ram_manager(server_info_handler, control_parameters) {

  let server_info   = JSON.parse(server_info_handler.peek())
  let control_param = JSON.parse(control_parameters.peek())

  for (let key of Object.keys(RAM_STATE)) {
    delete RAM_STATE[key]
  }
  RAM_STATE_ORDERED = []

  for (let server in server_info) {
    if (server_info[server].is_rooted) {
      RAM_STATE[server] = {
        "max_ram"      : server_info[server].max_ram,
        "free_ram"     : server_info[server].max_ram,
        "ram_slices"   : {
          //  [<pid>] : {
          //    "slice_amount": <number>
          //  }
        } 
      }
    }
  }

  //pid -1 is the terminal so we have ram to run scripts in the terminal.
  if (RAM_STATE["home"].free_ram < control_param.home.free_amt) {
    return "ERROR - Home RAM insufficient for control parameters requested reserved amount"
  }
  RAM_STATE["home"].free_ram -= control_param.home.free_amt
  RAM_STATE["home"].ram_slices[-1] = {
    "slice_amount": control_param.home.free_amt
  }

  // Negative Result means a before b
  // Zero Result means no change
  // Positive Result means b before a
  RAM_STATE_ORDERED = Object.keys(RAM_STATE).sort(
    function(a,b) {
      return RAM_STATE[b].max_ram - RAM_STATE[a].max_ram
    }
  )

  return "OK"
}

/**
 * @param {import("@ns").NetscriptPort} server_info_handler
 */
function update_max_ram_state(server_info_handler) {

  let server_info = JSON.parse(server_info_handler.peek())
  let total_ram = 0

  for (let server in server_info) {
    if (RAM_STATE[server]) {
      RAM_STATE[server].free_ram = (server_info[server].max_ram - RAM_STATE[server].max_ram) + RAM_STATE[server].free_ram
      RAM_STATE[server].max_ram = server_info[server].max_ram
    }
    else if (server_info[server].is_rooted){
      RAM_STATE[server] = {
        "max_ram"   : server_info[server].max_ram,
        "free_ram"  : server_info[server].max_ram,
        "ram_slices": {}
      }
    }
    total_ram += server_info[server].max_ram
  }

  RAM_STATE.total_ram = total_ram
}

/**
 * @param {number} ram_amount
 * @param {number} ram_requester
 * @returns {Object}
 */
async function find_ram(ram_amount, ram_requester, ram_requester_filename, include_hacknet = false) {

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
    for (let pid in RAM_STATE[server].ram_slices) {
      if (
          pid == ram_requester
      &&  RAM_STATE[server].free_ram >= ram_amount
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
      if (RAM_STATE[server].free_ram >= ram_amount) {
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
    RAM_STATE[server_to_reserve_on].free_ram -= ram_amount
    if (found_existing) {
      RAM_STATE[server_to_reserve_on].ram_slices[ram_requester].slice_amount += ram_amount
    }
    else {
      RAM_STATE[server_to_reserve_on].ram_slices[ram_requester] = {
        "slice_amount" : ram_amount,
        "pid_filename" : ram_requester_filename
      }
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

function release_ram(ram_server, ram_amount, ram_requester) {
  if (RAM_STATE[ram_server] === undefined) {
    //ns.tprint("ERROR Server (" + ram_server + ") does not exist in the RAM State")
    return {
      "action"        : "release_ram",
      "result"        : "NOK",
      "failure_reason": "ERROR Server does not exist in the RAM State",
      "server"        : ram_server,
      "amount"        : ram_amount,
      "requester"     : ram_requester
    }
  }

  if (RAM_STATE[ram_server].ram_slices[ram_requester] === undefined) {
    //ns.tprint("ERROR Server does not have RAM allocated to this process (" + ram_requester + ") ")
    return {
      "action"        : "release_ram",
      "result"        : "NOK",
      "failure_reason": "ERROR Server does not have RAM allocated to this process",
      "server"        : ram_server,
      "amount"        : ram_amount,
      "requester"     : ram_requester
    }
  }

  if (RAM_STATE[ram_server].ram_slices[ram_requester].slice_amount < ram_amount) {
    //ns.tprint("ERROR Servers RAM allocated to this process (" + ram_requester + ") is less (" + RAM_STATE[ram_server].ram_slices[ram_requester].slice_amount + ") than the amount to release (" + ram_amount + ")")
    return {
      "action"        : "release_ram",
      "result"        : "NOK",
      "failure_reason": "ERROR Severs RAM allocated to this process is less than the amount to release",
      "server"        : ram_server,
      "amount"        : ram_amount,
      "requester"     : ram_requester
    }
  }

  RAM_STATE[ram_server].free_ram += ram_amount
  RAM_STATE[ram_server].ram_slices[ram_requester].slice_amount -= ram_amount
  if (RAM_STATE[ram_server].ram_slices[ram_requester].slice_amount === 0) {
    delete RAM_STATE[ram_server].ram_slices[ram_requester]
  }

  //ns.print("Returning Release RAM Response")
  return {
    "action"   : "release_ram",
    "result"   : "OK",
    "requester": ram_requester
  }
}

function free_ram_request(server, amount, requester, requester_filename) {
  if (RAM_STATE[server] === undefined) {
    return {
      "action"        : "free_ram_request"
     ,"result"        : "NOK"
     ,"failure_reason": "ERROR Server \"" + server + "\" does not exist in the RAM State"
     ,"server"        : server
     ,"requester"     : requester
    }
  }

  RAM_STATE[server].free_ram -= amount
  RAM_STATE[server].ram_slices[requester] = {
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

function free_ram_release(server, requester) {
  if (RAM_STATE[server] === undefined) {
    return {
      "action"        : "free_ram_release"
     ,"result"        : "NOK"
     ,"failure_reason": "ERROR Server does not exist in the RAM State"
     ,"server"        : server
     ,"requester"     : requester
    }
  }

  if (RAM_STATE[server].ram_slices[requester] === undefined) {
    return {
      "action"        : "free_ram_release",
      "result"        : "NOK",
      "failure_reason": "ERROR Server does not have RAM allocated to this process",
      "server"        : server,
      "requester"     : requester
    }
  }

  RAM_STATE[server].free_ram += RAM_STATE[server].ram_slices[requester].slice_amount
  delete RAM_STATE[server].ram_slices[requester]

  return {
    "action"   : "free_ram_release"
   ,"result"   : "OK"
   ,"requester": requester
  }
}

function free_ram_enquire(server, requester) {
  if (RAM_STATE[server] === undefined) {
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
   ,"max"      : RAM_STATE[server].max_ram
   ,"free"     : RAM_STATE[server].free_ram
  }
}

function pid_on_server_enquire(server, requester) {
  if (RAM_STATE[server] === undefined) {
    return {
      "action"        : "pid_on_server_enquire"
     ,"result"        : "NOK"
     ,"failure_reason": "ERROR Server does not exist in the RAM State"
     ,"server"        : server
     ,"requester"     : requester
    }
  }

  if (RAM_STATE[server].ram_slices[requester] === undefined) {
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

function release_pids_ram(pid_to_release) {
  for (let server in RAM_STATE) {
    for (let pid in RAM_STATE[server].ram_slices) {
      //ns.print("PID: " + parseInt(pid) + " TYPE: " + typeof parseInt(pid) + " RELEASE: " + pid_to_release + " TYPE: " + typeof pid_to_release)
      if (parseInt(pid) === pid_to_release) {
        RAM_STATE[server].free_ram += RAM_STATE[server].ram_slices[pid].slice_amount
        delete RAM_STATE[server].ram_slices[pid]
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

  ns.disableLog("ALL")

  ns.ui.setTailTitle("Manage RAM V2.0 - PID: " + ns.pid)

  let initialised = false

  while (
      CONTROL_PARAMETERS.empty()
  ||  SERVER_INFO_HANDLER.empty()
  ) {
    await ns.sleep(4)
  }

  while (true) {

    if (!initialised) {
      //ns.print("Initializing...")
      let init_msg = initialise_ram_manager(SERVER_INFO_HANDLER, CONTROL_PARAMETERS)
      RAM_PROVIDE_HANDLER.write(init_msg)
      initialised = true
      //ns.print("Finished Initializing.")
    }

    if (RAM_REQUEST_HANDLER.empty()) {
      await RAM_REQUEST_HANDLER.nextWrite()
    }

    if (initialised) {
      //ns.print("Updating Max RAM available...")
      update_max_ram_state(SERVER_INFO_HANDLER)
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
    ns.print("Performing " + ram_request.action + " action.")
    let response = {}
    switch (ram_request.action) {
      case "request_ram":
        if (ram_request.include_hacknet) {
          response = await find_ram(ram_request.amount, ram_request.requester, ram_request.requester_file, ram_request.include_hacknet)
        }
        else {
          response = await find_ram(ram_request.amount, ram_request.requester, ram_request.requester_file)
        }
        break
      case "release_ram":
        response = release_ram(ram_request.server, ram_request.amount, ram_request.requester)
        break
      case "free_ram_request":
        response = free_ram_request(ram_request.server, ram_request.amount, ram_request.requester, ram_request.requester_file)
        break
      case "free_ram_release":
        response = free_ram_release(ram_request.server, ram_request.requester)
        break
      case "free_ram_enquire":
        response = free_ram_enquire(ram_request.server, ram_request.requester)
        break
      case "pid_on_server_enquire":
        response = pid_on_server_enquire(ram_request.server, ram_request.requester)
        break
      case "death_react":
        release_pids_ram(ram_request.pid)
        break
      case "enquire_total_ram":
        response = {
          "action"   : ram_request.action,
          "result"   : "OK",
          "requester": ram_request.requester,
          "amount"   : RAM_STATE.total_ram
        }
        break
      case "print_ram_state":
        response = {
          "action": ram_request.action,
          "result": "OK",
          "requester": ram_request.requester,
          "state" : RAM_STATE
        }
        break
      // //TODO: Consolidate a PIDs RAM onto as few servers as possible?
      // //   Maybe just as few low numbered P-Servers as possible? (To allow RAM Consumer processes to start)
      // case "request_consolidation":
      //   break
    }

    if (!(ram_request.action === "death_react")) {
      if (ns.isRunning(parseInt(response.requester))) {
        ns.print("Attempting to Write response to Handler.")
        while(!RAM_PROVIDE_HANDLER.tryWrite(JSON.stringify(response))) {
          await ns.sleep(4)
        }
        ns.print("Response written.")
      }
      else {
        ns.print("Requester killed while awaiting our response.")
      }
    }

    //await ns.sleep(4)
  }
}