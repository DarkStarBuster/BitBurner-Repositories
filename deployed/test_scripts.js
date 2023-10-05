/** @param {NS} ns */
export async function main(ns) {

  let mults = ns.getBitNodeMultipliers()

  let table_string = ""

  let max_prop_name_length = 0
  let max_prop_value_length = 0
  for (let prop in mults) {
    if (prop.length > max_prop_name_length) {
      max_prop_name_length = prop.length
    }
    if (mults[prop].toString().length > max_prop_value_length) {
      max_prop_value_length = mults[prop].toString().length
    }
  }

  for (let prop in mults) {
    table_string = table_string + "\n" + prop.padEnd(max_prop_name_length) + ": " + mults[prop].toString().padStart(max_prop_value_length)
  }
}