import {COLOUR, colourize} from "/src/scripts/util/colours.js"
import {bitnode_mults} from "/src/scripts/util/bitnode_modifiers.js"
import {scan_for_servers} from "/src/scripts/util/scan_for_servers.js"

/**
 * Guess who didn't know that string.padStart and string.padEnd existed?
 * 
 * @param {string} string
 * @param {number} len
 * @param {string?} char
 */
function pad_str(string, len , char){
  var pad = char || " "
  var actual_pad = ""
  for(var i = 0; i < len; i++){
    actual_pad = actual_pad + pad
  }
  return String(actual_pad + string).slice(-len)
}

/** @param {import("@ns").NS} ns */
function report_server_info_from_port(ns, server_to_report){
  const SERVER_INFO_HANDLER = ns.getPortHandle(3)

  /**
   * all_server_status is an object that will hold information about all servers we have root access to.
   * 
   * It will be exposed on Port 3 as a result of JSON.stringify(all_server_status)
   * 
   * all_server_status = {
   *  "n00dles" = {
   *    "max_money": ns.getServerMaxMoney(server),
   *    "current_money": ns.getServerMoneyAvailable(server),
   *    "max_ram": ns.getServerMaxRam(server),
   *    "free_ram": ns.getServerFree
   *    "min_difficulty": ns.getServerMinSecurityLevel(server),
   *    "current_difficulty": ns.getServerSecurityLevel(server),
   *    "actions": {
   *      <PID> = {
   *        "server": <hostname>,
   *        "target": <hostname>,
   *        "action": "hack" | "grow" | "weaken" | <script_name>
   *      },
   *      <PID> ...
   *    }
   *  }
   * }
   * 
   */

  let server_info = JSON.parse(SERVER_INFO_HANDLER.peek())
  let max_name_length = 0
  for (let server in server_info) {
    if(server.length > max_name_length) {
      max_name_length = server.length
    }
  }
  if(String("Server Name").length > max_name_length) {
    max_name_length = String("Server Name").length
  }
  let title_string = 
    pad_str("Server Name", max_name_length)
  + " | "
  + pad_str("Free Ram", 9)
  // + " / "
  // + pad_str("Total Ram", 9)
  + " | "
  + pad_str("Current Money", 14)
  // + " / "
  // + pad_str("Max Money", 14)
  + " (   %)"
  + " | "
  + pad_str("Curr Diff", 10)
  + " / "
  + pad_str("Min Diff", 10)
  + " | "
  + pad_str("Actions", 31+max_name_length)
  + " |"
  ns.tprint(title_string)
  let break_line = ""
  for (var i = 0; i < title_string.length; i++) {
    break_line = break_line + "-"
  }
  ns.tprint(break_line)
  for (let server in server_info) {
    if (  server_to_report != "all"
      &&  server != server_to_report
    ) {
      continue
    }
    let table_string = ""
    let action_string = ""
    let num_actions = 0
    let condense_actions = false
    let pid_to_ignore = 0
    let percent = ""
    if (server_info[server].max_money != 0) {
      percent = " (" + pad_str((server_info[server].current_money*100/server_info[server].max_money).toFixed(0),3) + "%)"
    }
    else {
      percent = "       "
    }

    let hack_cnt = 0
    let weaken_cnt = 0
    let grow_cnt = 0
    for (let key in server_info[server].actions) {
      if (action_string == "") {
        action_string = 
          "<" + pad_str(key,9) + ">: "
        + "[" + pad_str(server_info[server].actions[key].action, 7) + ":" + pad_str(server_info[server].actions[key].threads,7) + "] "
        + pad_str(server_info[server].actions[key].target, max_name_length)
        pid_to_ignore = key
      }
      for (let key in server_info[server].actions) {
        switch(server_info[server].actions[key].action) {
          case "hack":
            hack_cnt += server_info[server].actions[key].threads
            num_actions += 1
            break
          case "grow":
            grow_cnt += server_info[server].actions[key].threads
            num_actions += 1
            break
          case "weaken":
            weaken_cnt += server_info[server].actions[key].threads
            num_actions += 1
            break
        }
      }
      break
    }
    if (num_actions > 10) {
      condense_actions = true
      action_string =
        "<" + pad_str("#toomany#",9) + ">: "
      + "[" + pad_str("hacks",7) + ":" + pad_str(ns.formatNumber(hack_cnt,2),7) + "] "
      + pad_str("#many#", max_name_length)
      pid_to_ignore = 0
    }
    table_string = 
      pad_str(server, max_name_length)
    + " | "
    + pad_str(ns.formatRam(server_info[server].free_ram), 9)
    // + " / "
    // + pad_str(ns.formatRam(server_info[server].max_ram), 9)
    + " | "
    + pad_str(parseInt(server_info[server].current_money), 14)
    // + " / "
    // + pad_str(parseInt(server_info[server].max_money), 14)
    + percent
    + " | "
    + pad_str(Number(server_info[server].current_difficulty).toFixed(2),10)
    + " / "
    + pad_str(Number(server_info[server].min_difficulty).toFixed(2),10)
    + " | "
    + pad_str(action_string, 31+max_name_length)
    + " |"
    ns.tprint(
      table_string
    )
    
    
    if (condense_actions) {
      // Print Grows
      action_string =
        "<" + pad_str("#toomany#",9) + ">: "
      + "[" + pad_str("grows",7) + ":" + pad_str(ns.formatNumber(grow_cnt,2),7) + "] "
      + pad_str("#many#", max_name_length)
      ns.tprint(
        pad_str("", max_name_length)
      + " | "
      + pad_str("", 9)
      // + "   "
      // + pad_str("", 9)
      + " | "
      + pad_str("", 14)
      // + "   "
      // + pad_str("", 14)
      + "       "
      + " | "
      + pad_str("",10)
      + "   "
      + pad_str("",10)
      + " | "
      + pad_str(action_string, 31+max_name_length)
      + " |"
      )
      // Print Weakens
      action_string =
        "<" + pad_str("#toomany#",9) + ">: "
      + "[" + pad_str("weakens",7) + ":" + pad_str(ns.formatNumber(weaken_cnt,2),7) + "] "
      + pad_str("#many#", max_name_length)
      ns.tprint(
        pad_str("", max_name_length)
      + " | "
      + pad_str("", 9)
      // + "   "
      // + pad_str("", 9)
      + " | "
      + pad_str("", 14)
      // + "   "
      // + pad_str("", 14)
      + "       "
      + " | "
      + pad_str("",10)
      + "   "
      + pad_str("",10)
      + " | "
      + pad_str(action_string, 31+max_name_length)
      + " |"
      )

    }

    for (let key in server_info[server].actions) {
      let print_line = false
      if (
          condense_actions
      &&  server_info[server].actions[key].action != "hack"
      &&  server_info[server].actions[key].action != "grow"
      &&  server_info[server].actions[key].action != "weaken"
      ) {
        print_line = true
      }
      if (
        !condense_actions
      ) {
        print_line = true
      }


      if (print_line) {
        action_string = 
          "<" + pad_str(key,9) + ">: "
        + "[" + pad_str(server_info[server].actions[key].action, 7) + ":" + pad_str(server_info[server].actions[key].threads,7) + "] "
        + pad_str(server_info[server].actions[key].target, max_name_length)
        ns.tprint(
          pad_str("", max_name_length)
        + " | "
        + pad_str("", 9)
        // + "   "
        // + pad_str("", 9)
        + " | "
        + pad_str("", 14)
        // + "   "
        // + pad_str("", 14)
        + "       "
        + " | "
        + pad_str("",10)
        + "   "
        + pad_str("",10)
        + " | "
        + pad_str(action_string, 31+max_name_length)
        + " |"
        )
      }
    }
    
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {string[]} servers
 * @param {JSONObject} filter
 */
function report_servers(ns, servers, filter){
  var max_name_length = 0
  for(var i = 0; i < servers.length; i++){
    var server = servers[i]
    if (server.length > max_name_length) {
      max_name_length = server.length
    }
  }
  ns.tprint(
    pad_str("Server Name", max_name_length)
  + " |"
  + pad_str("R", 2)
  + " |"
  + pad_str("#", 2)
  + " |"
  + pad_str("RAM", 9)
  + " |"
  + pad_str("Curr Money", 14)
  // + " /"
  // + pad_str("Max Money", 14)
  + " (      %)"
  + " |"
  + pad_str("Security", 16)
  + " |"
  + pad_str("Hack Lvl",9)
  + " |"
  + pad_str("G.Fact",7)
  + " |"
  )
  let continue_outer_for = false
  for(let i = 0; i < servers.length; i++){
    let server = servers[i]
    continue_outer_for = false

    for(let prop in filter){
      switch (prop){
        case "rooted":
          if (filter[prop] == "+" && !ns.hasRootAccess(server)) {
            continue_outer_for = true
          }
          else if (filter[prop] == "-" && ns.hasRootAccess(server)) {
            continue_outer_for = true
          }
          break
        case "ports_needed":
          if (filter[prop].indexOf(ns.getServerNumPortsRequired(server)) == -1) {
            continue_outer_for = true
          }
          break
      }
    }

    if (continue_outer_for) {
      continue
    }

    let root_access = "-"
    let hackable = "-"
    if (ns.hasRootAccess(server)){
      root_access = "+"
    }
    if (ns.getServerRequiredHackingLevel(server) < ns.getHackingLevel()) {
      hackable = "+"
    }
    ns.tprint(
      pad_str(server,max_name_length)
    + " |"
    + pad_str(root_access,2)
    + " |"
    + pad_str(ns.getServerNumPortsRequired(server),2)
    + " |"
    + pad_str(ns.formatRam(ns.getServerMaxRam(server)),9) 
    + " |"
    + pad_str(parseInt(ns.getServerMoneyAvailable(server)), 14)
    // + " /"
    // + pad_str(parseInt(ns.getServerMaxMoney(server)), 14)
    + " ("
    + pad_str((ns.getServerMoneyAvailable(server)*100/ns.getServerMaxMoney(server)).toFixed(2),6)
    + "%)"
    + " |"
    + pad_str(pad_str(ns.getServerSecurityLevel(server).toFixed(2),6) + " / " + pad_str(ns.getServerMinSecurityLevel(server).toFixed(2),6), 16)
    + " |"
    + pad_str(ns.getServerRequiredHackingLevel(server),9)
    + " |"
    + pad_str(ns.getServer(server).serverGrowth,7)
    + " |"
    )
  }
}

/**
 * @param {import("@ns").NS} ns 
 */
function display_all_bitnode_info(ns) {
  const MAX_NUM_BITNODES = 13
  const MAX_BITNODE_LEVEL = 1

  let bitnode_info = ns.getBitNodeMultipliers() // Gets Currnet Bitnodes mult info
  let keys = []
  let max_key_length = 0

  for (let key in bitnode_info) {
    if (key.length > max_key_length) {
      max_key_length = key.length
    }
    keys.push(key)
  }

  // Holds the array of strings that display the table
  let table_strings = []
  let bitnode_title = ""
  let bitnode = ""
  table_strings.length = keys.length
  table_strings.fill("")

  let dflt_val = 1
  let larger_colour = colourize(COLOUR.RED, 9)
  let smaller_colour = colourize(COLOUR.GREEN, 9)

  for (let i = 1; i <= MAX_NUM_BITNODES; i++) {
    for (let j = 1; j <= MAX_BITNODE_LEVEL; j++) {
      bitnode_info = ns.getBitNodeMultipliers(i,j)

      bitnode = "BN" + i + "." + j

      bitnode_title =
        bitnode_title
      + (bitnode_title == "" ? "" : "|")
      + colourize(COLOUR.WHITE, 4) + bitnode.padStart(6) + " "
      + colourize(COLOUR.BLACK, 4)

      for (let k = 0; k < keys.length; k++) {
        dflt_val = 1
        larger_colour = colourize(COLOUR.RED, 9)
        smaller_colour = colourize(COLOUR.GREEN, 9)
        if (
            bitnode_mults[keys[k]].default != undefined
        &&  bitnode_mults[keys[k]].default != dflt_val
        ) {
          dflt_val = bitnode_mults[keys[k]].default
        }
        if (bitnode_mults[keys[k]].larger) {
          larger_colour = colourize(COLOUR.GREEN, 9)
          smaller_colour = colourize(COLOUR.RED, 9)
        }
        table_strings[k] = 
          table_strings[k]                       // Previous String
        + (table_strings[k] == "" ? "" : "|")    // Seperator from Previous String if needed
        + (bitnode_info[keys[k]] == dflt_val ? colourize(COLOUR.YELLOW,9) : (bitnode_info[keys[k]] > dflt_val  ? larger_colour : smaller_colour))
        //+ " " + keys[k].padEnd(max_key_length) + ": "
        + (keys[k] == "StaneksGiftExtraSize" ?
            String( (bitnode_info[keys[k]] < 0 ? "" : "+") + bitnode_info[keys[k]]).padStart(6)
          : ns.formatPercent(bitnode_info[keys[k]] / dflt_val,0).padStart(6)
          ) + " "
        + colourize(COLOUR.BLACK, 4) //+ "|"
      }
    }
  }

  let table = ""
  for (let i = 0; i < table_strings.length; i++) {
    table = table
    + colourize(COLOUR.BLACK, 4) + "║ "
    + colourize(COLOUR.WHITE, 4) + keys[i].padEnd(max_key_length)
    + colourize(COLOUR.BLACK, 4) + " ║"
    + table_strings[i] + "║"
    + "\n"
  }

  let table_width = String(
    "║ "
  + "".padEnd(max_key_length)
  + " ║"
  + "".padEnd(8 * MAX_NUM_BITNODES)
  ).length

  let title = "All Bitnode Modifiers"
  ns.tprint("\n"
  + colourize(COLOUR.BLACK, 4) + "╔═"
  + colourize(COLOUR.WHITE, 4) + title
  + colourize(COLOUR.BLACK, 4) + "".padEnd(table_width - (title.length + 3), "═") + "╗\n"
  + colourize(COLOUR.BLACK, 4) + "║ " + "".padEnd(max_key_length) + " ║"
  + bitnode_title + "║\n"
  + "╠" + "".padEnd(table_width - 2, "═") + "╣\n"
  + table
  + "╚" + "".padEnd(table_width - 2, "═") + "╝"
  )

}

/**
 * @param {import("@ns").NS} ns
 */
function display_bitnode_info(ns) {
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(2)

  let bitnode_info = JSON.parse(BITNODE_MULTS_HANDLER.peek())
  let keys = []
  let max_key_length = 0

  for (let key in bitnode_info) {
    if (key.length > max_key_length) {
      max_key_length = key.length
    }
    keys.push(key)
  }

    // Holds the array of strings for the table
  let table_strings = [""]
  // Number of rows in the table (based on wanting 3 columns)
  let table_length = Math.ceil(keys.length / 3)

  for (let i = 0; i < table_length-1; i++){
    table_strings.push("")
  }

  let dflt_val = 1
  let larger_colour = colourize(COLOUR.RED,9)
  let smaller_colour = colourize(COLOUR.GREEN,9)

  for (let i = 0; i < keys.length; i++) {
    dflt_val = 1
    larger_colour = colourize(COLOUR.RED,9)
    smaller_colour = colourize(COLOUR.GREEN,9)
    ns.tprint(keys[i])
    if (
        bitnode_mults[keys[i]].default != undefined
    &&  bitnode_mults[keys[i]].default != dflt_val
    ) {
      dflt_val = bitnode_mults[keys[i]].default
    }
    if (bitnode_mults[keys[i]].larger) {
      larger_colour = colourize(COLOUR.GREEN,9)
      smaller_colour = colourize(COLOUR.RED,9)
    }
    table_strings[i % table_length] = 
      table_strings[i % table_length]                       // Previous String
    + (table_strings[i % table_length] == "" ? "" : "|")    // Seperator from Previous String if needed
    + (bitnode_info[keys[i]] == dflt_val ? colourize(COLOUR.YELLOW,9) : (bitnode_info[keys[i]] > dflt_val  ? larger_colour : smaller_colour))
    + " " + keys[i].padEnd(max_key_length) + ": "
    + (keys[i] == "StaneksGiftExtraSize" ?
        String((bitnode_info[keys[i]] > 0 ? "+" : "") + bitnode_info[keys[i]]).padStart(5)
      : ns.formatPercent(bitnode_info[keys[i]] / dflt_val,0).padStart(5)
      ) + " "
    + colourize(COLOUR.BLACK,4)
  }

  let table_width = 
    3 * max_key_length // Number of characters for three max length keys
  + 4 // Number of | characters
  + 9 // number of blankspace characters
  + 3 // Number of : characters
  + 15 // Number of characters devoted to percent values
  let title_string = colourize(COLOUR.BLACK,4) + "╔═" + colourize(COLOUR.WHITE,4) + " BitNode Multipliers " + colourize(COLOUR.BLACK,4) + String("").padEnd(table_width - (23 + 1),"═") + "╗"

  ns.tprint(title_string)
  for (let string of table_strings) {
    string = colourize(COLOUR.BLACK,4) + "║" + string + "║"
    ns.tprint(string)
  }

  let footer_string = colourize(COLOUR.BLACK,4) + "╚" + String("").padEnd(table_width - 2,"═") + "╝"
  ns.tprint(footer_string)

}

/**
 * @param {boolean} value
 * @returns {string} "+" | "-"
 */
function bool_to_char(value) {
  if (value) {
    return "+"
  }
  else {
    return "-"
  }
}

/**
 * @param {boolean} value
 * @returns {string} "Open" | "Closed"
 */
function port_status(value) {
  if (value) {
    return "Open"
  }
  else {
    return "Closed"
  }
}

/**
 * @param {import("@ns").NS} ns
 * @param {string[]} servers
 * @param {string} server
 */
async function display_server_info(ns, servers, server) {

  if (servers.indexOf(server) == -1) {
    ns.tprint("Invalid Server hostname passed.")
    ns.exit()
  }

  let max_name_length = 0
  for (let server of servers) {
    if(server.length > max_name_length) {
      max_name_length = server.length
    }
  }
  let server_info = ns.getServer(server)

  let rooted = bool_to_char(server_info.hasAdminRights)
  let backdoored = bool_to_char(server_info.backdoorInstalled)

  rooted = (rooted == "+" ? colourize(COLOUR.GREEN,9) : colourize(COLOUR.RED,9)) + rooted + colourize(COLOUR.DEFAULT)
  backdoored = (backdoored == "+" ? colourize(COLOUR.GREEN,9) : colourize(COLOUR.RED,9)) + backdoored + colourize(COLOUR.DEFAULT)
  
  let ports_needed = server_info.numOpenPortsRequired || 0
  let ports_opened = 0
  let ssh_status  = port_status(server_info.sshPortOpen)
  let ftp_status  = port_status(server_info.ftpPortOpen)
  let smtp_status = port_status(server_info.smtpPortOpen)
  let http_status = port_status(server_info.httpPortOpen)
  let sql_status  = port_status(server_info.sqlPortOpen)
  if (ssh_status=="Open") ports_opened += 1
  if (ftp_status=="Open") ports_opened += 1
  if (smtp_status=="Open") ports_opened += 1
  if (http_status=="Open") ports_opened += 1
  if (sql_status=="Open") ports_opened += 1
  ssh_status  = pad_str("",6 - ssh_status.length ) + (ssh_status  == "Open" ? colourize(COLOUR.GREEN,9) : colourize(COLOUR.RED,9)) + ssh_status  + colourize(COLOUR.DEFAULT)
  ftp_status  = pad_str("",6 - ftp_status.length ) + (ftp_status  == "Open" ? colourize(COLOUR.GREEN,9) : colourize(COLOUR.RED,9)) + ftp_status  + colourize(COLOUR.DEFAULT)
  smtp_status = pad_str("",6 - smtp_status.length) + (smtp_status == "Open" ? colourize(COLOUR.GREEN,9) : colourize(COLOUR.RED,9)) + smtp_status + colourize(COLOUR.DEFAULT)
  http_status = pad_str("",6 - http_status.length) + (http_status == "Open" ? colourize(COLOUR.GREEN,9) : colourize(COLOUR.RED,9)) + http_status + colourize(COLOUR.DEFAULT)
  sql_status  = pad_str("",6 - sql_status.length ) + (sql_status  == "Open" ? colourize(COLOUR.GREEN,9) : colourize(COLOUR.RED,9)) + sql_status  + colourize(COLOUR.DEFAULT)
  
  let curr_diff = pad_str((server_info.hackDifficulty || 0).toFixed(2),6)
  let min_diff = pad_str((server_info.minDifficulty || 0).toFixed(2),6)
  let free_ram = pad_str(ns.formatRam(server_info.maxRam - server_info.ramUsed),8)
  let max_ram = pad_str(ns.formatRam(server_info.maxRam),8)

  let money = server_info.moneyAvailable || 0
  let max_money = server_info.moneyMax || 0
  let money_string = ""

  if (max_money == 0) {
    money_string = pad_str("Not Applicable",16)
  }
  else {
    money_string = pad_str("$" + ns.formatNumber(money) + " (" + ns.formatPercent((money)/(max_money),0) + ")",16)
  }

  let hack_level = pad_str(server_info.requiredHackingSkill,7)
  let growth_fact = pad_str(server_info.serverGrowth,8) //pad_str(server_info.serverGrowth,8)
  let cores = pad_str(server_info.cpuCores,3)

  // ns.tprint("╔═" + pad_str(server,max_name_length,"═") + "═╗")
  // ns.tprint("╠═Info═════════╦═Stats═════════════════════╗")
  // ns.tprint("║ Rooted:    Y ║ Difficulty: xxx.xx/zzz.zz ║")
  // ns.tprint("║ Backdoor:  Y ║ Ram:    xxx.xxGB/yyy.yyGB ║")
  // ns.tprint("╠═Ports═(X/Y)══╣ Money:   $xxx.xxxK (yyy%) ║")
  // ns.tprint("║ SSH:    Open ║ Hack Lvl:             xxx ║")
  // ns.tprint("║ FTP:  Closed ║ Growth Factor:   cccccccc ║")
  // ns.tprint("║ SMTP: Closed ║ Cores:          XXX cores ║")
  // ns.tprint("║ HTTP: Closed ╠═══════════════════════════╝")
  // ns.tprint("║ SQL:  Closed ║")
  // ns.tprint("╚══════════════╝")


  ns.tprint(
    "\n"
  + "╔═" + "".padStart(max_name_length - server.length,"═") + colourize(COLOUR.GREEN,9) + server + colourize(COLOUR.DEFAULT) + "═╗\n"
  + "╠═Info═════════╦═Stats═════════════════════╗\n"
  + "║ Rooted:    " + rooted + " ║ Difficulty: " + curr_diff + "/" + min_diff + " ║\n"
  + "║ Backdoor:  " + backdoored + " ║ Ram:    " + free_ram + "/" + max_ram + " ║\n"
  + "╠═Ports═(" + ports_opened + "/" + ports_needed + ")══╣ Money:   " + money_string + " ║\n"
  + "║ SSH:  "+ ssh_status +" ║ Hack Lvl:         " + hack_level + " ║\n"
  + "║ FTP:  "+ ftp_status +" ║ Growth Factor:   " + growth_fact + " ║\n"
  + "║ SMTP: "+ smtp_status + " ║ Cores:          " + cores + " cores ║\n"
  + "║ HTTP: "+ http_status + " ╠═══════════════════════════╝\n"
  + "║ SQL:  "+ sql_status +" ║\n"
  + "╚══════════════╝"
  )

  let min_diff_upg_needed  = Math.ceil(Math.log(1   /server_info.minDifficulty) / Math.log(0.98))
  let max_money_upg_needed = Math.ceil(Math.log(1e13/server_info.moneyMax     ) / Math.log(1.02))

  
  let total_production = 0
  if (ns.hacknet.numNodes() > 0) {
    for (let i = 0; i < ns.hacknet.numNodes(); i++) {
      total_production += ns.hacknet.getNodeStats(i).production
    }
    if (!(ns.hacknet.getNodeStats(0).cache === undefined)) {
      // Hashes are generated
      total_production = total_production * (1e6/4)
    }
  }

  if (server_info.moneyMax > 0) {
    ns.tprint("Target".padStart(8) + " | " + "Upgrades" + " | " + "Cost".padStart(10) + " | " + "Time")
    for (let target = 1e13; (target > server_info.moneyMax && target >= 0.01); target*0.1) {
      let upg_needed = Math.ceil(Math.log(target/server_info.moneyMax) / Math.log(1.02))
      let time_to_buy = total_production == 0 ? Infinity : ns.hacknet.hashCost("Increase Maximum Money", upg_needed) / (total_production / (1e6 / 4))

      let days = Math.floor(time_to_buy / (60*60*24))
      let hours = Math.floor((time_to_buy - (days * 60*60*24)) / (60*60))
      let minutes = Math.floor((time_to_buy - ((days * 60*60*24) + (hours * 60*60))) / (60))
      let seconds = time_to_buy - ((days * 60*60*24) + (hours * 60*60) + (minutes * 60))

      ns.tprint(
        ns.formatNumber(target).padStart(8) + " | "
      + ns.formatNumber(upg_needed,0,10000).padStart(8) + " | "
      + ns.formatNumber(ns.hacknet.hashCost("Increase Maximum Money", upg_needed),0,1e10).padStart(10) + " | "
      + (time_to_buy === Infinity ? "Infinity" : (days + "D " + hours.toString().padStart(2) + "h " + minutes.toString().padStart(2) + "m " + ns.formatNumber(seconds,0).padStart(2) + "s"))
      ) 
      target = target * 0.1
      await ns.sleep(10)
    }
  }

}

/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const arg_flags = ns.flags([ 
    ["rec_path","no"],
    ["report",""],
    ["port_info",""],
    ["server_info",""],
    ["bitnode_info",false],
    ["all_bitnode_info",false]
  ])
  var args_length = ns.args.length
  var unknown_param = false

  if (args_length > 0) {
    var i = 0
    while (i < args_length) {
      if (
            ns.args[i].slice(0,2) == "--"
        &&  ns.args[i] != "--rec_path"
        &&  ns.args[i] != "--report"
        &&  ns.args[i] != "--port_info"
        &&  ns.args[i] != "--server_info"
        &&  ns.args[i] != "--bitnode_info"
        &&  ns.args[i] != "--all_bitnode_info"
      ) {
        unknown_param = true
      }

      if (
            i > 0
        &&  ns.args[i-1] == "--report"
      ) {
        let report_args = ns.args[i].split(",")
        for (let report_arg of report_args) {
          if (  report_arg != "all"
            &&  report_arg != "rooted"
            &&  report_arg != "unrooted"
            &&  report_arg != "0_port"
            &&  report_arg != "1_port"
            &&  report_arg != "2_port"
            &&  report_arg != "3_port"
            &&  report_arg != "4_port"
            &&  report_arg != "5_port"
          ) {
            unknown_param = true
          }
        }
      }
      if (unknown_param) {
        ns.tprint("Unknown parameter with passed value \"" + ns.args[i] + "\"")
      }
      i += 1
    }
  }

  if (unknown_param) {
    ns.tprint("Correct Unknown Parameters before running again.")
    ns.exit()
  }
  
  let servers = scan_for_servers(ns)

  if (servers.includes(arg_flags.rec_path)) {

    let server  = arg_flags.rec_path
    let path_string = ""

    while (server != "home") {
      path_string = "connect " + server + "; " + path_string
      server = ns.scan(server)[0]
    }

    ns.tprint("home; " + path_string)
  }

  if (arg_flags.report != "") {
    let filter = {}
    let report_args = arg_flags.report.split(",")
    for (let report_arg of report_args) {
      switch (report_arg) {
        case "rooted":
          filter.rooted = "+"
          break
        case "unrooted":
          filter.rooted = "-"
          break
        case "0_port":
        case "1_port":
        case "2_port":
        case "3_port":
        case "4_port":
        case "5_port":
          let num_ports = report_arg.split("_",1)[0]
          //ns.tprint(num_ports)
          if (filter.ports_needed) {
            filter.ports_needed.push(parseInt(num_ports))
          }
          else {
            filter.ports_needed = [parseInt(num_ports)]
          }
          //ns.tprint(filter.ports_needed)
          break
      }
    }
    report_servers(ns, servers, filter)
  }

  if (arg_flags.port_info != "") {
    report_server_info_from_port(ns, arg_flags.port_info)
  }

  if (arg_flags.server_info) {
    await display_server_info(ns, servers, arg_flags.server_info)
  }

  if (arg_flags.bitnode_info) {
    display_bitnode_info(ns)
  }

  if (arg_flags.all_bitnode_info) {
    display_all_bitnode_info(ns)
  }
}