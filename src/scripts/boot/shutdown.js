import { PORT_IDS } from "/src/scripts/boot/manage_ports"
import { kill_all_other_processes } from "/src/scripts/util/static/kill_all_other_processes"

/** 
 * The RAM Cost of this Script is 4.05GB and it needs to be that
 * much as it cannot rely on any other scripts running to be able
 * to perform it's purpose.
 */

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  ns.tprint(`INFO: Shutting Down...`)
  // Ensure nothing else is running
  kill_all_other_processes(ns)

  ns.tprint(`INFO: Clearing Ports`)
  // Ensure all ports are cleaned of data
  for (let id in PORT_IDS) {
    if (!(isNaN(id))) {
      ns.tprint(`INFO: Clearing Port ${id}.`)
      ns.getPortHandle(PORT_IDS[id]).clear()
    }
  }

  ns.tprint(`INFO: Shutdown Complete.`)

}