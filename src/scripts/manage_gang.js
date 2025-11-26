import { COLOUR, colourize} from "/src/scripts/util/constant_utilities"
import { PORT_IDS } from "/src/scripts/util/dynamic/manage_ports"

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
 */
async function create_gang(ns, process_info) {
  let created = false
  while(!created) {
    let gang_created = ns.gang.createGang(process_info.gang_faction)
    if (gang_created) {
      created = true
      process_info.in_gang = true
    }
    await ns.sleep(5000)
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {ProcessInfo} process_info 
 */
function recruit_new_members(ns, process_info) {
  if (!ns.gang.canRecruitMember()) {
    return
  }

  let can_recruit = true
  while (can_recruit) {
    for (let name in NAMES) {
      if (!NAMES[name]) {
        let result = ns.gang.recruitMember(name)
        NAMES[name] = result
        process_info.members_cnt++
        process_info.members[name] = ns.gang.getMemberInformation(name)
        break
      }
    }
    can_recruit = ns.gang.canRecruitMember()
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {ProcessInfo} process_info 
 */
function update_member_info(ns, process_info) {
  for (let name in NAMES) {
    if (NAMES[name]) {
      process_info.members[name] = ns.gang.getMemberInformation(name)
    }
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {ProcessInfo} process_info 
 */
function assign_member_tasks(ns, process_info, clash_tick) {
  if (clash_tick && process_info.gang_info.territory != 0) {
    for (let name in NAMES) {
      if (NAMES[name]) {
        ns.gang.setMemberTask(name, "Territory Warfare")
      }
    }
    return
  }

  for (let name in NAMES) {
    if (NAMES[name]) {
      if (
            process_info.members[name].agi < 300
        ||  process_info.members[name].def < 300
        ||  process_info.members[name].dex < 300
        ||  process_info.members[name].str < 300
      ) {
        ns.gang.setMemberTask(name, "Train Combat")
      }
      else if (
          (   (process_info.gang_info.respect < 2e6)
          &&  (process_info.gang_info.wantedPenalty >= 0.7))
      ||  (   (process_info.gang_info.territory == 0)
          &&  (process_info.gang_info.respect < 7e8)
          &&  (process_info.gang_info.wantedPenalty >= 0.7))
      ){
        ns.gang.setMemberTask(name, String.fromCharCode(84) + "errorism")
      }
      else if (process_info.gang_info.wantedPenalty < 0.98){
        ns.gang.setMemberTask(name, "Vigilante Justice")
      }
      else if (
          (process_info.gang_info.power < (process_info.max_gang_power * 2))
      &&  (process_info.gang_info.territory != 0) // Getting out from a 0 Territory situation is tedious
      ) {
        ns.gang.setMemberTask(name, "Territory Warfare")
      }
      else {
        ns.gang.setMemberTask(name, "Human " + String.fromCharCode(84) + "rafficking")
      }
    }
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {ProcessInfo} process_info 
 */
function purchase_equipment(ns, process_info) {
  const equip_names = ns.gang.getEquipmentNames()
  for (let equip of equip_names) {
    let cost = ns.gang.getEquipmentCost(equip)
    let perc = cost / ns.getServerMoneyAvailable("home") 
    if (perc > process_info.purchase_perc) {
      continue
    }
    for (let name in NAMES) {
      if (NAMES[name]) {
        if (process_info.members[name].upgrades.includes(equip) || process_info.members[name].augmentations.includes(equip)) {
          continue
        }
        ns.gang.purchaseEquipment(name, equip)
      }
    }
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {ProcessInfo} process_info 
 */
function do_ascensions(ns, process_info) {
  for (let name in NAMES) {
    if (NAMES[name]) {
      let result = ns.gang.getAscensionResult(name)
      if (!result) {continue} // No need to do anything if we can't Ascend
      let mult_gain = result.agi * result.def * result.dex * result.str
      if (mult_gain > process_info.ascension_mult) {
        ns.gang.ascendMember(name)
        ns.tprint(`Gang member ${name} ascended.`)
      }
    }
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
    await create_gang(ns, process_info)
  }

  ns.atExit(function() {
    // If / when the script exits, ensure we do not leave Territory Warfare on
    ns.gang.setTerritoryWarfare(false)
  })

  while (true) {
    if (!CONTROL_PARAM_HANDLER.empty()) {
      control_params = JSON.parse(CONTROL_PARAM_HANDLER.peek())
    }
    process_info.check_faction  = control_params.gang_mgr.check_faction
    process_info.calc_only      = control_params.gang_mgr.calc_only
    process_info.purchase_perc  = control_params.gang_mgr.purchase_perc
    process_info.ascension_mult = control_params.gang_mgr.ascension_mult
    process_info.open_ui        = control_params.gang_mgr.open_ui
    // Are we in a clash tick?
    let power_check = ns.gang.getOtherGangInformation()[process_info.check_faction].power
    let clash_tick = false
    if (power_check != process_info.previous_check_power) {
      clash_tick = true
      process_info.previous_check_power = power_check
    }
    // Update our power
    process_info.gang_info = ns.gang.getGangInformation()
    // Find max power of other gang
    process_info.max_gang_power = 0
    process_info.max_gang_territory = 0
    let other_gangs = ns.gang.getOtherGangInformation()
    for (let name in other_gangs) {
      if (name === process_info.gang_faction) {continue}
      process_info.max_gang_power = Math.max(process_info.max_gang_power, other_gangs[name].power)
      process_info.max_gang_territory = Math.max(process_info.max_gang_territory, other_gangs[name].territory)
    }

    // Recruit new Members
    if (process_info.members_cnt < MAX_NUM_MEMBERS) {
      process_info.most_recent_action = `Recruiting new members`
      update_TUI(ns, process_info, true)
      recruit_new_members(ns, process_info)
    }

    // Update Member Info - Every Second
    if (process_info.last_member_update + 1000 < performance.now()) {
      process_info.most_recent_action = `Update member information`
      update_TUI(ns, process_info, true)
      update_member_info(ns, process_info)
    }

    // Any Members to Ascend?
    do_ascensions(ns, process_info)

    // Purchase Equipment for Members
    purchase_equipment(ns, process_info)

    // Work out and assign tasks to all members
    process_info.most_recent_action = `Update member assignments`
    update_TUI(ns, process_info, true)
    assign_member_tasks(ns, process_info, clash_tick)

    // Should we Clash?
    if (process_info.gang_info.power < (process_info.max_gang_power * 2)) {
      ns.gang.setTerritoryWarfare(false)
    }
    else {
      ns.gang.setTerritoryWarfare(true)
    }

    update_TUI(ns, process_info)
    await ns.gang.nextUpdate()
  }
}