/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const CONTROL_PARAM_HANDLER = ns.getPortHandle(1)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(2)
  const SERVER_INFO_HANDLER   = ns.getPortHandle(3)
  const UPDATE_HANDLER        = ns.getPortHandle(4)
  const RAM_REQUEST_HANDLER   = ns.getPortHandle(5)
  const RAM_PROVIDE_HANDLER   = ns.getPortHandle(6)

  // CONTROL_PARAM_HANDLER.clear()
  // BITNODE_MULTS_HANDLER.clear()
  // SERVER_INFO_HANDLER.clear()
  // UPDATE_HANDLER.clear()
  // RAM_REQUEST_HANDLER.clear()
  // RAM_PROVIDE_HANDLER.clear()

  ns.tprint(JSON.parse(CONTROL_PARAM_HANDLER.peek()))
  // ns.tprint(JSON.parse(BITNODE_MULTS_HANDLER.peek()))
  // ns.tprint(JSON.parse(SERVER_INFO_HANDLER.peek()))
  // ns.tprint(JSON.parse(UPDATE_HANDLER.peek()))
  // ns.tprint(JSON.parse(RAM_REQUEST_HANDLER.peek()))
  // ns.tprint(JSON.parse(RAM_PROVIDE_HANDLER.peek()))

  // ns.tprint(CONTROL_PARAM_HANDLER.peek())
  // ns.tprint(BITNODE_MULTS_HANDLER.peek())
  // ns.tprint(SERVER_INFO_HANDLER.peek())
  // ns.tprint(UPDATE_HANDLER.peek())
  // ns.tprint(RAM_REQUEST_HANDLER.peek())
  // ns.tprint(RAM_PROVIDE_HANDLER.peek())

  //ns.tprint("Value: " + ns.fileExists("/development/scripts/util/weaken_v3.js", "pserv-20"))

  ns.tprint(ns.gang.getTaskNames())
}