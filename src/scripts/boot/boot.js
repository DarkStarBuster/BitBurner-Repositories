import { PORT_IDS, PORT_NAMES } from "/src/scripts/boot/manage_ports"
import { kill_all_other_processes } from "/src/scripts/util/static/kill_all_other_processes"

/** 
 * The RAM Cost of this Script is 4.05GB and it needs to be that
 * much as it cannot rely on any other scripts running to be able
 * to perform it's purpose.
 */

/** @param {import("@ns").NS} ns */
function setup_port_ids(ns) {
  let ports = []
  ns.tprint(`INFO: Setting up port IDs.`)
  for (let name in PORT_NAMES) {
    let pid = ns.run("scripts/boot/pid_provider.js", {threads:1, temporary:true})
    if (pid === 0) {
      ns.tprint(`ERROR: Failed to run pid provider script. Aborting startup process.`)
      ns.exit()
    }
    ns.tprint(`INFO: Port '${name}' set to ${pid}`)
    ports.push(`--${name}`)
    ports.push(pid)
  }

  ns.run("scripts/boot/manage_ports.js", {threads:1,temporary:true}, ...ports)
  ns.tprint(`INFO: Setup ${ports.length / 2} ports.`)
}

/** @param {import("@ns").NS} ns */
function setup_exec_mgr(ns) {
  let pid = ns.run("scripts/core/manage_exec.js", {threads:1, temporary:true}, ...["--parent_pid", ns.pid])
  if (pid === 0) {
    ns.tprint(`ERROR: Failed to run the exec manager script. Aborting startup process.`)
    ns.exit()
  }
  ns.tprint(`INFO: Exec Manager started as process ${pid}`)
  return pid
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  ns.tprint(`INFO: Booting...`)
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

  ns.tprint(`INFO: Writing new Port IDs`)
  // Setup static port handlers
  setup_port_ids(ns)

  ns.tprint(`INFO: Starting exec manager`)
  let exec_pid = setup_exec_mgr(ns)
  let args = [
    "--exec_pid", exec_pid
  ]

  // Begin main control loop
  ns.tprint(`INFO: Run Control Process`)
  ns.run("scripts/control_v4.js", {threads:1, temporary:true}, ...args)

}