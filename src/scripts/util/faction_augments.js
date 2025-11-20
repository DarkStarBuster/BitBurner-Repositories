const FACTION_NAMES = [
  // Hacknet
  "Netburners"
  // Backdoors
 ,"CyberSec"
 ,"NiteSec"
 ,"The Black Hand"
 ,"BitRunners"
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
  // Corporations
 ,"MegaCorp"
 //,"Global Pharmaceuticals" -- Has no faction.
 //,"Omega Software" -- Has no faction
 ,"Four Sigma"
 ,"OmniTek Incorporated"
  // Criminal?
 ,"Slum Snakes"
 ,"Tetrads"
 ,"The Syndicate"
 ,"Speakers for the Dead"
 ,"The Dark Army"
  // Endgame
 ,"Daedalus"
 ,"The Covenant"
 ,"Illuminati"
]

const AUGMENT_NAMES = [
  // Special
  "The Red Pill"
  // NeuroFlux Governor
 ,"NeuroFlux Governor"
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
 ,"Cranial Signal Processors - Gen V"
 ,"Neural Accelerator"
 ,"Artificial Bio-neural Network Implant"
 ,"DataJack"
 ,"CRTX42-AA Gene Modification"
 ,"Embedded Netburner Module"
 ,"Embedded Netburner Module Analyze Engine"
 ,"Embedded Netburner Module Core Implant"
 ,"Embedded Netburner Module Core V2 Upgrade"
 ,"Embedded Netburner Module Core V3 Upgrade"
 ,"Embedded Netburner Module Direct Memory Access Upgrade"
 ,"Neural-Retention Enhancement"
 ,"Artificial Synaptic Potentiation"
 ,"Synaptic Enhancement Implant"
 ,"Enhanced Myelin Sheathing"
 ,"Neuralstimulator"
 ,"BitRunners Neurolink"
 ,"PC Direct-Neural Interface"
 ,"OmniTek InfoLoad"
  // Charisma
 ,"Speech Processor Implant"
 ,"Enhanced Social Interaction Implant"
  // Combat
 ,"Nanofiber Weave"
 ,"Wired Reflexes"
 ,"INFRARET Enhancement"
 ,"LuminCloaking-V1 Skin Implant"
 ,"LuminCloaking-V2 Skin Implant"
 ,"SmartSonar Implant"
 ,"BrachiBlades"
 ,"Graphene BrachiBlades Upgrade"
 ,"Combat Rib I"
 ,"Combat Rib II"
 ,"Combat Rib III"
 ,"DermaForce Particle Barrier"
 ,"Augmented Targeting I"
 ,"Augmented Targeting II"
 ,"Augmented Targeting III"
 ,"HemoRecirculator"
 ,"Bionic Arms"
 ,"Graphene Bionic Arms Upgrade"
 ,"Bionic Spine"
 ,"Bionic Legs"
 ,"Graphene Bionic Legs Upgrade"
 ,"Graphene Bone Lacings"
 ,"CordiARC Fusion Reactor"
 ,"Synfibril Muscle"
 ,"Synthetic Heart"
 ,"NEMEAN Subdermal Weave"
 ,"NutriGen Implant"
 ,"SPTN-97 Gene Modification"
  // All Skills
 ,"Neurotrainer I"
 ,"Neurotrainer II"
 ,"Neurotrainer III"
 ,"Power Recirculation Core"
 ,"Unstable Circadian Modulator"
  // Reputation
 ,"Neuroreceptor Management Implant"
 ,"Social Negotiation Assistant (S.N.A)"
 ,"ADR-V1 Pheromone Gene"
 ,"ADR-V2 Pheromone Gene"
 ,"The Shadow's Simulacrum"
 ,"Nuoptimal Nootropic Injector Implant"
 ,"Speech Enhancement"
 ,"FocusWire"
 ,"PCMatrix"
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
 ,"Work"
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
  "The Red Pill": {
    base_cost: 0
   ,base_rep: 2500000
   ,unique: true
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["Daedalus"]  
  }
 ,"NeuroFlux Governor": {
    base_cost: 750000
   ,base_rep: 500
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
   ,base_rep: 3750
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["CyberSec","NiteSec"]
  }
 ,"Cranial Signal Processors - Gen I": {
    base_cost: 70000000
   ,base_rep: 10000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["CyberSec","NiteSec"]
  }
 ,"Cranial Signal Processors - Gen II": {
    base_cost: 125000000
   ,base_rep: 18750
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
   ,factions: ["NiteSec","The Black Hand","BitRunners"]
   ,prereq: ["Cranial Signal Processors - Gen II"]
  }
 ,"Cranial Signal Processors - Gen IV": {
    base_cost: 1100000000
   ,base_rep: 125000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["The Black Hand","BitRunner"]
   ,prereq: ["Cranial Signal Processors - Gen III"]
  }
 ,"Cranial Signal Processors - Gen V": {
    base_cost: 2250000000
   ,base_rep: 250000
   ,unique: true
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["BitRunners"]
   ,prereq: ["Cranial Signal Processors - Gen IV"]
  }
 ,"Neural Accelerator": {
    base_cost: 1750000000
   ,base_rep: 200000
   ,unique: true
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["BitRunners"]
  }
 ,"Artificial Bio-neural Network Implant": {
    base_cost: 3000000000
   ,base_rep: 275000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["BitRunners"]
  }
 ,"DataJack": {
    base_cost: 450000000
   ,base_rep: 112500
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["NiteSec", "New Tokyo","Chongqing","The Black Hand","BitRunners"]
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
   ,factions: ["NiteSec","The Black Hand","BitRunners","MegaCorp"]
  }
 ,"Embedded Netburner Module Analyze Engine": {
    base_cost: 6000000000
   ,base_rep: 625000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["MegaCorp","Daedalus","The Covenant","Illuminati"]
   ,prereq: ["Embedded Netburner Module"]
  }
 ,"Embedded Netburner Module Core Implant": {
    base_cost: 2500000000
   ,base_rep: 175000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["The Black Hand","BitRunners","MegaCorp"]
   ,prereq: ["Embedded Netburner Module"]
  }
 ,"Embedded Netburner Module Core V2 Upgrade": {
    base_cost: 4500000000
   ,base_rep: 1000000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["BitRunners","MegaCorp","OmniTek Incorporated"]
   ,prereq: ["Embedded Netburner Module Core Implant"]
  }
 ,"Embedded Netburner Module Core V3 Upgrade": {
    base_cost: 7500000000
   ,base_rep: 1750000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["MegaCorp","Daedalus","The Covenant","Illuminati"]
   ,prereq: ["Embedded Netburner Module Core V2 Upgrade"]
  }
 ,"Embedded Netburner Module Direct Memory Access Upgrade": {
    base_cost: 7000000000
   ,base_rep: 1000000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["MegaCorp","Daedalus","The Covenant","Illuminati"]
   ,prereq: ["Embedded Netburner Module"]
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
   ,factions: ["CyberSec","Aevum"]
  }
 ,"Enhanced Myelin Sheathing": {
    base_cost: 1375000000
   ,base_rep: 100000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["The Black Hand","BitRunners"]
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
   ,factions: ["Sector-12","Ishima","New Tokyo","Chongqing","The Black Hand","Volhaven","Four Sigma","Aevum"]
  }
  ,"BitRunners Neurolink": {
    base_cost: 4375000000
   ,base_rep: 875000
   ,unique: true
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["BitRunners"]
  }
 ,"PC Direct-Neural Interface": {
    base_cost: 3750000000
   ,base_rep: 375000
   ,unique: false
   ,restricted: true
   ,categories: ["Hacking","Reputation"]
   ,factions: ["Four Sigma","OmniTek Incorporated"]
  }
 ,"OmniTek InfoLoad": {
    base_cost: 2875000000
   ,base_rep: 625000
   ,unique: true
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["OmniTek Incorporated"]
  }
 ,"QLink": {
    base_cost: 25000000000000
   ,base_rep: 1875000
   ,unique: true
   ,restricted: true
   ,categories: ["Hacking"]
   ,factions: ["Illuminati"]
  }
 ,"Neurotrainer I": {
    base_cost: 4000000
   ,base_rep: Infinity
   ,unique: false
   ,restricted: true
   ,categories: ["All Skills"]
   ,factions: ["CyberSec","Aevum"]
  }
 ,"Neurotrainer II": {
    base_cost: 45000000
   ,base_rep: 10000
   ,unique: false
   ,restricted: true
   ,categories: ["All Skills"]
   ,factions: ["NiteSec","BitRunners"]
  }
 ,"Neurotrainer III": {
    base_cost: 130000000
   ,base_rep: 25000
   ,unique: false
   ,restricted: true
   ,categories: ["All Skills"]
   ,factions: ["Four Sigma"]
  }
 ,"Power Recirculation Core": {
    base_cost: 180000000
   ,base_rep: 25000
   ,unique: false
   ,restricted: true
   ,categories: ["All Skills"]
   ,factions: ["Tetrads","The Syndicate","The Dark Army"]
  }
 ,"Unstable Circadian Modulator": {
    base_cost: 5000000000
   ,base_rep: 362500
   ,unique: true
   ,restricted: true
   ,categories: ["All Skills"]
   ,factions: ["Speakers for the Dead"]
  }
 ,"FocusWire": {
    base_cost: 900000000
   ,base_rep: 75000
   ,unique: false
   ,restricted: true
   ,categories: ["All Skills","Reputation","Work"]
   ,factions: ["Four Sigma"]
  }
 ,"PCMatrix": {
    base_cost: 2000000000
   ,base_rep: 100000
   ,unique: true
   ,restricted: true
   ,categories: ["Charisma","Reputation","Crime","Work"]
   ,factions: ["Aevum"]
  }
 ,"Neuroreceptor Management Implant": {
    base_cost: 550000000
   ,base_rep: 75000
   ,unique: true
   ,restricted: true
   ,categories: ["Reputation"]
   ,factions: ["Tian Di Hui"]
  }
 ,"Social Negotiation Assistant (S.N.A)": {
    base_cost: 30000000
   ,base_rep: 6250
   ,unique: true
   ,restricted: true
   ,categories: ["Reputation"]
   ,factions: ["Tian Di Hui"]
  }
 ,"ADR-V1 Pheromone Gene": {
    base_cost: 17500000
   ,base_rep: 3750
   ,unique: false
   ,restricted: true
   ,categories: ["Reputation"]
   ,factions: ["Tian Di Hui","MegaCorp","Four Sigma","The Syndicate"]
  }
 ,"ADR-V2 Pheromone Gene": {
    base_cost: 550000000
   ,base_rep: 62500
   ,unique: false
   ,restricted: true
   ,categories: ["Reputation"]
   ,factions: ["Four Sigma"]
  }
 ,"The Shadow's Simulacrum": {
    base_cost: 400000000
   ,base_rep: 37500
   ,unique: false
   ,restricted: true
   ,categories: ["Reputation"]
   ,factions: ["The Syndicate","Speakers for the Dead","The Dark Army"]
  }
 ,"Nanofiber Weave": {
    base_cost: 125000000
   ,base_rep: 37500
   ,unique: false
   ,restricted: true
   ,categories: ["Strength","Defense"]
   ,factions: ["Tian Di Hui","OmniTek Incorporated","The Syndicate","Speakers for the Dead","The Dark Army"]
  }
 ,"Speech Processor Implant": {
    base_cost: 50000000
   ,base_rep: 7500
   ,unique: false
   ,restricted: true
   ,categories: ["Charisma"]
   ,factions: ["Tian Di Hui","Sector-12","Ishima","New Tokyo","Chongqing","Volhaven","Aevum"]
  }
 ,"Enhanced Social Interaction Implant": {
    base_cost: 1375000000
   ,base_rep: 375000
   ,unique: false
   ,restricted: true
   ,categories: ["Charisma"]
   ,factions: ["Four Sigma","OmniTek Incorporated"]
  }
 ,"Nuoptimal Nootropic Injector Implant": {
    base_cost: 20000000
   ,base_rep: 5000
   ,unique: false
   ,restricted: true
   ,categories: ["Reputation"]
   ,factions: ["Tian Di Hui","New Tokyo","Chongqing","Volhaven","Four Sigma"]
  }
 ,"Speech Enhancement": {
    base_cost: 12500000
   ,base_rep: 2500
   ,unique: false
   ,restricted: true
   ,categories: ["Reputation","Charisma"]
   ,factions: ["Tian Di Hui","Four Sigma","Speakers for the Dead"]
  }
 ,"Wired Reflexes": {
    base_cost: 2500000
   ,base_rep: 1250
   ,unique: false
   ,restricted: true
   ,categories: ["Dexterity","Agility"]
   ,factions: ["Tian Di Hui","Sector-12","Ishima","Volhaven","Slum Snakes","The Syndicate","Speakers for the Dead","The Dark Army","Aevum"]
  }
 ,"INFRARET Enhancement": {
    base_cost: 30000000
   ,base_rep: 7500
   ,unique: true
   ,restricted: true
   ,categories: ["Dexterity","Crime"]
   ,factions: ["Ishima"]
  }
 ,"LuminCloaking-V1 Skin Implant": {
    base_cost: 5000000
   ,base_rep: 1500
   ,unique: false
   ,restricted: true
   ,categories: ["Agility","Crime"]
   ,factions: ["Slum Snakes","Tetrads"]
  }
 ,"LuminCloaking-V2 Skin Implant": {
    base_cost: 30000000
   ,base_rep: 5000
   ,unique: false
   ,restricted: true
   ,categories: ["Defense","Agility","Crime"]
   ,factions: ["Slum Snakes","Tetrads"]
   ,prereq: ["LuminCloaking-V1 Skin Implant"]
  }
 ,"SmartSonar Implant": {
    base_cost: 75000000
   ,base_rep: 22500
   ,unique: true
   ,restricted: true
   ,categories: ["Dexterity","Crime"]
   ,factions: ["Slum Snakes"]
  }
 ,"BrachiBlades": {
    base_cost: 90000000
   ,base_rep: 12500
   ,unique: true
   ,restricted: true
   ,categories: ["Strength","Defense","Crime"]
  }
 ,"Graphene BrachiBlades Upgrade": {
    base_cost: 2500000000
   ,base_rep: 225000
   ,unique: true
   ,restricted: true
   ,categories: ["Strength","Defense","Crime"]
  }
 ,"Combat Rib I": {
    base_cost: 23750000
   ,base_rep: 7500
   ,unique: false
   ,restricted: true
   ,categories: ["Strength","Defense"]
   ,factions: ["Ishima","Volhaven","OmniTek Incorporated","Slum Snakes","The Syndicate","The Dark Army"]
  }
 ,"Combat Rib II": {
    base_cost: 65000000
   ,base_rep: 18750
   ,unique: false
   ,restricted: true
   ,categories: ["Strength","Defense"]
   ,factions: ["Volhaven","OmniTek Incorporated","The Syndicate","The Dark Army"]
   ,prereq: ["Combat Rib I"]
  }
 ,"Combat Rib III": {
    base_cost: 120000000
   ,base_rep: 35000
   ,unique: false
   ,restricted: true
   ,categories: ["Strength","Defense"]
   ,factions: ["OmniTek Incorporated","The Syndicate","The Dark Army","The Covenant"]
   ,prereq: ["Combat Rib II"]
  }
 ,"DermaForce Particle Barrier": {
    base_cost: 50000000
   ,base_rep: 15000
   ,unique: true
   ,restricted: true
   ,categories: ["Defense"]
   ,factions: ["Volhaven"]
  }
 ,"Augmented Targeting I": {
    base_cost: 15000000
   ,base_rep: 5000
   ,unique: false
   ,restricted: true
   ,categories: ["Dexterity"]
   ,factions: ["Sector-12","Ishima","OmniTek Incorporated","Slum Snakes","The Syndicate","The Dark Army"]
  }
 ,"Augmented Targeting II": {
    base_cost: 42500000
   ,base_rep: 8750
   ,unique: false
   ,restricted: true
   ,categories: ["Dexterity"]
   ,factions: ["Sector-12","OmniTek Incorporated","The Syndicate","The Dark Army"]
   ,prereq: ["Augmented Targeting I"]
  }
 ,"Augmented Targeting III": {
    base_cost: 115000000
   ,base_rep: 27500
   ,unique: false
   ,restricted: true
   ,categories: ["Dexterity"]
   ,factions: ["OmniTek Incorporated","The Syndicate","The Dark Army","The Covenant"]
   ,prereq: ["Augmented Targeting II"]
  }
 ,"HemoRecirculator": {
    base_cost: 45000000
   ,base_rep: 10000
   ,unique: false
   ,restricted: true
   ,categories: ["Strength","Defense","Dexterity","Agility"]
   ,factions: ["Tetrads","The Syndicate","The Dark Army"]
  }
 ,"Bionic Arms": {
    base_cost: 275000000
   ,base_rep: 62500
   ,unique: true
   ,restricted: true
   ,categories: ["Strength","Dexterity"]
   ,factions: ["Tetrads"]
  }
 ,"Graphene Bionic Arms Upgrade": {
    base_cost: 3750000000
   ,base_rep: 500000
   ,unique: true
   ,restricted: true
   ,categories: ["Strength","Dexterity"]
   ,factions: ["The Dark Army"]
  }
 ,"Bionic Spine": {
    base_cost: 125000000
   ,base_rep: 45000
   ,unique: false
   ,restricted: true
   ,categories: ["Strength","Defense","Dexterity","Agility"]
   ,factions: ["OmniTek Incorporated","The Syndicate","Speakers for the Dead"]
  }
 ,"Bionic Legs": {
    base_cost: 375000000
   ,base_rep: 150000
   ,unique: false
   ,restricted: true
   ,categories: ["Agility"]
   ,factions: ["OmniTek Incorporated","The Syndicate","Speakers for the Dead"]
  }
 ,"Graphene Bionic Legs Upgrade": {
    base_cost: 4500000000
   ,base_rep: 750000
   ,unique: false
   ,restricted: true
   ,categories: ["Agility"]
   ,factions: ["MegaCorp"]
   ,prereq: ["Bionic Legs"]
  }
 ,"Graphene Bone Lacings": {
    base_cost: 4250000000
   ,base_rep: 1125000
   ,unique: false
   ,restricted: true
   ,categories: ["Strength","Defense"]
   ,factions: ["The Covenant"]
  }
 ,"CordiARC Fusion Reactor": {
    base_cost: 5000000000
   ,base_rep: 1125000
   ,unique: true
   ,restricted: true
   ,categories: ["Strength","Defense","Dexterity","Agility"]
   ,factions: ["MegaCorp"]
  }
 ,"Synfibril Muscle": {
    base_cost: 1125000000
   ,base_rep: 437500
   ,unique: false
   ,restricted: true
   ,categories: ["Strength","Defense"]
   ,factions: ["Daedalus","Speakers for the Dead","The Covenant","Illuminati"]
  }
 ,"Synthetic Heart": {
    base_cost: 2875000000
   ,base_rep: 750000
   ,unique: false
   ,restricted: true
   ,categories: ["Strength","Agility"]
   ,factions: ["Daedalus","Speakers for the Dead","The Covenant","Illuminati"]
  }
 ,"NEMEAN Subdermal Weave": {
    base_cost: 3250000000
   ,base_rep: 875000
   ,unique: false
   ,restricted: true
   ,categories: ["Defense"]
   ,factions: ["Daedalus","The Syndicate","The Covenant","Illuminati"]
  }
 ,"NutriGen Implant": {
    base_cost: 2500000
   ,base_rep: 6250
   ,unique: true
   ,restricted: true
   ,categories: ["Strength","Defense","Dexterity","Agility"]
   ,factions: ["New Tokyo"]
  }
 ,"SPTN-97 Gene Modification": {
    base_cost: 4875000000
   ,base_rep: 1250000
   ,unique: true
   ,restricted: true
   ,categories: ["Hacking","Strength","Defense","Dexterity","Agility"]
   ,factions: ["The Covenant"]
  }
}