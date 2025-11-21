import { PORT_IDS } from "/src/scripts/util/dynamic/manage_ports"
import { kill_all_other_processes } from "/src/scripts/util/static/kill_all_other_processes"

/** 
 * The RAM Cost of this Script is 3.7GB and it needs to be that
 * much as it cannot rely on any other scripts running to be able
 * to perform it's purpose.
 */


/** @param {import("@ns").NS} ns */
export async function main(ns) {

  const arg_flags = ns.flags([
    ["all"  ,false]
   ,["gang" ,false]
   ,["freeram",false]
  ])

  if (arg_flags.all) {
    kill_all_other_processes(ns)
    for (let id in PORT_IDS) {
      ns.getPortHandle(PORT_IDS[id]).clear()
    }
    let filename = "/scripts/boot/boot.js"
    ns.run(filename)
  }


  if (arg_flags.gang) {
    const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
    while(
      !UPDATE_HANDLER.tryWrite(
        JSON.stringify({
          "action": "request_action"
         ,"request_action": {
            "script_action": "reboot_gang"
          }
        })
      )
    ) {
      await ns.sleep(4)
    }
  }

  if (arg_flags.freeram) {
    const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
    while(
      !UPDATE_HANDLER.tryWrite(
        JSON.stringify({
          "action": "request_action"
         ,"request_action": {
            "script_action": "reboot_freeram"
          }
        })
      )
    ) {
      await ns.sleep(4)
    }
  }
}