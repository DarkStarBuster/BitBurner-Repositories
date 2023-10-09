
let ram_state = {}

/**
 * @param {NS} ns
 * @param {NetscriptPort} server_info_handler
 */
function initialise_ram_manager(ns, server_info_handler, control_parameters) {

  let server_info = JSON.parse(server_info_handler.peek())
  let control_param = JSON.parse(control_parameters.peek())

  for (let server in server_info) {
    ram_state[server] = {
      "max_ram"      : server_info[server].max_ram,
      "free_ram"     : server_info[server].max_ram,
      "ram_slices"   : {
        //  [<pid>] : {
        //    "slice_amount": <number>
        //  }
      } 
    }
  }

  //pid -1 is the terminal so we have ram to run out own scripts.
  if (ram_state["home"].free_ram < control_param.home.free_amt) {
    return "ERROR - Home RAM insufficient for control parameters requested reserved amount"
  }
  ram_state["home"].free_ram -= control_param.home.free_amt
  ram_state["home"].ram_slices[-1] = {
    "slice_amount": control_param.home.free_amt
  }

  return "OK"
}

/**
 * @param {NS} ns
 * @param {NetscriptPort} server_info_handler
 */
function update_max_ram_state(ns, server_info_handler) {

  let server_info = JSON.parse(server_info_handler.peek())
  let total_ram = 0

  for (let server in server_info) {
    ram_state[server].max_ram = server_info[server].max_ram
    total_ram += server_info[server].max_ram
  }

  ram_state.total_ram = total_ram
}

/**
 * @param {number} ram_amount
 * @param {number} ram_requester
 * @returns {string}
 */
function find_ram(ram_amount, ram_requester) {

  let found_existing = false
  let server_to_reserve_on
  for (let server in ram_state) {
    for (let pid in ram_state[server].ram_slices) {
      if (
          pid == ram_requester
      &&  ram_state[server].free_ram >= ram_amount
      ) {
        server_to_reserve_on = server
        found_existing = true
        break
      }
    }
  }

  if (server_to_reserve_on === undefined) {
    for (let server in ram_state) {
      if (ram_state[server].free_ram >= ram_amount) {
        server_to_reserve_on = server
        break
      }
    }
  }

  if (server_to_reserve_on === undefined) {
    return {
      "action"        : "request_ram",
      "result"        : "NOK",
      "failure_reason": "ERROR Failed to find server to allocate RAM from",
      "requester"     : ram_requester
    }
  }
  else {
    ram_state[server_to_reserve_on].free_ram -= ram_amount
    if (found_existing) {
      ram_state[server_to_reserve_on].ram_slices[ram_requester].slice_amount += ram_amount
    }
    else {
      ram_state[server_to_reserve_on].ram_slices[ram_requester] = {
        "slice_amount" : ram_amount
      }
    }
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
  if (ram_state[ram_server] === undefined) {
    return {
      "action"        : "release_ram",
      "result"        : "NOK",
      "failure_reason": "ERROR Server does not exist in the RAM State",
      "server"        : ram_server,
      "amount"        : ram_amount,
      "requester"     : ram_requester
    }
  }

  if (ram_state[ram_server].ram_slices[ram_requester] === undefined) {
    return {
      "action"        : "release_ram",
      "result"        : "NOK",
      "failure_reason": "ERROR Server does not have RAM allocated to this process",
      "server"        : ram_server,
      "amount"        : ram_amount,
      "requester"     : ram_requester
    }
  }

  if (ram_state[ram_server].ram_slices[ram_requester].slice_amount < ram_amount) {
    return {
      "action"        : "release_ram",
      "result"        : "NOK",
      "failure_reason": "ERROR Severs RAM allocated to this process is less than the amount to release",
      "server"        : ram_server,
      "amount"        : ram_amount,
      "requester"     : ram_requester
    }
  }

  ram_state[ram_server].ram_slice[ram_requester].slice_amount -= ram_amount
  if (ram_state[ram_server].ram_slices[ram_requester].slice_amount === 0) {
    delete ram_state[ram_server].ram_slices[ram_requester]
  }

  return {
    "action"   : "release_ram",
    "result"   : "OK",
    "requester": ram_requester
  }
}

/**
 * @param {NS} ns
 */
export async function main(ns) {
  const CONTROL_PARAMETERS    = ns.getPortHandle(1)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(3)
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(5)
  const RAM_PROVIDE_HANDLER   = ns.getPortHandle(6)

  ns.disableLog("ALL")

  let initialised = false

  while (true) {

    if (!initialised) {
      ns.print("Initializing...")
      let init_msg = initialise_ram_manager(ns, SERVER_INFO_HANDLER, CONTROL_PARAMETERS)
      RAM_PROVIDE_HANDLER.write(init_msg)
      initialised = true
      ns.print("Finished Initializing.")
    }

    if (RAM_REQUEST_HANDLER.empty()) {
      await RAM_REQUEST_HANDLER.nextWrite()
    }

    if (initialised) {
      ns.print("Updating Max RAM available...")
      update_max_ram_state(ns, SERVER_INFO_HANDLER)
      ns.print("Finished updating.")
    }

    // let ram_request = {
    //   "action"   : "request_ram" | "release_ram" | "enquire_total_ram"
    //   "server"   : <stirng>
    //   "amount"   : <number>
    //   "requester": <pid>
    // }

    let ram_request = JSON.parse(RAM_REQUEST_HANDLER.read())
    let response = {}
    switch (ram_request.action) {
      case "request_ram":
        response = find_ram(ram_request.amount, ram_request.requester)
        break
      case "release_ram":
        response = release_ram(ram_request.server, ram_request.amount, ram_request.requester)
        break
      case "enquire_total_ram":
        response = {
          "action"   : ram_request.action,
          "result"   : "OK",
          "requester": ram_request.requester,
          "amount"   : ram_state.total_ram
        }
        break
    }

    while(!RAM_PROVIDE_HANDLER.tryWrite(JSON.stringify(response))) {
      await ns.sleep(50)
    }

    await ns.sleep(50)
  }
}