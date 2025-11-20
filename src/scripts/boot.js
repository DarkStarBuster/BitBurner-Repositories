import { PORT_NAMES } from "/src/scripts/manage_ports"
import { kill_all_other_processes } from "/src/scripts/util/static/kill_all_other_processes"

/** @param {import("@ns").NS} ns */
async function setup_port_ids(ns) {
  let ports = []
  ns.tprint(`INFO: Setting up port IDs.`)
  for (let name in PORT_NAMES) {
    let pid = ns.run("scripts/util/pid_provider.js")
    if (pid === 0) {
      ns.tprint(`ERROR: Failed to run pid provider script. Aborting startup process.`)
      ns.exit()
    }
    ports.push(`--${name}`)
    ports.push(pid)
  }

  ns.run("scripts/manage_ports.js", {threads:1,temporary:true}, ...ports)
  ns.tprint(`INFO: Setup ${ports.length / 2} ports.`)
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {

  // Ensure nothing else is running
  kill_all_other_processes(ns)

  // Setup static port handlers
  setup_port_ids(ns)

  // Begin main control loop
  ns.run("scripts/control_v4.js", {threads:1, temporary:true})

}