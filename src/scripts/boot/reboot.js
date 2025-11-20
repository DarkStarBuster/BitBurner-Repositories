import { PORT_IDS } from "/src/scripts/util/dynamic/manage_ports"
import { kill_all_other_processes } from "/src/scripts/util/static/kill_all_other_processes"


/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const UPDATE_HANDLER        = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)

  const arg_flags = ns.flags([
    ["all"  ,false]
   ,["gang" ,false]
   ,["freeram",false]
  ])

  if (arg_flags.all) {
    kill_all_other_processes(ns)
    let filename = "/scripts/boot.js"
    ns.run(filename)
  }

  if (arg_flags.gang) {
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