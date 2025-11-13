/** Designed to work with scripts/control_servers_v2 */

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const arg_flags = ns.flags([
    ["server",""],
    ["target",""],
    ["addMsec",0],
    ["threads",0],
    ["sec_inc",0],
  ])
  const SERVER_INFO_HANDLER = ns.getPortHandle(3)
  const UPDATE_HANDLER = ns.getPortHandle(4)

  // // Add delay to try and stagger Port Writing
  // await ns.sleep(1000 + ((ns.pid * 10) % 1000))

  let do_grow = true
  let all_server_info_string = ""

  if (arg_flags.server == "") {
    ns.toast("Called grow.js without server ident", "error")
    do_grow = false
  }
  if (arg_flags.target == "") {
    ns.toast("Called grow.js without target", "error")
    do_grow = false
  }
  if (arg_flags.addMsec < 0) {
    ns.toast("Called grow.js with negative addMsec", "error")
    do_grow = false
  }
  if (arg_flags.threads <= 0) {
    ns.toast("Called grow.js with zero or negative threads", "error")
    do_grow = false
  }
  if (arg_flags.sec_inc <= 0) {
    ns.toast("Called grow.js without calculated security increase", "error")
    do_grow = false
  }

  all_server_info_string = SERVER_INFO_HANDLER.peek()
  while (all_server_info_string === "NULL PORT DATA"){
      ns.print("Awaiting Next Update")
      await SERVER_INFO_HANDLER.nextWrite()
      all_server_info_string = SERVER_INFO_HANDLER.peek()
      await ns.sleep(100)
      ns.print("Await ended")
  }

  let all_server_info = JSON.parse(all_server_info_string)
  let target_info = all_server_info[arg_flags.target]
  let server_info = all_server_info[arg_flags.server]
  
  if (do_grow) {
    ns.print("Performing Grow")
    let money_mult = await ns.grow(arg_flags.target,{additionalMsec:arg_flags.addMsec,threads:arg_flags.threads})

    let update_message_1 = {
      "action": "update_info",
      "update_info": {
        "server": arg_flags.target,
        "money_mult": money_mult,
        "diff_increased_by": arg_flags.sec_inc
      }
    }

    let update_message_2 = {
      "action": "update_info",
      "update_info": {
        "server": arg_flags.server,
        "freed_ram": 1.75 * arg_flags.threads,
        "pid_to_remove": ns.pid
      }
    }

    while(UPDATE_HANDLER.full()) {
      await ns.sleep(1000 + ((ns.pid * 10) % 1000))
    }
    while (!UPDATE_HANDLER.tryWrite(JSON.stringify(update_message_1))){
      await ns.sleep(1000 + ((ns.pid * 10) % 1000))
    }
    while (!UPDATE_HANDLER.tryWrite(JSON.stringify(update_message_2))){
      await ns.sleep(1000 + ((ns.pid * 10) % 1000))
    }
  }
  else {
    let update_message = {
      "action": "update_info",
      "update_info": {
        "server": arg_flags.server,
        "freed_ram": 1.75 * arg_flags.threads,
        "pid_to_remove": ns.pid
      }
    }

    while(UPDATE_HANDLER.full()) {
      await ns.sleep(1000 + ((ns.pid * 10) % 1000))
    }
    while (!UPDATE_HANDLER.tryWrite(JSON.stringify(update_message))){
      await ns.sleep(1000 + ((ns.pid * 10) % 1000))
    }
  }
}