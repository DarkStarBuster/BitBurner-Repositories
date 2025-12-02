import { COLOUR, colourize} from "/src/scripts/util/constant_utilities"
import { PORT_IDS } from "/src/scripts/boot/manage_ports"
import { ControlParameters } from "/src/scripts/core/util_control_parameters";

const MAX_NUM_MEMBERS = 12
const NAMES = {
  "Alpha"  : false
 ,"Beta"   : false
 ,"Gamma"  : false
 ,"Delta"  : false 
 ,"Epsilon": false
 ,"Zeta"   : false
 ,"Eta"    : false
 ,"Theta"  : false
 ,"Iota"   : false
 ,"Kappa"  : false
 ,"Lambda" : false
 ,"Mu"     : false // Max Number of Gang Members Reached here currently
 ,"Nu"     : false
 ,"Xi"     : false
 ,"Omicron": false
 ,"Pi"     : false
 ,"Rho"    : false
 ,"Sigma"  : false
 ,"Tau"    : false
 ,"Upsilon": false
}

class ProcessInfo {
  /** @type {number} */
  last_ui_update = 0;
  /** @type {number} */
  last_member_update = 0;
  /** @type {number} */
  last_gang_money_update = 0;
  /** @type {string} */
  most_recent_action;
  /** @type {string} */
  gang_faction;
  /** @type {stirng} */
  check_faction;
  /** @type {boolean} */
  calc_only = true;
  /** @type {boolean} */
  in_gang = false;
  /** @type {Object<string, import("@ns").GangMemberInfo>} */
  members = {};
  /** @type {number} */
  members_cnt = 0;
  /** @type {number} */
  max_gang_power = 0;
  /** @type {number} */
  max_gang_territory = 0;
  /** @type {number} */
  previous_check_power = 0;
  /** @type {number} */
  purchase_perc = 0;
  /** @type {number} */
  ascension_mult = 0;
  /** @type {import("@ns").GangGenInfo} */
  gang_info
  /** @type {boolean} */
  open_ui = false;

  /**
   * @param {import("@ns").NS} ns
   * @param {Object}
   */
  constructor(ns, control_params) {
    this.gang_faction = control_params.gang_mgr.gang_faction
    this.check_faction = control_params.gang_mgr.check_faction
    this.calc_only = control_params.gang_mgr.calc_only
    this.purchase_perc = control_params.gang_mgr.purchase_perc
    this.ascension_mult = control_params.gang_mgr.ascension_mult
    this.in_gang = ns.gang.inGang()
    this.most_recent_action = "Initialisation"
  } 
}

/**
 * @param {import("@ns").NS} ns
 * @param {ProcessInfo} process_info
 * @param {Object} control_params
 */
function init(ns, process_info) {
  ns.disableLog("ALL")
  if (ns.gang.inGang()) {
    for (let name of ns.gang.getMemberNames()) {
      process_info.members[name] = ns.gang.getMemberInformation(name)
      process_info.members_cnt++
      NAMES[name] = true
    }
  }
  process_info.last_member_update = performance.now()
}

/**
 * 
 * @param {import("@ns").NS} ns 
 * @param {ProcessInfo} process_info 
 * @param {boolean} force_update
 */
function update_TUI(ns, process_info, force_update = false) {
  if ((process_info.last_ui_update + 1000 > performance.now()) && !force_update) {
    return
  }
  process_info.last_ui_update = performance.now()
  ns.clearLog()

  const blk = colourize(COLOUR.BLACK, 4)
  const wht = colourize(COLOUR.WHITE, 2)
  const red = colourize(COLOUR.RED, 9)
  const org = colourize(COLOUR.ORANGE, 9)
  const yel = colourize(COLOUR.YELLOW, 9)
  const gre = colourize(COLOUR.GREEN, 9)
  const def = colourize(COLOUR.DEFAULT)

  if (!ns.self().tailProperties && process_info.open_ui) {ns.ui.openTail()}

  let cell_width = 30
  let title_bar_length = (cell_width*4)+5

  let title_bar_for_length = ` ${process_info.gang_faction} ════ Respect: ${(process_info.gang_info ? ns.formatNumber(process_info.gang_info.respect,2) : `N/A`)} ════ Reputation: ${"Needs Singularity"} `
  let title_bar_string = ` ${wht}${process_info.gang_faction} ${blk}════ ${wht}Respect: ${(process_info.gang_info ? ns.formatNumber(process_info.gang_info.respect,2) : `N/A`)} ${blk}════ ${wht}Reputation: ${"Needs Singularity"}${blk} `
  
  ns.print(`TBFL: ${title_bar_for_length.length}, TBS: ${title_bar_string.length}`)
  ns.print(`${blk}╔══${title_bar_string.padEnd((title_bar_length + title_bar_string.length) - (title_bar_for_length.length + 4)  ,"═")}╗`)
  ns.print(`${blk}║ ${wht}Most Recent Action: ${process_info.most_recent_action.padEnd(title_bar_length - 23)}${blk}║`)
  ns.print(`${blk}╠${"".padEnd(cell_width,"═")}╦${"".padEnd(cell_width,"═")}╦${"".padEnd(cell_width,"═")}╦${"".padEnd(cell_width,"═")}╣`)
  ns.print(`${blk}║ ${wht}Max Gang Power: ${ns.formatNumber(process_info.max_gang_power,2).padStart(cell_width - 18)}${blk} ║ ${wht}Max Gang Territory: ${ns.formatPercent(process_info.max_gang_territory).padStart(cell_width - 22)} ${blk}║ ${wht}Our Power: ${(process_info.gang_info ? ns.formatNumber(process_info.gang_info.power,2) : `N/A`).padStart(cell_width - 13)} ${blk}║ ${wht}Our Territory : ${(process_info.gang_info ? ns.formatPercent(process_info.gang_info.territory) : `N/A`).padStart(cell_width - 18)} ${blk}║`)
  
  /** @type {string[]} */
  let table_strings = []
  let member_cnt = 0
  let row_length = 4
  let height = 5
  for (let name in process_info.members) {
    let row = Math.floor(member_cnt / row_length)
    if ((member_cnt % row_length) != 0) {
      table_strings[(row*height)+0] = table_strings[(row*height)+0].replace("╗","╦")
      table_strings[(row*height)+height] = table_strings[(row*height)+height].replace("╝","╩")
    }
    if (row == 0) {
      table_strings[(row*height)+0] = (table_strings[(row*height)+0] || `${blk}╔`) + "".padEnd(cell_width, "═") + "╗"
    }
    else {
      table_strings[((row-1)*height)+height] = table_strings[((row-1)*height)+height].replace("╚","╠").replace("╩","╬")
      if ((member_cnt + 1) % row_length == 0) {
        table_strings[((row-1)*height)+height] = table_strings[((row-1)*height)+height].replace("╝","╣")
      }
    }
    let result = ns.gang.getAscensionResult(name)
    let ascen_m = "Not Possible"
    if (result) {
      ascen_m = ns.formatNumber(result.agi * result.def * result.dex * result.str,2)
    }
    table_strings[(row*height)+1] = (table_strings[(row*height)+1] || `${blk}║`) + ` ${wht}Name   : ${name.padStart(cell_width - 11)} ${blk}║`
    table_strings[(row*height)+2] = (table_strings[(row*height)+2] || `${blk}║`) + ` ${wht}Task   : ${process_info.members[name].task.padStart(cell_width - 11)} ${blk}║`
    table_strings[(row*height)+3] = (table_strings[(row*height)+3] || `${blk}║`) + ` ${wht}Respect: ${ns.formatNumber(process_info.members[name].earnedRespect,2).padStart(cell_width - 11)} ${blk}║`
    table_strings[(row*height)+4] = (table_strings[(row*height)+4] || `${blk}║`) + ` ${wht}Ascen M: ${ascen_m.padStart(cell_width - 11)} ${blk}║`
    table_strings[(row*height)+height] = (table_strings[(row*height)+height] || `${blk}╚`) + "".padEnd(cell_width, "═") + "╝"
    member_cnt++
  }

  for (let string of table_strings) {
    ns.print(string.replace("╔","╠").replace("╦","╬").replace("╗","╣"))
  }
  
  let height_for_title_bar = 33
  let height_per_line = 24
  let height_per_row = height_per_line * 5
  let rows = Math.floor((member_cnt-1) / row_length) + 1

  let X_SIZE = 1210
  let Y_SIZE = height_for_title_bar + (height_per_line * 5) + (height_per_row * rows)
  let tail_properties = ns.self().tailProperties
  if (!(tail_properties === null)) {
    if (!(tail_properties.height === Y_SIZE) || !(tail_properties.width === X_SIZE)) {
      ns.ui.resizeTail(X_SIZE, Y_SIZE)
    }
  }
}

/**
 * @param {import("@ns").NS} ns
 * @param {ProcessInfo} process_info
 * @param {ControlParameters} control_params
 */
async function create_gang(ns, process_info, control_params) {
  let created = false
  let UPDATE_HANDLER = ns.getPortHandle(PORT_IDS.UPDATE_HANDLER)
  while(!created) {
    await ns.sleep(5000)
    let gang_created = ns.gang.createGang(process_info.gang_faction)
    if (gang_created) {
      created = true
      process_info.in_gang = true
      while (!UPDATE_HANDLER.tryWrite(JSON.stringify({
        action : "update_control_param"
       ,payload: {
          domain  : "gang_mgr"
         ,property: "created"
         ,value   : true
        }
      }))) {
        await ns.sleep(4)
      }
      if (control_params.player_mgr.desire === "gang") {
        while(!UPDATE_HANDLER.tryWrite(JSON.stringify({
          action : "update_control_param"
         ,payload: {
            domain  : "player_mgr"
           ,property: "desire"
           ,value   : "rep"
          }
        }))) {
          await ns.sleep(4)
        }
      }
      while (!UPDATE_HANDLER.tryWrite(JSON.stringify({
        action: "request_action"
        ,request_action: {
          script_action: "reboot_gang"
        }
      }))) {
        await ns.sleep(4)
      }
    }
    update_TUI(ns, process_info)
  }
}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const CONTROL_PARAM_HANDLER = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(PORT_IDS.BITNODE_MULTS_HANDLER)

  while (
      CONTROL_PARAM_HANDLER.empty()
  ||  BITNODE_MULTS_HANDLER.empty()
  ) {
    await ns.sleep(4)
  }

  /** @type {ControlParameters} */
  let control_params = JSON.parse(CONTROL_PARAM_HANDLER.peek())
  let bitnode_mults  = JSON.parse(BITNODE_MULTS_HANDLER.peek())
 
  /** @type {ProcessInfo} */
  let process_info = new ProcessInfo(ns, control_params)
  init(ns, process_info, control_params)
  ns.ui.setTailTitle("Manage Gang V1.0 - PID: " + ns.pid)

  // Create Gang
  if (!process_info.in_gang) {
    process_info.most_recent_action = `Waiting to create a Gang with Faction ${process_info.gang_faction}`
    update_TUI(ns, process_info, true)
    await create_gang(ns, process_info, control_params)
  }
}