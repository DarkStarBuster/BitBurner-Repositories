import { PORT_IDS } from "/src/development/scripts/util/constant_utilities"

// Could be done with only one of larger/smaller but I like completeness.

// Larger : true if mult > default is beneficial, false otherwise
// Smaller: true if mult < default is beneficial, false otherwise
// Default: Should be treated as 1 if undefined. Gives the default value to compare to when deciding benificial modifiers.

export const bitnode_mults = {
  // Multipliers Influence how quickly the "Level" grows (not exp growth)
  HackingLevelMultiplier    : {larger: true, smaller: false},
  StrengthLevelMultiplier   : {larger: true, smaller: false},
  DefenseLevelMultiplier    : {larger: true, smaller: false},
  DexterityLevelMultiplier  : {larger: true, smaller: false},
  AgilityLevelMultiplier    : {larger: true, smaller: false},
  CharismaLevelMultiplier   : {larger: true, smaller: false},
  BladeburnerRank           : {larger: true, smaller: false},
  StaneksGiftPowerMultiplier: {larger: true, smaller: false},
  // Adjustments to base values
  AugmentationMoneyCost     : {larger: false, smaller: true},
  AugmentationRepCost       : {larger: false, smaller: true},
  ServerStartingSecurity    : {larger: false, smaller: true},
  ServerStartingMoney       : {larger: true, smaller: false},
  ServerMaxMoney            : {larger: true, smaller: false},
  StaneksGiftExtraSize      : {larger: true, smaller: false, default: 0},
  ServerGrowthRate          : {larger: true, smaller: false},
  ServerWeakenRate          : {larger: true, smaller: false},
  DaedalusAugsRequirement   : {larger: false, smaller: true, default: 30},
  PurchasedServerLimit      : {larger: true, smaller: false},
  RepToDonateToFaction      : {larger: false, smaller: true},
  CorporationDivisions      : {larger: true, smaller: false},
  CorporationValuation      : {larger: true, smaller: false},
  GangSoftcap               : {larger: true, smaller: false},
  // Costs for things
  FourSigmaMarketDataApiCost: {larger: false, smaller: true},
  FourSigmaMarketDataCost   : {larger: false, smaller: true},
  BladeburnerSkillCost      : {larger: false, smaller: true},
  HomeComputerRamCost       : {larger: false, smaller: true},
  PurchasedServerCost       : {larger: false, smaller: true},
  PurchasedServerMaxRam     : {larger: true, smaller: false},
  PurchasedServerSoftcap    : {larger: false, smaller: true},
  CorporationSoftcap        : {larger: true, smaller: false},
  // EXP/Rep/Money Gains
  FactionPassiveRepGain     : {larger: true, smaller: false},
  FactionWorkExpGain        : {larger: true, smaller: false},
  FactionWorkRepGain        : {larger: true, smaller: false},
  ScriptHackMoneyGain       : {larger: true, smaller: false},
  ScriptHackMoney           : {larger: true, smaller: false},
  ClassGymExpGain           : {larger: true, smaller: false},
  HackExpGain               : {larger: true, smaller: false},
  CompanyWorkExpGain        : {larger: true, smaller: false},
  InfiltrationMoney         : {larger: true, smaller: false},
  InfiltrationRep           : {larger: true, smaller: false},
  CrimeExpGain              : {larger: true, smaller: false},
  CrimeMoney                : {larger: true, smaller: false},
  ManualHackMoney           : {larger: true, smaller: false},
  CompanyWorkMoney          : {larger: true, smaller: false},
  CodingContractMoney       : {larger: true, smaller: false},
  HacknetNodeMoney          : {larger: true, smaller: false},
  // World Daemon Hack Level
  WorldDaemonDifficulty     : {larger: false, smaller: true},
  // No idea
  GangUniqueAugs            : {larger: true, smaller: false},
}


/** @param {import("@ns").NS} ns */
export async function main(ns) {
  const BITNODE_MULTS_HANDLER = ns.getPortHandle(PORT_IDS.BITNODE_MULTS_HANDLER)

  while(!BITNODE_MULTS_HANDLER.empty()) {
    BITNODE_MULTS_HANDLER.clear()
  }

  BITNODE_MULTS_HANDLER.write(
    JSON.stringify(ns.getBitNodeMultipliers())
  )
}