export const PORT_NAMES = {
  CONTROL_PARAM_HANDLER     : "CONTROL_PARAM_HANDLER"
 ,BITNODE_MULTS_HANDLER     : "BITNODE_MULTS_HANDLER"
 ,SERVER_INFO_HANDLER       : "SERVER_INFO_HANDLER"
 ,UPDATE_HANDLER            : "UPDATE_HANDLER"
 ,RAM_REQUEST_HANDLER       : "RAM_REQUEST_HANDLER"
 ,RAM_PROVIDE_HANDLER       : "RAM_PROVIDE_HANDLER"
 ,SCAN_REQUEST_HANDLER      : "SCAN_REQUEST_HANDLER"
 ,SCAN_PROVIDE_HANDLER      : "SCAN_PROVIDE_HANDLER"
 ,EXEC_REQUEST_HANDLER      : "EXEC_REQUEST_HANDLER"
 ,EXEC_PROVIDE_HANDLER      : "EXEC_PROVIDE_HANDLER"
}

export const PORT_IDS = {
  CONTROL_PARAM_HANDLER : NaN
 ,BITNODE_MULTS_HANDLER : NaN
 ,SERVER_INFO_HANDLER   : NaN
 ,UPDATE_HANDLER        : NaN
 ,RAM_REQUEST_HANDLER   : NaN
 ,RAM_PROVIDE_HANDLER   : NaN
 ,SCAN_REQUEST_HANDLER  : NaN
 ,SCAN_PROVIDE_HANDLER  : NaN
 ,EXEC_REQUEST_HANDLER  : NaN
 ,EXEC_PROVIDE_HANDLER  : NaN
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  let flag_args = []
  for (let name in PORT_NAMES) {
    flag_args.push([name,NaN])
  }
  const arg_flags = ns.flags(flag_args)

  for (let arg in arg_flags) {
    if (!(PORT_IDS[arg] === undefined) && isNaN(PORT_IDS[arg]) && !isNaN(arg_flags[arg])) {
      PORT_IDS[arg] = arg_flags[arg]
      ns.getPortHandle(arg_flags[arg]).clear()
    }
  }
}