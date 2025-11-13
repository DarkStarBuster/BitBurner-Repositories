/** @param {NS} ns */
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

  // ns.tprint(JSON.stringify(CONTROL_PARAM_HANDLER.peek()))
  // ns.tprint(JSON.stringify(BITNODE_MULTS_HANDLER.peek()))
  // ns.tprint(JSON.stringify(SERVER_INFO_HANDLER.peek()))
  // ns.tprint(JSON.stringify(UPDATE_HANDLER.peek()))
  // ns.tprint(JSON.stringify(RAM_REQUEST_HANDLER.peek()))
  ns.tprint(JSON.stringify(RAM_PROVIDE_HANDLER.peek()))

}