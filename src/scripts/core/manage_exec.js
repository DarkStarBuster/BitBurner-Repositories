import { PORT_IDS } from "/src/scripts/boot/manage_ports"
const DEBUG = false

const REQUEST_TYPES = {
  EXEC: "exec_request"
 ,KILL: "kill_request"
}

export class KillRequestPayload {
  /** @type {number} */
  requester;
  /** @type {number} */
  pid;

  /**
   * @param {number} requester 
   * @param {number} pid 
   */
  constructor(requester, pid) {
    this.requester = requester
    this.pid = pid
  }
}

export class ExecRequestPayload {
  /** @type {number} */
  requester;
  /** @type {string} */
  filename;
  /** @type {string} */
  host;
  /** @type {number | import("@ns").RunOptions | undefined} */
  threadOrOptions;
  /** @type {import("@ns").ScriptArg[]} */
  args;


  /**
   * @param {import("@ns").NS} ns 
   * @param {number} requester 
   * @param {string} filename 
   * @param {string} host 
   * @param {number | import("@ns").RunOptions | undefined} threadOrOptions 
   * @param {import("@ns").ScriptArg[]} args 
   */
  constructor(requester, filename, host, threadOrOptions, args) {
    this.requester        = requester
    this.filename         = filename
    this.host             = host
    this.threadOrOptions  = threadOrOptions
    this.args             = args
  }
}

export class Request {
  /** @type {string} */
  action;
  /** @type {ExecRequestPayload | KillRequestPayload} */
  payload;

  /**
   * 
   * @param {string} type One of REQUEST_TYPE
   * @param {ExecRequestPayload | KillRequestPayload} payload 
   */
  constructor(type, payload) {
    this.action   = type
    this.payload  = payload
  }
}

/**
 * 
 * @param {import("@ns").NS} ns 
 * @param {Request} request 
 */
async function do_request(ns, request) {
  const EXEC_REQUEST_HANDLER = ns.getPortHandle(PORT_IDS.EXEC_REQUEST_HANDLER)
  const EXEC_PROVIDE_HANDLER = ns.getPortHandle(PORT_IDS.EXEC_PROVIDE_HANDLER)
  
  if (DEBUG) {
    for (let name in request) {
      if (typeof request[name] == typeof {}) {
        for (let name2 in request[name]) {
          ns.tprint(`${name}.${name2}: ${request[name][name2]}`)
        }
      }
      else {
        ns.tprint(`${name}: ${request[name]}`)
      }
    }
  }

  if (DEBUG) {
    ns.tprint(`Sending Request`)
  }
  while (!EXEC_REQUEST_HANDLER.tryWrite(JSON.stringify(request))) {await ns.sleep(4)}
  
  let recieved_response = false
  let response
  if (DEBUG) {
    ns.tprint(`Awaiting`)
  }
  while (!recieved_response) {
    while (EXEC_PROVIDE_HANDLER.empty()) {
      await ns.sleep(4)
    }
    response = JSON.parse(EXEC_PROVIDE_HANDLER.peek())
    if (response.payload.requester == ns.pid) {
      if (DEBUG) {
        ns.tprint(`Handling Response`)
      }
      EXEC_PROVIDE_HANDLER.read()
      recieved_response = true
    }
    await ns.sleep(4)
  }
  
  if (DEBUG) {
    for (let name in response) {
      if (typeof response[name] == typeof {}) {
        for (let name2 in response[name]) {
          ns.tprint(`${name}.${name2}: ${response[name][name2]}`)
        }
      }
      else {
        ns.tprint(`${name}: ${response[name]}`)
      }
    }
  }

  if (DEBUG) {
    ns.tprint(`Returning Response`)
  }

  return Promise.resolve(response)
}

/**
 * @param {import("@ns").NS} ns 
 * @param {KillRequestPayload} payload 
 * @returns {Promise<boolean>} True if the pid was killed, false otherwise
 */
export async function request_kill(ns, payload = new KillRequestPayload()) {
  if (DEBUG) {
    ns.tprint(`Building Kill Request`)
  }
  let request = new Request(REQUEST_TYPES.KILL, payload)

  let response = await do_request(ns, request)

  return Promise.resolve(response.payload.pid_killed)
}

/**
 * @param {import("@ns").NS} ns 
 * @param {ExecRequestPayload} payload 
 * @returns {Promise<number>} The pid of the new process if successful, 0 otherwise
 */
export async function request_exec(ns, payload = new ExecRequestPayload()) {

  if (DEBUG) {
    ns.tprint(`Building Exec Request`)
  }
  let request = new Request(REQUEST_TYPES.EXEC, payload)

  let response = await do_request(ns, request)

  return Promise.resolve(response.payload.pid)
}



/**
 * @param {import("@ns").NS} ns
 * @param {ExecRequestPayload} payload 
 */
function perform_exec(ns, payload) {
  let pid = ns.exec(payload.filename, payload.host, payload.threadOrOptions, ...payload.args)
  return pid
}


/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const EXEC_PROVIDE_HANDLER = ns.getPortHandle(PORT_IDS.EXEC_PROVIDE_HANDLER)
  const EXEC_REQUEST_HANDLER = ns.getPortHandle(PORT_IDS.EXEC_REQUEST_HANDLER)
  // const arg_flags = ns.flags([
  //   ["parent_pid",""]
  // ])

  // while(!EXEC_PROVIDE_HANDLER.tryWrite(
  //   JSON.stringify({
  //     action: "exec_init"
  //    ,payload: {
  //       requester: arg_flags.parent_pid
  //     }
  //   })
  // )) {
  //   await ns.sleep(200)
  // }

  ns.disableLog("ALL")
  ns.ui.setTailTitle("Execution Manager V1.0 - PID: " + ns.pid)

  while (true) {
    ns.print(`Awaiting Update to Act On`)
    while (EXEC_REQUEST_HANDLER.empty()) {
      if (!(EXEC_PROVIDE_HANDLER.empty())) {
        ns.print(`Ensuring no responses to dead processes remain in the provide queue`)
        let next_response = JSON.parse(EXEC_PROVIDE_HANDLER.peek())
        if (!ns.isRunning(parseInt(next_response.payload.requester))) {
          EXEC_PROVIDE_HANDLER.read()
        }
      }
      await ns.sleep(4) // Check the PORT every 0.004 seconds
    }

    let request = JSON.parse(EXEC_REQUEST_HANDLER.read())
    ns.print(`Request recieved: ${JSON.stringify(request)}`)

    /**
     *  request = {
     *    action  = "exec_request"
     *   ,payload = {
     *      requester = <pid>
     *     ,filename  = <string>
     *     ,host      = <string>
     *     ,args      = <string[]>
     *    }
     *  }
     */

    let response
    switch (request.action) {
      case REQUEST_TYPES.EXEC:
        let result_pid = perform_exec(ns, request.payload)
        response = {
          action : "exec_response"
         ,payload: {
            requester: (request.payload.requester)
           ,pid      : result_pid
          }
        }
        break;
      case REQUEST_TYPES.KILL:
        let killed = ns.kill(request.payload.pid)
        response = {
          action : "kill_response"
         ,payload: {
            requester : (request.payload.requester)
           ,pid_killed: killed
          } 
        }
      default:
        break;
    }
    
    ns.print(`Response generated: ${response}`)

    while (!EXEC_PROVIDE_HANDLER.tryWrite(
      JSON.stringify(response)
    )) {
      await ns.sleep(4) // Try to write our response to the port every 0.004 seconds.
    }
    ns.print(`Response sent`)
  }
}