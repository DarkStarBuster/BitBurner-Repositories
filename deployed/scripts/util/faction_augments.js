const FACTION_NAMES = [
  // Hacknet
  "Netburners"
  // Backdoors
 ,"CyberSec"
 ,"NiteSec"
 ,"The Black Hand"
  // Western Cities
 ,"Sector-12" 
 ,"Aevum"
  // Eastern Cities 
 ,"Chongqing"
 ,"Ishima"
 ,"New Tokyo"
 ,"Tian Di Hui"
  // Other Cities
 ,"Volhaven"
]

const AUGMENT_NAMES = [
  // NeuroFlux Governor
  "NeuroFlux Governor"
  // Hacknet
 ,"Hacknet Node NIC Architecture Neural-Upload"
 ,"Hacknet Node Cache Architecture Neural-Upload"
 ,"Hacknet Node CPU Architecture Neural-Upload"
 ,"Hacknet Node Kernel Direct-Neural Interface"
 ,"Hacknet Node Core Direct-Neural Interface"
  // Hacking
 ,"BitWire"
 ,"Cranial Signal Processors - Gen I"
 ,"Cranial Signal Processors - Gen II"
 ,"Cranial Signal Processors - Gen III"
 ,"Cranial Signal Processors - Gen IV"
 ,"DataJack"
 ,"CRTX42-AA Gene Modification"
 ,"Embedded Netburner Module"
 ,"Embedded Netburner Module Core Implant"
 ,"Neural-Retention Enhancement"
 ,"Artificial Synaptic Potentiation"
 ,"Synaptic Enhancement Implant"
 ,"Enhanced Myelin Sheathing"
 ,"Neuralstimulator"
  // Charisma
 ,"Speech Processor Implant"
  // Combat
 ,"Nanofiber Weave"
 ,"Wired Reflexes"
 ,"Combat Rib I"
 ,"Augmented Targeting I"
 ,"Augmented Targeting II"
  // All Skills
 ,"Neurotrainer I"
 ,"Neurotrainer II"
  // Reputation
 ,"Neuroreceptor Management Implant"
 ,"Social Negotiation Assistant (S.N.A)"
 ,"ADR-V1 Pheromone Gene"
 ,"Nuoptimal Nootropic Injector Implant"
 ,"Speech Enhancement"
]

const AUGMENT_CATEGORIES = [
  "NeuroFlux"
 ,"HackNet"
 ,"Hacking"
 ,"Strength"
 ,"Defense"
 ,"Dexterity"
 ,"Agility"
 ,"Charisma"
 ,"All Skills"
 ,"Reputation"
 ,"Crime"
]

// /**
//  *  @type {{
//  *    AUGMENT_NAMES: {
//  *      base_cost: number
//  *      base_rep: number
//  *      unique: boolean
//  *      restricted: boolean
//  *      categories: string[]
//  *      factions: string[]
//  *      prereq: string[]
//  *    }
//  *  }}
//  */
const AUGMENT_DETAILS = {
  "NeuroFlux Governor": {
    base_cost: 750000
   ,base_rep: Infinity
   ,unique: false
   ,restricted: false
   ,categories: ["NeuroFlux"]
  }
 ,"Hacknet Node NIC Architecture Neural-Upload": {
    base_cost: 4500000
   ,base_rep: Infinity
   ,unique: true
   ,restricted: true
   ,categories: ["HackNet"]
   ,factions: ["Netburners"]
  }
 ,"Hacknet Node Cache Architecture Neural-Upload": {
    base_cost: 5500000
   ,base_rep: Infinity
   ,unique: true
   ,restricted: true
   ,categories: ["HackNet"]
   ,factions: ["Netburners"]
  }
 ,"Hacknet Node CPU Architecture Neural-Upload": {
    base_cost: 11000000
   ,base_rep: Infinity
   ,unique: true
   ,restricted: true
   ,categories: ["HackNet"]
   ,factions: ["Netburners"]
  }
 ,"Hacknet Node Kernel Direct-Neural Interface": {
    base_cost: 40000000
   ,base_rep: Infinity
   ,unique: true
   ,restricted: true
   ,categories: ["HackNet"]
   ,factions: ["Netburners"]
  }
 ,"Hacknet Node Core Direct-Neural Interface": {
    base_cost: 60000000
   ,base_rep: Infinity
   ,unique: true
   ,restricted: true
   ,categories: ["HackNet"]
   ,factions: ["Netburners"]
  }
 ,"BitWire": {
    base_cost: 10000000
   ,base_rep: Infinity
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["CyberSec","NiteSec"]
  }
 ,"Cranial Signal Processors - Gen I": {
    base_cost: 70000000
   ,base_rep: Infinity
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["CyberSec","NiteSec"]
  }
 ,"Cranial Signal Processors - Gen II": {
    base_cost: 125000000
   ,base_rep: Infinity
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["CyberSec","NiteSec"]
   ,prereq: ["Cranial Signal Processors - Gen I"]
  }
 ,"Cranial Signal Processors - Gen III": {
    base_cost: 550000000
   ,base_rep: 50000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["NiteSec","The Black Hand"]
   ,prereq: ["Cranial Signal Processors - Gen II"]
  }
 ,"Cranial Signal Processors - Gen IV": {
    base_cost: 1100000000
   ,base_rep: 125000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["The Black Hand"]
   ,prereq: ["Cranial Signal Processors - Gen III"]
   }
 ,"DataJack": {
    base_cost: 450000000
   ,base_rep: 112500
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["NiteSec", "New Tokyo","Chongqing","The Black Hand"]
  }
 ,"CRTX42-AA Gene Modification": {
    base_cost: 225000000
   ,base_rep: 45000
   ,unique: true
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["NiteSec"]
  }
 ,"Neural-Retention Enhancement": {
    base_cost: 250000000
   ,base_rep: 20000
   ,unique: true
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["NiteSec"]
  }
 ,"Neuregen Gene Modification": {
    base_cost: 3000000000
   ,base_rep: 50000
   ,unique: true
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["Chongqing"]
  }
 ,"Embedded Netburner Module": {
    base_cost: 250000000
   ,base_rep: 15000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["NiteSec","The Black Hand"]
  }
 ,"Embedded Netburner Module Core Implant": {
    base_cost: 2500000000
   ,base_rep: 175000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["The Black Hand"]
  }
 ,"Artificial Synaptic Potentiation": {
    base_cost: 80000000
   ,base_rep: 6250
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["NiteSec","The Black Hand"]
  }
 ,"Synaptic Enhancement Implant": {
    base_cost: 7500000
   ,base_rep: 2000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["CyberSec"]
  }
 ,"Enhanced Myelin Sheathing": {
    base_cost: 1375000000
   ,base_rep: 100000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["The Black Hand"]
  }
 ,"The Black Hand": {
    base_cost: 550000000
   ,base_rep: 100000
   ,unique: true
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["The Black Hand"]
  }
 ,"Neuralstimulator": {
    base_cost: 3000000000
   ,base_rep: 50000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["Sector-12","Ishima","New Tokyo","Chongqing","The Black Hand"]
  }
 ,"Neurotrainer I": {
    base_cost: 4000000
   ,base_rep: Infinity
   ,unique: false
   ,restricted: true
   ,categories: ["All Skills"]
   ,factions: ["CyberSec"]
  }
 ,"Neurotrainer II": {
    base_cost: 45000000
   ,base_rep: 10000
   ,unique: false
   ,restricted: true
   ,categories: ["All Skills"]
   ,factions: ["NiteSec"]
  }
 ,"Neuroreceptor Management Implant": {
    base_cost: 550000000
   ,base_rep: Infinity
   ,unique: true
   ,restricted: true
   ,categories: ["Reputation"]
   ,factions: ["Tian Di Hui"]
  }
 ,"Social Negotiation Assistant (S.N.A)": {
    base_cost: 30000000
   ,base_rep: Infinity
   ,unique: true
   ,restricted: true
   ,categories: ["Reputation"]
   ,factions: ["Tian Di Hui"]
  }
 ,"ADR-V1 Pheromone Gene": {
    base_cost: 17500000
   ,base_rep: Infinity
   ,unique: false
   ,restricted: true
   ,categories: ["Reputation"]
   ,factions: ["Tian Di Hui"]
  }
 ,"Nanofiber Weave": {
    base_cost: 125000000
   ,base_rep: 37500
   ,unique: false
   ,restricted: true
   ,categories: ["Strength","Defense"]
   ,factions: ["Tian Di Hui"]
  }
 ,"Speech Processor Implant": {
    base_cost: 50000000
   ,base_rep: 7500
   ,unique: false
   ,restricted: true
   ,categories: ["Charisma"]
   ,factions: ["Tian Di Hui","Sector-12","Ishima","New Tokyo","Chongqing"]
  }
 ,"Nuoptimal Nootropic Injector Implant": {
    base_cost: 20000000
   ,base_rep: 5000
   ,unique: false
   ,restricted: true
   ,categories: ["Reputation"]
   ,factions: ["Tian Di Hui","New Tokyo","Chongqing"]
  }
 ,"Speech Enhancement": {
    base_cost: 12500000
   ,base_rep: 2500
   ,unique: false
   ,restricted: true
   ,categories: ["Reputation","Charisma"]
   ,factions: ["Tian Di Hui"]
  }
 ,"Wired Reflexes": {
    base_cost: 2500000
   ,base_rep: 1250
   ,unique: false
   ,restricted: true
   ,categories: ["Dexterity","Agility"]
   ,factions: ["Tian Di Hui","Sector-12","Ishima"]
  }
 ,"INFRARET Enhancement": {
    base_cost: 30000000
   ,base_rep: 7500
   ,unique: true
   ,restricted: true
   ,categories: ["Dexterity","Crime"]
   ,factions: ["Ishima"]
  }
 ,"Combat Rib I": {
    base_cost: 23750000
   ,base_rep: 7500
   ,unique: false
   ,restricted: true
   ,categories: ["Strength","Defense"]
   ,factions: ["Ishima"]
  }
 ,"Augmented Targeting I": {
    base_cost: 15000000
   ,base_rep: 5000
   ,unique: false
   ,restricted: true
   ,categories: ["Dexterity"]
   ,factions: ["Sector-12","Ishima"]
  }
 ,"Augmented Targeting II": {
    base_cost: 42500000
   ,base_rep: 8750
   ,unique: false
   ,restricted: true
   ,categories: ["Dexterity"]
   ,factions: ["Sector-12"]
   ,prereq: ["Augmented Targeting I"]
  }
 ,"NutriGen Implant": {
    base_cost: 2500000
   ,base_rep: 6250
   ,unique: true
   ,restricted: true
   ,categories: ["Strength","Defense","Dexterity","Agility"]
  }
}