
import { PORT_IDS } from "/src/scripts/boot/manage_ports"
import { round_ram_cost } from "/src/scripts/util/rounding"

export const RAM_MESSAGES = {
  RAM_RESPONSE: "ram_response",
  RAM_REQUEST:  "ram_request",
  RAM_RELEASE:  "ram_release",
  RAM_ENQUIRE:  "ram_enquire",
  RAM_DEMAND:   "ram_demand",
  RAM_DEATH:    "ram_death"
}

export class RAMResponsePayload {
  pid;
  action;
  result;
  reason;
  host;
  amount;
  
  /**
   * @param {number} pid
   * @param {string} action
   * @param {string} result 
   * @param {string} reason 
   * @param {string | string[]} host 
   * @param {number | number[]} amount 
   */
  constructor(pid, action, result, reason, host = "", amount = 0) {
    this.pid = pid
    this.action = action
    this.result = result
    this.reason = reason
    this.host = host
    this.amount = amount
  }
}

export class RAMResponse {
  /** @type {string} */
  action;
  /** @type {RAMResponsePayload} */
  payload;

  constructor(action = RAM_MESSAGES.RAM_RESPONSE, payload) {
    this.action  = action
    this.payload = payload
  }
}

export class RAMDeathPayload {
  /** @type {number} */
  pid;

  constructor(pid) {
    this.pid = pid
  }
}

export class RAMDemandPayload {
  /** @type {number} */
  pid;
  /** @type {string} */
  filename
  /** @type {string} */
  host;
  /** @type {number} */
  amount;

  constructor(pid, filename, host, amount) {
    this.pid      = pid
    this.filename = filename
    this.host     = host
    this.amount   = amount
  }
}

export class RAMEnquirePayload {
  /** @type {number} */
  pid;
  /** @type {string} */
  host;

  constructor(pid, host, amount) {
    this.pid    = pid
    this.host   = host
  }
}

export class RAMReleasePayload {
  /** @type {number} */
  pid;
  /** @type {string} */
  host;
  /** @type {number} */
  amount;

  constructor(pid, host, amount) {
    this.pid    = pid
    this.host   = host
    this.amount = amount
  }
}

export class RAMRequestPayload {
  /** @type {number} */
  pid;
  /** @type {string} */
  filename;
  /** @type {number} */
  amount;
  /** @type {boolean} */
  incl_hashnet

  constructor(pid, filename, amount, incl_hashnet = false) {
    this.pid          = pid
    this.filename     = filename
    this.amount       = amount
    this.incl_hashnet = incl_hashnet
  }
}

export class RAMRequest {
  /** @type {string} */
  action;
  /** @type {RAMRequestPayload | RAMReleasePayload | RAMEnquirePayload | RAMDemandPayload | RAMDeathPayload} */
  payload;

  /** @param {RAMRequestPayload | RAMReleasePayload | RAMEnquirePayload | RAMDemandPayload | RAMDeathPayload} payload*/
  constructor(action = RAM_MESSAGES.RAM_REQUEST, payload) {
    this.action  = action
    this.payload = payload
  }
}

/**
 * @param {import("@ns").NS} ns
 * @param {RAMRequest} request
 * @return {Promise<RAMResponse>}
 */
export async function make_request(ns, request) {
  const RAM_REQUEST_HANDLER = ns.getPortHandle(PORT_IDS.RAM_REQUEST_HANDLER)
  const RAM_PROVIDE_HANDLER = ns.getPortHandle(PORT_IDS.RAM_PROVIDE_HANDLER)

  while (!RAM_REQUEST_HANDLER.tryWrite(JSON.stringify(request))) {
    await ns.sleep(4)
  }

  let awaiting_response = true
  /** @type {RAMResponse} */
  let resp

  while (awaiting_response) {
    while(RAM_PROVIDE_HANDLER.empty()) {
      await ns.sleep(4)
    }
    
    resp = JSON.parse(RAM_PROVIDE_HANDLER.peek())
    if (parseInt(resp.payload.pid) === ns.pid) {
      awaiting_response = false
      RAM_PROVIDE_HANDLER.read()
    }
    else{
      await ns.sleep(4)
    }
  }

  return Promise.resolve(resp)
}


/**
 * @param {import("@ns").NS} ns
 * @param {number} ram_amount
 */
export async function request_ram(ns, ram_amount, include_hacknet = false) {
  ns.tprint(`WARN: Depreciated request_ram call used by ${ns.pid}, (${ns.self().filename})`)
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

  let payload = new RAMRequestPayload(ns.pid, ns.self().filename, rounded_ram, include_hacknet)
  let request = new RAMRequest(RAM_MESSAGES.RAM_REQUEST, payload)

  //ns.print(LOG_COLOUR + "RAM: Awaiting space in RAM Request Handler to request RAM." + DEF_COLOUR)
  while(!RAM_REQUEST_HANDLER.tryWrite(JSON.stringify(request))){
    await ns.sleep(4)
  }
  //ns.print(LOG_COLOUR + "RAM: Finished Awaiting RAM Request Handler." + DEF_COLOUR)

  let awaiting_response = true
  /** @type {RAMResponse} */
  let resp
  //ns.print(LOG_COLOUR + "RAM: Awaiting Response." + DEF_COLOUR)
  while (awaiting_response) {
    //ns.print(LOG_COLOUR + "RAM: Wait until Provider is not empty" + DEF_COLOUR)
    while(RAM_PROVIDE_HANDLER.empty()) {
      await ns.sleep(4)
    }
    
    resp = JSON.parse(RAM_PROVIDE_HANDLER.peek())
    //ns.print(LOG_COLOUR + "RAM: Provider is not empty: " + ram_response + DEF_COLOUR)
    if (parseInt(resp.payload.pid) === ns.pid) {
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

  if (!(resp.payload.result === "OK")) {
    //ns.print(LOG_COLOUR + "RAM: Request Failed." + DEF_COLOUR)
    return Promise.resolve({
      "result": resp.payload.result,
      "reason": resp.payload.reason
    })
  }
  else {
    //ns.print(LOG_COLOUR + "RAM: Request Succeded." + DEF_COLOUR)
    return Promise.resolve({
      "result": resp.payload.result,
      "server": resp.payload.host,
      "amount": resp.payload.amount
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

  let payload = new RAMReleasePayload(ns.pid, server_to_release_from, rounded_ram)
  let request = new RAMRequest(RAM_MESSAGES.RAM_RELEASE, payload)

  //ns.print(LOG_COLOUR + "RAM: Awaiting space in RAM Request Handler to Release RAM.")
  while(!RAM_REQUEST_HANDLER.tryWrite(JSON.stringify(request))){
    await ns.sleep(4)
  }
  //ns.print(LOG_COLOUR + "RAM: Finished Awaiting RAM Request Handler." + DEF_COLOUR)

  let awaiting_response = true
  /** @type {RAMResponse} */
  let resp
  //ns.print(LOG_COLOUR + "RAM: Awaiting Response." + DEF_COLOUR)
  while (awaiting_response) {
    //ns.print(LOG_COLOUR + "RAM: Wait until Provider is not empty" + DEF_COLOUR)
    while(RAM_PROVIDE_HANDLER.empty()) {
      await ns.sleep(4)
    }
    resp = JSON.parse(RAM_PROVIDE_HANDLER.peek())
    //ns.print(LOG_COLOUR + "RAM: Provider is not empty: " + ram_response + DEF_COLOUR)
    if (parseInt(resp.payload.pid) === ns.pid) {
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

  if (!(resp.payload.result === "OK")) {
    //ns.print(LOG_COLOUR + "RAM: Request Failed." + DEF_COLOUR)
    return Promise.resolve({
      "result": resp.payload.result,
      "reason": resp.payload.reason
    })
  }
  else {
    //ns.print(LOG_COLOUR + "RAM: Request Succeded." + DEF_COLOUR)
    return Promise.resolve({
      "result": resp.payload.result
    })
  }
}