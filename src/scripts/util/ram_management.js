import { PORT_IDS } from "/src/scripts/util/constant_utilities"
import { round_ram_cost } from "/src/scripts/util/rounding"

/**
 * @param {import("@ns").NS} ns
 * @param {number} ram_amount
 */
export async function request_ram(ns, ram_amount, include_hacknet = false) {
  const RAM_REQUEST_HANDLER = ns.getPortHandle(PORT_IDS.RAM_REQUEST_HANDLER)
  const RAM_PROVIDE_HANDLER = ns.getPortHandle(PORT_IDS.RAM_PROVIDE_HANDLER)
  // const LOG_COLOUR = colourize(COLOUR.AZURE,9)
  // const DEF_COLOUR = colourize(COLOUR.DEFAULT)

  // Rounding away any floating point imprecision using Number.EPSILON
  let rounded_ram = round_ram_cost(ram_amount)
  //ns.print(LOG_COLOUR + "RAM: Rounded RAM from " + ram_amount + " to " + rounded_ram)
  // if (include_hacknet) {
  //   ns.print(LOG_COLOUR + "Include Hacknet: " + include_hacknet)
  // }

  let ram_request = {
    "action"         : "request_ram"
   ,"amount"         : rounded_ram
   ,"include_hacknet": include_hacknet
   ,"requester"      : ns.pid
   ,"requester_file" : ns.getScriptName()
  }

  //ns.print(LOG_COLOUR + "RAM: Awaiting space in RAM Request Handler to request RAM." + DEF_COLOUR)
  while(!RAM_REQUEST_HANDLER.tryWrite(JSON.stringify(ram_request))){
    await ns.sleep(4)
  }
  //ns.print(LOG_COLOUR + "RAM: Finished Awaiting RAM Request Handler." + DEF_COLOUR)

  let awaiting_response = true
  let ram_response = {}
  //ns.print(LOG_COLOUR + "RAM: Awaiting Response." + DEF_COLOUR)
  while (awaiting_response) {
    //ns.print(LOG_COLOUR + "RAM: Wait until Provider is not empty" + DEF_COLOUR)
    while(RAM_PROVIDE_HANDLER.empty()) {
      await RAM_PROVIDE_HANDLER.nextWrite()
    }
    
    ram_response = JSON.parse(RAM_PROVIDE_HANDLER.peek())
    //ns.print(LOG_COLOUR + "RAM: Provider is not empty: " + ram_response + DEF_COLOUR)
    if (parseInt(ram_response.requester) === ns.pid) {
      //ns.print(LOG_COLOUR + "RAM: This is a response for us." + DEF_COLOUR)
      awaiting_response = false
      RAM_PROVIDE_HANDLER.read()
    }
    else{
      //ns.print(LOG_COLOUR + "RAM: This is not a response for us." + DEF_COLOUR)
      await ns.sleep(4)
    }
  }
  //ns.print(LOG_COLOUR + "RAM: Finished Awaiting Response." + DEF_COLOUR)

  if (!(ram_response.result === "OK")) {
    //ns.print(LOG_COLOUR + "RAM: Request Failed." + DEF_COLOUR)
    return Promise.resolve({
      "result": ram_response.result,
      "reason": ram_response.failure_reason
    })
  }
  else {
    //ns.print(LOG_COLOUR + "RAM: Request Succeded." + DEF_COLOUR)
    return Promise.resolve({
      "result": ram_response.result,
      "server": ram_response.server,
      "amount": ram_response.amount
    })
  }
}
  
/**
 * @param {import("@ns").NS} ns
 * @param {string} server_to_release_from 
 * @param {number} ram_amount
 */
export async function release_ram(ns, server_to_release_from, ram_amount) {
  const RAM_REQUEST_HANDLER = ns.getPortHandle(PORT_IDS.RAM_REQUEST_HANDLER)
  const RAM_PROVIDE_HANDLER = ns.getPortHandle(PORT_IDS.RAM_PROVIDE_HANDLER)
  // const LOG_COLOUR = colourize(COLOUR.AZURE,9)
  // const DEF_COLOUR = colourize(COLOUR.DEFAULT)

  // Rounding away any floating point imprecision using Number.EPSILON
  let rounded_ram = round_ram_cost(ram_amount)
  //ns.print(LOG_COLOUR + "RAM: Rounded RAM from " + ram_amount + " to " + rounded_ram)

  let ram_request = {
    "action"   : "release_ram",
    "server"   : server_to_release_from,
    "amount"   : rounded_ram,
    "requester": ns.pid
  }

  //ns.print(LOG_COLOUR + "RAM: Awaiting space in RAM Request Handler to Release RAM.")
  while(!RAM_REQUEST_HANDLER.tryWrite(JSON.stringify(ram_request))){
    await ns.sleep(4)
  }
  //ns.print(LOG_COLOUR + "RAM: Finished Awaiting RAM Request Handler." + DEF_COLOUR)

  let awaiting_response = true
  let ram_response = {}
  //ns.print(LOG_COLOUR + "RAM: Awaiting Response." + DEF_COLOUR)
  while (awaiting_response) {
    //ns.print(LOG_COLOUR + "RAM: Wait until Provider is not empty" + DEF_COLOUR)
    while(RAM_PROVIDE_HANDLER.empty()) {
      await ns.sleep(4)
    }
    ram_response = JSON.parse(RAM_PROVIDE_HANDLER.peek())
    //ns.print(LOG_COLOUR + "RAM: Provider is not empty: " + ram_response + DEF_COLOUR)
    if (parseInt(ram_response.requester) === ns.pid) {
      //ns.print(LOG_COLOUR + "RAM: This is a response for us." + DEF_COLOUR)
      awaiting_response = false
      RAM_PROVIDE_HANDLER.read()
    }
    else {
      //ns.print(LOG_COLOUR + "RAM: This is not a response for us." + DEF_COLOUR)
      await ns.sleep(4)
    }
  }
  //ns.print(LOG_COLOUR + "RAM: Finished Awaiting Response." + DEF_COLOUR)

  if (!(ram_response.result === "OK")) {
    //ns.print(LOG_COLOUR + "RAM: Request Failed." + DEF_COLOUR)
    return Promise.resolve({
      "result": ram_response.result,
      "reason": ram_response.failure_reason
    })
  }
  else {
    //ns.print(LOG_COLOUR + "RAM: Request Succeded." + DEF_COLOUR)
    return Promise.resolve({
      "result": ram_response.result
    })
  }
}