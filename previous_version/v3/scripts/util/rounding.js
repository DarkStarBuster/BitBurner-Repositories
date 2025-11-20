export function round_ram_cost(number, decimal_places = 2) {
  let power = Math.pow(10, decimal_places)
  let num   = (number * power) * (1 - Math.sign(number) * Number.EPSILON)
  return Math.ceil(num) / power
}