import { scan_for_servers } from "/scripts/util/scan_for_servers"
import { PORT_IDS } from "/scripts/util/port_management"
import { COLOUR, colourize } from "/scripts/util/colours"

const LOG_COLOUR = colourize(COLOUR.CYAN,9)
const DEF_COLOUR = colourize(COLOUR.DEFAULT)

async function is_server_busy(ns, server, ram_request_handler, ram_provide_handler) {
  let request = {
    "action"   : "free_ram_enquire"
   ,"server"   : server
   ,"requester": ns.pid
  }

  ns.print(LOG_COLOUR + "RAM: Awaiting space in RAM Request Handler to enqueue our request." + DEF_COLOUR)
  while (!ram_request_handler.tryWrite(JSON.stringify(request))) {
    await ns.sleep(50)
  }
  ns.print(LOG_COLOUR + "RAM: Finished Awaiting RAM Request Handler." + DEF_COLOUR)

  let awaiting_response = true
  let response = {}
  ns.print(LOG_COLOUR + "RAM: Awaiting Response." + DEF_COLOUR)
  while (awaiting_response) {
    ns.print(LOG_COLOUR + "RAM: Wait until Provider is not empty" + DEF_COLOUR)
    while(ram_provide_handler.empty()) {
      await ns.sleep(50)
    }
    response = JSON.parse(ram_provide_handler.peek())
    ns.print(LOG_COLOUR + "RAM: Provider is not empty: " + response + DEF_COLOUR)
    if (parseInt(response.requester) === ns.pid) {
      ns.print(LOG_COLOUR + "RAM: This is a response for us." + DEF_COLOUR)
      awaiting_response = false
      ram_provide_handler.read()
    }
    else {
      ns.print(LOG_COLOUR + "RAM: This is not a response for us." + DEF_COLOUR)
      await ns.sleep(50)
    }
  }
  ns.print(LOG_COLOUR + "RAM: Finished Awaiting Response." + DEF_COLOUR)

  if (!(response.result === "OK")) {
    // Something went wrong with our request, log and return TRUE.
    ns.print("WARN Enquire Response for server " + server + " failed with reason: " + response.failure_reason)
    return Promise.resolve(true)
  }
  else {
    ns.print(LOG_COLOUR + "RAM: Response tells us Max RAM (" + response.max + ") == Free RAM (" + response.free + ")" + DEF_COLOUR)
    let is_busy = true
    if (
        server === "home"
    &&  response.free > (response.max * 0.1)
    ) {
      is_busy = false
    }
    else {
      is_busy = !(response.max == response.free)
    }
    ns.print(LOG_COLOUR + "RAM: So Server " + server + " is busy == " + is_busy)
    //if (server === "home") await ns.sleep(10000) 
    return Promise.resolve(is_busy)
  }
}

async function is_pid_on_server(ns, server, ram_request_handler, ram_provide_handler) {
  let request = {
    "action"   : "pid_on_server_enquire"
   ,"server"   : server
   ,"requester": ns.pid
  }

  ns.print(LOG_COLOUR + "RAM: Awaiting space in RAM Request Handler to enqueue our request." + DEF_COLOUR)
  while (!ram_request_handler.tryWrite(JSON.stringify(request))) {
    await ns.sleep(50)
  }
  ns.print(LOG_COLOUR + "RAM: Finished Awaiting RAM Request Handler." + DEF_COLOUR)

  let awaiting_response = true
  let response = {}
  ns.print(LOG_COLOUR + "RAM: Awaiting Response." + DEF_COLOUR)
  while (awaiting_response) {
    ns.print(LOG_COLOUR + "RAM: Wait until Provider is not empty" + DEF_COLOUR)
    while(ram_provide_handler.empty()) {
      await ns.sleep(50)
    }
    response = JSON.parse(ram_provide_handler.peek())
    ns.print(LOG_COLOUR + "RAM: Provider is not empty: " + response + DEF_COLOUR)
    if (parseInt(response.requester) === ns.pid) {
      ns.print(LOG_COLOUR + "RAM: This is a response for us." + DEF_COLOUR)
      awaiting_response = false
      ram_provide_handler.read()
    }
    else {
      ns.print(LOG_COLOUR + "RAM: This is not a response for us." + DEF_COLOUR)
      await ns.sleep(50)
    }
  }
  ns.print(LOG_COLOUR + "RAM: Finished Awaiting Response." + DEF_COLOUR)

  if (!(response.result === "OK")) {
    // Something went wrong with our request, log and return TRUE.
    ns.print("WARN PID on Server Response for server " + server + " failed with reason: " + response.failure_reason)
    return Promise.resolve(true)
  }
  else {
    ns.print(LOG_COLOUR + "RAM: Response tells us that we are " + (response.presnent ? "" : "not ") + "present on " + server + DEF_COLOUR)
    return Promise.resolve(response.present)
  }
}

async function request_ram(ns, server, ram, ram_request_handler, ram_provide_handler) {
  let request = {
    "action"   : "free_ram_request"
   ,"server"   : server
   ,"amount"   : ram
   ,"requester": ns.pid
  }

  ns.print(LOG_COLOUR + "RAM: Awaiting space in RAM Request Handler to enqueue our request." + DEF_COLOUR)
  while (!ram_request_handler.tryWrite(JSON.stringify(request))) {
    await ns.sleep(50)
  }
  ns.print(LOG_COLOUR + "RAM: Finished Awaiting RAM Request Handler." + DEF_COLOUR)

  let awaiting_response = true
  let response = {}
  ns.print(LOG_COLOUR + "RAM: Awaiting Response." + DEF_COLOUR)
  while (awaiting_response) {
    ns.print(LOG_COLOUR + "RAM: Wait until Provider is not empty" + DEF_COLOUR)
    while(ram_provide_handler.empty()) {
      await ns.sleep(50)
    }
    response = JSON.parse(ram_provide_handler.peek())
    ns.print(LOG_COLOUR + "RAM: Provider is not empty: " + response + DEF_COLOUR)
    if (parseInt(response.requester) === ns.pid) {
      ns.print(LOG_COLOUR + "RAM: This is a response for us." + DEF_COLOUR)
      awaiting_response = false
      ram_provide_handler.read()
    }
    else {
      ns.print(LOG_COLOUR + "RAM: This is not a response for us." + DEF_COLOUR)
      await ns.sleep(50)
    }
  }
  ns.print(LOG_COLOUR + "RAM: Finished Awaiting Response." + DEF_COLOUR)

  if (!(response.result === "OK")) {
    // Something went wrong with our request, log and return FALSE
    ns.print("WARN Request Response for server " + server + " failed with reason: " + response.failure_reason)
    return Promise.resolve(false)
  }
  else {
    ns.print(LOG_COLOUR + "RAM: Response has given us our RAM")
    return Promise.resolve(true)
  }
}

async function release_ram(ns, server, ram_request_handler, ram_provide_handler) {
  let request = {
    "action"   : "free_ram_release"
   ,"server"   : server
   ,"requester": ns.pid
  }

  ns.print(LOG_COLOUR + "RAM: Awaiting space in RAM Request Handler to enqueue our request." + DEF_COLOUR)
  while (!ram_request_handler.tryWrite(JSON.stringify(request))) {
    await ns.sleep(50)
  }
  ns.print(LOG_COLOUR + "RAM: Finished Awaiting RAM Request Handler." + DEF_COLOUR)

  let awaiting_response = true
  let response = {}
  ns.print(LOG_COLOUR + "RAM: Awaiting Response." + DEF_COLOUR)
  while (awaiting_response) {
    ns.print(LOG_COLOUR + "RAM: Wait until Provider is not empty" + DEF_COLOUR)
    while(ram_provide_handler.empty()) {
      await ns.sleep(50)
    }
    response = JSON.parse(ram_provide_handler.peek())
    ns.print(LOG_COLOUR + "RAM: Provider is not empty: " + response + DEF_COLOUR)
    if (parseInt(response.requester) === ns.pid) {
      ns.print(LOG_COLOUR + "RAM: This is a response for us." + DEF_COLOUR)
      awaiting_response = false
      ram_provide_handler.read()
    }
    else {
      ns.print(LOG_COLOUR + "RAM: This is not a response for us." + DEF_COLOUR)
      await ns.sleep(50)
    }
  }
  ns.print(LOG_COLOUR + "RAM: Finished Awaiting Response." + DEF_COLOUR)

  if (!(response.result === "OK")) {
    // Something went wrong with our request, log and return FALSE
    ns.print("WARN Release Response for server " + server + " failed with reason: " + response.failure_reason)
    return Promise.resolve(false)
  }
  else {
    ns.print(LOG_COLOUR + "RAM: Response has freed our RAM")
    return Promise.resolve(true)
  }
}

/**
 * 
 * @param {import("../../.").NS} ns 
 * @param {*} p_servers 
 * @param {*} server_to_run 
 * @param {*} server_to_check 
 * @param {*} script_to_run 
 * @param {*} ram_request_handler 
 * @param {*} ram_provide_handler 
 * @returns 
 */
async function consume_ram(ns, p_servers, server_to_run, server_to_check, script_to_run, ram_request_handler, ram_provide_handler) {
  // ns.print(
  //   "1: " + ns.getServerUsedRam(server_to_check) + "\n"
  // + "2: " + ns.getServerMaxRam(server_to_check) * 0.9 + "\n"
  // + "3: " + server_to_check
  // )

  if (p_servers[server_to_run].process_id === 0) {
    ns.print(LOG_COLOUR + "We are not running a Consume RAM process on \"" + server_to_run + "\".")
    let ram_check = await is_pid_on_server(ns, server_to_run, ram_request_handler, ram_provide_handler)
    if (ram_check) {
      ns.print(LOG_COLOUR + "But RAM Manager has a reserved slice for us on \"" + server_to_run + "\". So we will release that RAM.")
      await release_ram(ns, server_to_run, ram_request_handler, ram_provide_handler)
    }
  }

  ns.print(LOG_COLOUR + "Check if \"" + server_to_check + "\" is busy.")
  let server_busy = await is_server_busy(ns, server_to_check, ram_request_handler, ram_provide_handler)

  if (
      server_busy
  &&  (   p_servers[server_to_check].process_id === 0
      ||  server_to_run === "home")
  ) {
    ns.print(LOG_COLOUR + "Server \"" + server_to_check + "\" is classified as busy and is not listed as running a Consume RAM process.")
    if(!(p_servers[server_to_run].process_id === 0)) {
      ns.print(LOG_COLOUR + "Server \"" + server_to_run + "\" has a Consume RAM process running, so we will now kill it.")
      ns.kill(p_servers[server_to_run].process_id)
      p_servers[server_to_run].process_id = 0
      p_servers[server_to_run].threads = 0
      await release_ram(ns, server_to_run, ram_request_handler, ram_provide_handler)
    }
  }
  else {
    // server_to_check is not Busy
    ns.print(LOG_COLOUR + "Server \"" + server_to_check + "\" is not classified as busy.")
    let threads = Math.floor(p_servers[server_to_run].server_ram / ns.getScriptRam(script_to_run))
    if (server_to_run === "home") {
      threads = Math.floor(((ns.getServerMaxRam("home") - ns.getServerUsedRam("home")) * 0.7) / ns.getScriptRam(script_to_run))
    }
    // ns.print(
    //   "4: " + p_servers[server_to_run].process_id + "\n"
    // + "5: " + threads + "\n"
    // + "6: " + p_servers[server_to_run].threads
    // )
    if (
       p_servers[server_to_run].process_id === 0
    && threads > 0
    ) {
      ns.print("Option C1")
      let have_ram = await request_ram(ns, server_to_run, threads * ns.getScriptRam(script_to_run), ram_request_handler, ram_provide_handler)
      if (have_ram) {
        let process_id = ns.exec(script_to_run, server_to_run, threads, "--target", "foodnstuff", "--threads", threads)
        p_servers[server_to_run].process_id = process_id
        p_servers[server_to_run].threads = threads
      }
    }
    else if (threads > p_servers[server_to_run].threads) {
      ns.print("Option C2")
      ns.kill(p_servers[server_to_run].process_id)
      p_servers[server_to_run].process_id = 0
      p_servers[server_to_run].threads = 0
      await release_ram(ns, server_to_run, ram_request_handler, ram_provide_handler)
      let have_ram = await request_ram(ns, server_to_run, threads * ns.getScriptRam(script_to_run), ram_request_handler, ram_provide_handler)
      if (have_ram) {
        let process_id = ns.exec(script_to_run, server_to_run, threads, "--target", "foodnstuff", "--threads", threads)
        p_servers[server_to_run].process_id = process_id
        p_servers[server_to_run].threads = threads
      }
    }
  }
  return p_servers
}

/** @param {import("../../.").NS} ns */
export async function main(ns) {
  const CONTROL_PARAMETERS    = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(PORT_IDS.BITNODE_MULTS_HANDLER)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(PORT_IDS.SERVER_INFO_HANDLER)
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(PORT_IDS.RAM_REQUEST_HANDLER)
  const RAM_PROVIDE_HANDLER   = ns.getPortHandle(PORT_IDS.RAM_PROVIDE_HANDLER)

  ns.disableLog("ALL")
  ns.enableLog("exec")
  ns.enableLog("kill")

  ns.setTitle("Manage Free RAM V2.0 - PID: " + ns.pid)
  
  while (
      CONTROL_PARAMETERS.empty()
  ||  BITNODE_MULTS_HANDLER.empty()
  ||  SERVER_INFO_HANDLER.empty()
  ) {
    await ns.sleep(50)
  }

  let p_servers_array = []
  let p_servers = {}
  for (let server of ns.getPurchasedServers()){
    p_servers_array.push(server)
    p_servers[server] = {
      "server_ram": ns.getServerMaxRam(server),
      "process_id": 0,
      "threads": 0
    }
  }

  while(true) {
    let control_params = JSON.parse(CONTROL_PARAMETERS.peek())
    let server_info    = JSON.parse(SERVER_INFO_HANDLER.peek())
    let all_servers = scan_for_servers(ns,{"is_rooted":true,"has_ram":true,"include_pserv":true,"include_hacknet":false})
    //all_servers = ["home"]
    //ns.print(all_servers)
    for (let server of all_servers){
      ns.print("Check server " + server)
      if (!p_servers_array.includes(server)) {
        p_servers[server] = {
          "server_ram": ns.getServerMaxRam(server),
          "process_id": 0,
          "threads": 0
        }
        p_servers_array.push(server)
      }
      else {
        p_servers[server].server_ram = ns.getServerMaxRam(server)
      }

      let server_to_check
      let filename
      switch (server) {
        case "pserv-0":
          server_to_check = "home"
          filename = "/scripts/util/weaken_for_exp.js"
          break
        case "pserv-24":
          server_to_check = "pserv-23"
          filename = "/scripts/util/share.js"
          break
        default:
          if (server.includes("pserv")) {
            server_to_check = "pserv-" + (parseInt(server.split("-")[1]) - 1)
          }
          else {
            server_to_check = "home"
          }
          filename = "/scripts/util/weaken_for_exp.js"
          break
      }

      if (ns.hasRootAccess(server) && ns.hasRootAccess("foodnstuff")) await consume_ram(ns, p_servers, server, server_to_check, filename, RAM_REQUEST_HANDLER, RAM_PROVIDE_HANDLER)
    }

    await ns.sleep(1000)
  }

}