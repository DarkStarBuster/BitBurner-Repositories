import { ControlParameters } from "/src/scripts/core/util_control_parameters";
import { PORT_IDS } from "/src/scripts/boot/manage_ports"

// Turn on detailed debugs and step through (await 1s for each log)
const DEBUG = false

// Hardcoded since the number does not increase beyond 8 when you get SF10.3
const NUM_SLEEVES = 8;

class ProcessInfo {
  most_recent_action;
  last_ui_update;
  last_task_update;
  last_aug_update;

  player;
  crime_arr;
  crime_time;
  crime_karma;
  faction_work_arr;
  gym_class_arr;
  uni_class_arr

  /**
   * @param {import("@ns").NS} ns 
   */
  constructor(ns) {
    this.most_recent_action = 'Initialize'
    this.last_ui_update = 0
    this.last_task_update = 0
    this.last_aug_update = [0,0,0,0,0,0,0,0]
    this.crime_arr = []
    for (let crime in ns.enums.CrimeType) {
      this.crime_arr.push(ns.enums.CrimeType[crime])
    }
    this.crime_time = {
      "Shoplift"        : 2
     ,"Rob Store"       : 60
     ,"Mug"             : 4
     ,"Larceny"         : 90
     ,"Deal Drugs"      : 10
     ,"Bond Forgery"    : 300
     ,"Traffick Arms"   : 40
     ,"Homicide"        : 3
     ,"Grand Theft Auto": 80
     ,"Kidnap"          : 120
     ,"Assassination"   : 300
     ,"Heist"           : 600
    }
    this.crime_karma = {
      "Shoplift"        : 0.1
     ,"Rob Store"       : 0.5
     ,"Mug"             : 0.25
     ,"Larceny"         : 1.5
     ,"Deal Drugs"      : 0.5
     ,"Bond Forgery"    : 0.1
     ,"Traffick Arms"   : 1
     ,"Homicide"        : 3
     ,"Grand Theft Auto": 5
     ,"Kidnap"          : 6
     ,"Assassination"   : 10
     ,"Heist"           : 15
    }
    this.faction_work_arr = []
    for (let f_w in ns.enums.FactionWorkType) {
      this.faction_work_arr.push(ns.enums.FactionWorkType[f_w])
    }
    this.player = ns.getPlayer()
    this.gym_class_arr = []
    for (let g_c in ns.enums.GymType) {
      this.gym_class_arr.push(ns.enums.GymType[g_c])
    }
    this.uni_class_arr = []
    for (let u_c in ns.enums.UniversityClassType) {
      this.uni_class_arr.push(ns.enums.UniversityClassType[u_c])
    }
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {number} sleeve 
 * @param {string} faction 
 * @returns {boolean}
 */
function check_other_sleeves(ns, sleeve, faction) {
  for (let idx = 0; idx < NUM_SLEEVES; idx++) {
    if (idx == sleeve) {continue}
    let task = ns.sleeve.getTask(idx)
    if (task === null) {continue}
    if (task.type === "FACTION" && task.factionName === faction) {return true}
  }
  return false
}

/**
 * @param {string} message 
 */
async function log(ns, message) {
  if (DEBUG) {
    ns.print(`INFO: ${message}`)
    await ns.sleep(1000)
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {import("@ns").SleeveTask} task_a 
 * @param {import("@ns").SleeveTask} task_b 
 */
function are_same_task(ns, task_a, task_b) {
  //log(ns, `Checking if tasks are equal: A: ${task_a.type}, B: ${task_b.type}`)
  if (task_a === null || task_b === null) {return false}
  if (!(task_a.type === task_b.type)) {return false}
  switch (task_a.type) {
    case "SYNCHRO":
    case "RECOVERY":
      return true
    case "FACTION":
      return (
          task_a.factionName === task_b.factionName
      &&  task_a.factionWorkType === task_b.factionWorkType
      )
    case "COMPANY":
      return (
          task_a.companyName === task_b.companyName
      )
    case "CRIME":
      return (
          task_a.crimeType === task_b.crimeType
      )
    case "CLASS":
      return (
          task_a.location === task_b.location
      &&  task_a.classType === task_b.classType
      )
    default:
      return false
      break;
  }
}

/**
 * @param {import("@ns").SleeveTask} sleeve_task
 * @param {import("@ns").NS} ns 
 * @param {number} sleeve_idx
 * @param {ProcessInfo} prc_info
 * @param {ControlParameters} ctrl_param 
 */
function get_money_score(sleeve_task, ns, sleeve_idx, prc_info, ctrl_param) {
  //log(ns, `Getting Money Score for Task: ${sleeve_task.type}`)
  const slv = ns.sleeve.getSleeve(sleeve_idx)
  let res
  switch (sleeve_task.type) {
    case "CRIME":
      const cr = sleeve_task.crimeType
      const ws_a = ns.formulas.work.crimeGains(slv, cr) 
      const sc_a = ns.formulas.work.crimeSuccessChance(slv,cr)
      const t = prc_info.crime_time // Time in seconds
      res = ((ws_a.money * sc_a) / t[cr])
      //ns.tprint(`SLV: ${sleeve_idx}, CR: ${cr}, SCORE: ${((k[cr] * sc_a)/t[cr])}`)
      return res
    case "COMPANY":
      const comp = sleeve_task.companyName
      const job = prc_info.player.jobs[comp]
      res = (ns.formulas.work.companyGains(slv, comp, job, 0).money * 5) // Results is per 200ms update, x5 for per second
    case "CLASS":
    case "FACTION":
    default:
      return 0
  }
}

/**
 * @param {import("@ns").SleeveTask} sleeve_task
 * @param {import("@ns").NS} ns 
 * @param {number} sleeve_idx
 * @param {ProcessInfo} prc_info
 * @param {ControlParameters} ctrl_param 
 */
function get_karma_score(sleeve_task, ns, sleeve_idx, prc_info, ctrl_param) {
  //log(ns, `Getting Karma Score for Task: ${sleeve_task.type}`)
  const slv = ns.sleeve.getSleeve(sleeve_idx)
  let res
  switch (sleeve_task.type) {
    case "CRIME":
      let cr = sleeve_task.crimeType
      const sc_a = ns.formulas.work.crimeSuccessChance(slv,cr)
      const k = prc_info.crime_karma
      const t = prc_info.crime_time
      res = ((k[cr] * sc_a)/t[cr])
      //ns.tprint(`SLV: ${sleeve_idx}, CR: ${cr}, SCORE: ${((k[cr] * sc_a)/t[cr])}`)
      return res
    case "COMPANY":
    case "CLASS":
    case "FACTION":
    default:
      return 0
  }
}

/**
 * @param {import("@ns").SleeveTask} sleeve_task
 * @param {import("@ns").NS} ns 
 * @param {number} sleeve_idx
 * @param {ProcessInfo} prc_info
 * @param {ControlParameters} ctrl_param 
 */
function get_rep_score(sleeve_task, ns, sleeve_idx, prc_info, ctrl_param) {
  //log(ns, `Getting Rep Score for Task: ${sleeve_task.type}`)
  const slv = ns.sleeve.getSleeve(sleeve_idx)
  let res
  switch (sleeve_task.type) {
    case "COMPANY":
      res = (ns.formulas.work.companyGains(slv, sleeve_task.companyName, prc_info.player.jobs[sleeve_task.companyName], 0).reputation) * 1e9
      //ns.tprint(`SLV: ${sleeve_idx}, COM: ${sleeve_task.companyName}, JOB: ${prc_info.player.jobs[sleeve_task.companyName]}, REP: ${res}`)
      return res
    case "FACTION":
      res = 0
      if (  sleeve_task.factionName === ns.enums.FactionName.Netburners
        &&  !(sleeve_task.factionWorkType === ns.enums.FactionWorkType.hacking)
      ) {
        return res
      }
      res = (ns.formulas.work.factionGains(slv, sleeve_task.factionWorkType, 0).reputation) * 1e9
      //ns.tprint(`SLV: ${sleeve_idx}, FAC WORK: ${sleeve_task.factionWorkType}, REP: ${res}`)
      return res
    case "CRIME":
      const cr = sleeve_task.crimeType
      const ws = ns.formulas.work.crimeGains(slv, cr) 
      const sc = ns.formulas.work.crimeSuccessChance(slv,cr)
      const t = prc_info.crime_time // Time in seconds
      res = ((ws.money * sc) / t[cr]) * ((ws.agiExp * sc)/t[cr]) * ((ws.defExp * sc)/t[cr]) * ((ws.dexExp * sc)/t[cr]) * ((ws.strExp * sc)/t[cr])
      //ns.tprint(`SLV: ${sleeve_idx}, CR: ${cr}, SCORE: ${((k[cr] * sc_a)/t[cr])}`)
      return res
    case "CLASS":
    default:
      return 0
  }
}

/**
 * @param {import("@ns").NS} ns 
 * @param {ProcessInfo} prc_info
 * @param {ControlParameters} ctrl_param 
 * @returns {Promise<import("@ns").SleeveTask[]>}
 */
async function choose_optimal_sleeve_tasks(ns, prc_info, ctrl_param) {
  await log(ns, `Choosing Optimal Tasks`)
  /** @type {import("@ns").SleeveTask[]} */
  let return_val = []
  return_val.length = NUM_SLEEVES
  /** @type {[import("@ns").SleeveTask[]]} */
  let possible_choices = []
  possible_choices.length = NUM_SLEEVES
  // Loop over each Sleeve
  for (let idx = 0; idx < NUM_SLEEVES; idx++) {
    await log(ns, `Populating Possible Choices for Sleeve ${idx}`)
    if (possible_choices[idx] === undefined) {possible_choices[idx] = []}
    let sleeve_obj = ns.sleeve.getSleeve(idx)
    if (sleeve_obj.sync != 100) {
      possible_choices[idx].push({ type: "SYNCHRO" })
      continue
    }
    if (sleeve_obj.shock > 98) {
      possible_choices[idx].push({ type: "RECOVERY" })
      continue
    }
    for (let crime of prc_info.crime_arr) {
      possible_choices[idx].push({
        type: "CRIME"
       ,crimeType: crime
       ,cyclesWorked: 0
       ,cyclesNeeded: 0
       ,tasksCompleted: 0
      })
    }
    for (let faction of prc_info.player.factions.filter(faction => faction != ctrl_param.gang_mgr.gang_faction)) {
      for (let work of prc_info.faction_work_arr) {
        switch (work) {
          case ns.enums.FactionWorkType.field:
            if (  faction === ns.enums.FactionName.BitRunners
              ||  faction === ns.enums.FactionName.CyberSec
              ||  faction === ns.enums.FactionName.NiteSec
              ||  faction === ns.enums.FactionName.Netburners
              ||  faction === ns.enums.FactionName.TianDiHui
            ) {
              continue
            }
            break;
          case ns.enums.FactionWorkType.hacking:
            if (  faction === ns.enums.FactionName.Tetrads
            ) {
              continue
            }
            break
          case ns.enums.FactionWorkType.security:
            if (  faction === ns.enums.FactionName.BitRunners
              ||  faction === ns.enums.FactionName.TheBlackHand
              ||  faction === ns.enums.FactionName.TheCovenant
              ||  faction === ns.enums.FactionName.CyberSec
              ||  faction === ns.enums.FactionName.Daedalus
              ||  faction === ns.enums.FactionName.TheDarkArmy
              ||  faction === ns.enums.FactionName.Illuminati
              ||  faction === ns.enums.FactionName.NiteSec
              ||  faction === ns.enums.FactionName.Netburners
            ) {
              continue
            }
            break
        }
        possible_choices[idx].push({
          type: "FACTION"
         ,factionWorkType: work
         ,factionName: faction
        })
      }
    }
    for (let company in prc_info.player.jobs) {
      possible_choices[idx].push({
        type: "COMPANY"
       ,companyName: company
      })
    }
    for (let gym_class of prc_info.gym_class_arr) {
      let ln = ns.enums.LocationName
      for (let loc of [ln.AevumCrushFitnessGym, ln.AevumSnapFitnessGym, ln.Sector12IronGym, ln.Sector12PowerhouseGym, ln.VolhavenMilleniumFitnessGym]) {
        possible_choices[idx].push({
          type: "CLASS"
        ,classType: gym_class
        ,location: loc
        })
      }
    }
    for (let uni_class of prc_info.uni_class_arr) {
      let ln = ns.enums.LocationName
      for (let loc of [ln.AevumSummitUniversity, ln.AevumSummitUniversity, ln.VolhavenZBInstituteOfTechnology]) {
        possible_choices[idx].push({
          type: "CLASS"
        ,classType: uni_class
        ,location: loc
        })
      }
    }
  }
  // All choices now put into arrays

  // Loop over each Sleeve
  for (let idx = 0; idx < NUM_SLEEVES; idx++) {
    await log(ns, `Choosing most optimal choice for Sleeve ${idx}`)
    let choices = possible_choices[idx]
    if (choices.length === 0) {ns.tprint(`ERROR: Zero length choice array`)}
    if (choices.length === 1) {return_val[idx] = choices[0]; continue}
    await log(ns, `After Single Choices for ${idx}`)
    // Exclude already choosen tasks that can't be shared
    let filtered_choices = choices.filter(
      function(task) {
        if(   (task.type === "COMPANY" && return_val.some(t => (t.type === "COMPANY" && t.companyName === task.companyName)))
          ||  (task.type === "FACTION" && return_val.some(t => (t.type === "FACTION" && t.factionName === task.factionName)))
        ) {
          return false
        }
        return true
      }
    )
    if (filtered_choices.length === 0) {ns.tprint(`ERROR: Zero length filtered_choice array`)}
    await log(ns, `After Exclusions for ${idx}`)
    
    // Negative Result means a before b
    // Zero Result means no change
    // Positive Result means b before a
    if (!(ctrl_param.player_mgr.desire === undefined)) {
      switch (ctrl_param.player_mgr.desire) {
        case "gang":
          await log(ns, `Get Karma Scores for ${idx}`)
          filtered_choices.sort(
            function(a,b) {
              let a_score = get_karma_score(a, ns, idx, prc_info, ctrl_param)
              let b_score = get_karma_score(b, ns, idx, prc_info, ctrl_param)
              return b_score - a_score
            }
          )
          break
        case "rep":
          await log(ns, `Get Reputation Scores for ${idx}`)
          filtered_choices.sort(
            function(a,b) {
              let a_score = get_rep_score(a, ns, idx, prc_info, ctrl_param)
              let b_score = get_rep_score(b, ns, idx, prc_info, ctrl_param)
              return b_score - a_score
            }
          )
          break
        case "money":
          filtered_choices.sort(
            function (a,b) {
              let a_score = get_money_score(a, ns, idx, prc_info, ctrl_param)
              let b_score = get_money_score(b, ns, idx, prc_info, ctrl_param)
              return b_score - a_score
            }
          )
          break
        default:
          break
      }
    }
    
    return_val[idx] = filtered_choices[0]
  }

  return Promise.resolve(return_val)
}


/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const CONTROL_PARAM_HANDLER = ns.getPortHandle(PORT_IDS.CONTROL_PARAM_HANDLER)
  // let BITNODE_MULTS_HANDLER = ns.getPortHandle(PORT_IDS.BITNODE_MULTS_HANDLER)


  // Get Control Parameters
  while (CONTROL_PARAM_HANDLER.empty()) {await ns.sleep(400)}
  /** @type {ControlParameters} */
  let ctrl_param = JSON.parse(CONTROL_PARAM_HANDLER.peek())
  let prc_info = new ProcessInfo(ns)

  ns.disableLog("ALL")
  if (DEBUG) {ns.ui.openTail()}

  while (true) {
    await log(ns, `Start Loop`)
    let karma = ns.heart.break()
    prc_info.player = ns.getPlayer()
    await log(ns, `Check Ctrl Param Handler`)
    if (!CONTROL_PARAM_HANDLER.empty()) {
      ctrl_param = JSON.parse(CONTROL_PARAM_HANDLER.peek())
    }
    await log(ns, `After Ctrl Param Handler Check`)

    // if (prc_info.last_ui_update + (1000 * 120) < performance.now()) {
    //   let sleeve_task_choices = await choose_optimal_sleeve_tasks(ns, prc_info, ctrl_param)
    //   //ns.tprint(sleeve_task_choices)
    //   prc_info.last_ui_update = performance.now()
    // }

    
    await log(ns, `Before Choices`)
    /** @type {import("@ns").SleeveTask[]} */
    let sleeve_task_choices = await choose_optimal_sleeve_tasks(ns, prc_info, ctrl_param)
    // ns.tprint(sleeve_task_choices)
    await log(ns, `After Choices`)
    // Loop over each Sleeve
    for (let idx = 0; idx < NUM_SLEEVES; idx++) {
      await log(ns, `Loop over Sleeve ${idx}`)
      let sleeve_obj = ns.sleeve.getSleeve(idx)

      // Do we install augments?
      if (prc_info.last_aug_update[idx] + (1000 * 60) < performance.now()) {
        prc_info.last_aug_update[idx] = performance.now()
        if (sleeve_obj.shock === 0) {
          let sleeve_augs = ns.sleeve.getSleevePurchasableAugs(idx)
          /** @type {import("@ns").AugmentPair[]} */
          let to_purch = []
          for (let aug of sleeve_augs) {
            if (aug.cost < (ctrl_param.player_mgr.total_income * 10)) { // If the aug costs less than 10 seconds of our total incomce we can afford it.
              to_purch.push(aug)
            }
            await ns.sleep(4)
          }
          // Negative Result means a before b
          // Zero Result means no change
          // Positive Result means b before a
          to_purch.sort((a,b) => a.cost - b.cost)
          for (let aug of to_purch) {
            while (prc_info.player.money < aug.cost) {await ns.sleep(10000)}
            ns.sleeve.purchaseSleeveAug(idx, aug.name)
            await ns.sleep(4)
          }
        }
      }

      await log(ns, `After Augs for ${idx}`)
      // Get Current Task
      let curr_task = ns.sleeve.getTask(idx)
      let chos_task = sleeve_task_choices[idx]

      if (are_same_task(ns, curr_task, chos_task)) {} // No need to set the Sleeve to the same task it is already doing
      else {
        await log(ns, `Apply Optimal Choice for ${idx}`)
        switch (chos_task.type) {
          case "SYNCHRO":
            await log(ns, `Synchronize for ${idx}`)
            ns.sleeve.setToSynchronize(idx)
            break;
          case "RECOVERY":
            await log(ns, `Recovery for ${idx}`)
            ns.sleeve.setToShockRecovery(idx)
            break;
          case "CLASS":
            await log(ns, `Class for ${idx}`)
            if (prc_info.gym_class_arr.includes(chos_task.classType)) {
              ns.sleeve.setToGymWorkout(idx, chos_task.location, chos_task.classType)
            }
            else {
              ns.sleeve.setToUniversityCourse(idx, chos_task.location, chos_task.classType)
            }
            break;
          case "COMPANY":
            await log(ns, `Company for ${idx}: ${chos_task.companyName}`)
            for (let idx2 = 0; idx2 < NUM_SLEEVES; idx2++) {
              if (idx2 === idx) {continue}
              let oth_sleeve_task = ns.sleeve.getTask(idx2)
              if (oth_sleeve_task.type === "COMPANY" && oth_sleeve_task.companyName === chos_task.companyName) {
                ns.sleeve.setToCommitCrime(idx2, ns.enums.CrimeType.mug)
                break
              }
            }
            ns.sleeve.setToCompanyWork(idx, chos_task.companyName)
            break;
          case "CRIME":
            await log(ns, `Crime for ${idx}`)
            ns.sleeve.setToCommitCrime(idx, chos_task.crimeType)
            break;
          case "FACTION":
            await log(ns, `Faction for ${idx}: ${chos_task.factionName}, ${chos_task.factionWorkType}`)
            for (let idx2 = 0; idx2 < NUM_SLEEVES; idx2++) {
              if (idx2 === idx) {continue}
              let oth_sleeve_task = ns.sleeve.getTask(idx2)
              if (oth_sleeve_task.type === "FACTION" && oth_sleeve_task.factionName === chos_task.factionName) {
                ns.sleeve.setToCommitCrime(idx2, ns.enums.CrimeType.mug)
                break
              }
            }
            ns.sleeve.setToFactionWork(idx, chos_task.factionName, chos_task.factionWorkType)
            break
          case "BLADEBURNER":
          case "INFILTRATE":
          case "SUPPORT":
          default:
            await log(ns, `Default for ${idx}`)
            ns.sleeve.setToCommitCrime(idx, "Mug") // Backup Option!
            break;
        }
      }


      // if (sleeve_obj.sync < 100) {
      //   if (!(task != null && task.type === "SYNCHRO")) {
      //     let result = ns.sleeve.setToSynchronize(idx)
      //     if (result) {ns.tprint(`INFO: Set Sleeve '${idx}' to Synchronize`); continue}
      //   }
      //   continue
      // }

      // if (!ctrl_param.gang_mgr.created) {
      //   // DO CRIME FOR KARMA!
      //   let relv_crime = prc_info.crime_arr.slice().sort(
      //     function(c_a, c_b) {
      //       const ws_a = ns.formulas.work.crimeGains(sleeve_obj,c_a)
      //       const ws_b = ns.formulas.work.crimeGains(sleeve_obj,c_b)
      //       const sc_a = ns.formulas.work.crimeSuccessChance(sleeve_obj,c_a)
      //       const sc_b = ns.formulas.work.crimeSuccessChance(sleeve_obj,c_b)
      //       const k = prc_info.crime_karma
      //       const t = prc_info.crime_time
      //       // Negative Result means a before b
      //       // Zero Result means no change
      //       // Positive Result means b before a
      //       let c_a_score = ((k[c_a] * sc_a)/t[c_a])
      //       let c_b_score = ((k[c_b] * sc_b)/t[c_b])
      //       return c_b_score - c_a_score
      //     }
      //   )

      //   let best_crime = relv_crime[0]
      //   if (task != null && task.type === "CRIME" && task.crimeType === best_crime) {continue}
      //   else {
      //     let result = ns.sleeve.setToCommitCrime(idx, best_crime)
      //     if (result) {
      //       ns.tprint(`INFO: Set Sleeve '${idx}' to Commit Crime '${best_crime}'.`)
      //     }
      //     continue
      //   }
      // }

      // if (prc_info.player.money < 1e5) {
      //   let relv_crime = prc_info.crime_arr.slice().sort(
      //     function(c_a, c_b) {
      //       const ws_a = ns.formulas.work.crimeGains(sleeve_obj,c_a)
      //       const ws_b = ns.formulas.work.crimeGains(sleeve_obj,c_b)
      //       const sc_a = ns.formulas.work.crimeSuccessChance(sleeve_obj,c_a)
      //       const sc_b = ns.formulas.work.crimeSuccessChance(sleeve_obj,c_b)
      //       const t = prc_info.crime_time
      //       // Negative Result means a before b
      //       // Zero Result means no change
      //       // Positive Result means b before a
      //       let c_a_score = ((ws_a.agiExp * sc_a)/t[c_a]) * ((ws_a.defExp * sc_a)/t[c_a]) * ((ws_a.dexExp * sc_a)/t[c_a]) * ((ws_a.strExp * sc_a)/t[c_a]) * ((ws_a.money * sc_a) / t[c_a])
      //       let c_b_score = ((ws_b.agiExp * sc_b)/t[c_b]) * ((ws_b.defExp * sc_b)/t[c_b]) * ((ws_b.dexExp * sc_b)/t[c_b]) * ((ws_b.strExp * sc_b)/t[c_b]) * ((ws_b.money * sc_b) / t[c_b])
      //       return (c_b_score - c_a_score)
      //     }
      //   )
      //   let best_crime = relv_crime[0]
      //   if (task != null && task.type === "CRIME" && task.crimeType === best_crime) {}
      //   else {
      //     let result = ns.sleeve.setToCommitCrime(idx, best_crime)
      //     if (result) {
      //       ns.tprint(`INFO: Set Sleeve '${idx}' to Commit Crime '${best_crime}'.`)
      //     }
      //     continue
      //   }
      // }

      // let sorted_work = prc_info.faction_work_arr.slice().sort(
      //   function(w_a, w_b) {
      //     const ws_a = ns.formulas.work.factionGains(sleeve_obj, w_a, 0)
      //     const ws_b = ns.formulas.work.factionGains(sleeve_obj, w_b, 0)
      //     // Negative Result means a before b
      //     // Zero Result means no change
      //     // Positive Result means b before a
      //     let w_a_score = ws_a.reputation
      //     let w_b_score = ws_b.reputation
      //     return w_b_score - w_a_score
      //   }
      // )

      // if (task != null && task.type === "FACTION" && task.factionWorkType === sorted_work[0]) {continue}
      // else {
      //   // DO FACTION WORK!

      //   let result = false
      //   for (let work of sorted_work) {
      //     if (result) {
      //       continue
      //     }
      //     for (let faction of prc_info.player.factions.filter(faction => faction != ctrl_param.gang_mgr.gang_faction)) {
      //       let check = check_other_sleeves(ns, idx, faction)
      //       if (check) {continue}
      //       if (result) {continue}
      //       if (task.factionName == faction && task.factionWorkType == work) {result = true; continue}
      //       try {
      //         result = ns.sleeve.setToFactionWork(idx, faction, work)
      //       } catch (error) {
      //         ns.tprint(error)
      //         continue
      //       }
      //       if (result) {
      //         ns.tprint(`INFO: Set Sleeve' ${idx}' to Work for '${faction}' doing '${work}'.`)
      //       }
      //     }
      //   }
      //   if (result) {
      //     continue
      //   }
      // }

      // if (task == null) {
      //   let result = ns.sleeve.setToUniversityCourse(idx, "Rothman University", "Computer Science")
      //   if (result) {
      //     continue
      //   }
      // }

      // if (task.type == "CLASS" || task.type == "FACTION" || (task.type == "CRIME" && prc_info.player.money < 1e7)) {}
      // else {
      //   let result = ns.sleeve.setToUniversityCourse(idx, "Rothman University", "Computer Science")
      //   if (result) {
      //     continue
      //   }
      // }
    }

    // Sleeves don't need high update fidelity.
    await ns.sleep(1000)
  }
  // ns.sleeve.getSleeve()
  // ns.sleeve.getSleeveAugmentationPrice()
  // ns.sleeve.getSleeveAugmentationRepReq()
  // ns.sleeve.getSleeveAugmentations()
  // ns.sleeve.getSleevePurchasableAugs()
  // ns.sleeve.getTask()
  // ns.sleeve.purchaseSleeveAug()
  // ns.sleeve.setToBladeburnerAction()
  // ns.sleeve.setToCommitCrime()
  // ns.sleeve.setToCompanyWork()
  // ns.sleeve.setToFactionWork()
  // ns.sleeve.setToGymWorkout()
  // ns.sleeve.setToIdle()
  // ns.sleeve.setToShockRecovery()
  // ns.sleeve.setToSynchronize()
  // ns.sleeve.setToUniversityCourse()
  // ns.sleeve.travel()
}