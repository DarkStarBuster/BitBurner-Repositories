
import { COLOUR, colourize } from "/scripts/util/colours"

/** @param {NS} ns */
export async function main(ns) {

  let code = "38"
  let letter = "~"
  let print_codes = false

  ns.tail()
  let string = ""
  let current = ""
  for (let i = 48; i < 208; i += 16) {
    if (print_codes) {
      current = "\"\\u001b[" + code + ";2;"+i+";0;0m\" , "
    }
    else {
      current = "\u001b[" + code + ";2;"+i+";0;0m" + letter
    }
    string = string + current

    if (((i+1) % 16) == 0) {
      string = string + "\n"
    }
  }
  ns.print("RED    : " + string + "\u001b[0m Red")

  string = ""
  for (let i = 48; i < 208; i += 16) {
    if (print_codes) {
      current = "\"\\u001b[" + code + ";2;"+i+";"+i/2+";0m\" , "
    }
    else {
      current = "\u001b[" + code + ";2;"+i+";"+i/2+";0m" + letter
    }
    string = string + current

    if (((i+1) % 16) == 0) {
      string = string + "\n"
    }
  }
  ns.print("ORANGE : " + string + "\u001b[0m Red + Green/2")

  string = ""
  for (let i = 48; i < 208; i += 16) {
    if (print_codes) {
      current = "\"\\u001b[" + code + ";2;"+i+";"+i+";0m\" , "
    }
    else {
      current = "\u001b[" + code + ";2;"+i+";"+i+";0m" + letter
    }
    string = string + current

    if (((i+1) % 16) == 0) {
      string = string + "\n"
    }
  }
  ns.print("YELLOW : " + string + "\u001b[0m Red + Green")

  string = ""
  for (let i = 48; i < 208; i += 16) {
    if (print_codes) {
      current = "\"\\u001b[" + code + ";2;"+(3*i)/4+";"+i+";0m\" , "
    }
    else {
      current = "\u001b[" + code + ";2;"+(3*i)/4+";"+i+";0m" + letter
    }
    string = string + current

    if (((i+1) % 16) == 0) {
      string = string + "\n"
    }
  }
  ns.print("L.GREEN: " + string + "\u001b[0m Red3/4 + Green")

  string = ""
  for (let i = 48; i < 208; i += 16) {
    if (print_codes) {
      current = "\"\\u001b[" + code + ";2;0;"+i+";0m\" , "
    }
    else {
      current = "\u001b[" + code + ";2;0;"+i+";0m" + letter
    }
    string = string + current

    if (((i+1) % 16) == 0) {
      string = string + "\n"
    }
  }
  ns.print("GREEN  : " + string + "\u001b[0m Green")

  string = ""
  for (let i = 48; i < 208; i += 16) {
    if (print_codes) {
      current = "\"\\u001b[" + code + ";2;0;"+i+";"+(3*i)/4+"m\" , "
    }
    else {
      current = "\u001b[" + code + ";2;0;"+i+";"+(3*i)/4+"m" + letter
    }
    string = string + current

    if (((i+1) % 16) == 0) {
      string = string + "\n"
    }
  }
  ns.print("MINT   : " + string + "\u001b[0m Green + Blue3/4")

  string = ""
  for (let i = 48; i < 208; i += 16) {
    if (print_codes) {
      current = "\"\\u001b[" + code + ";2;0;"+i+";"+i+"m\" , "
    }
    else {
      current = "\u001b[" + code + ";2;0;"+i+";"+i+"m" + letter
    }
    string = string + current

    if (((i+1) % 16) == 0) {
      string = string + "\n"
    }
  }
  ns.print("CYAN   : " + string + "\u001b[0m Green + Blue")

  string = ""
  for (let i = 48; i < 208; i += 16) {
    if (print_codes) {
      current = "\"\\u001b[" + code + ";2;0;"+i/2+";"+i+"m\" , "
    }
    else {
      current = "\u001b[" + code + ";2;0;"+i/2+";"+i+"m" + letter
    }
    string = string + current

    if (((i+1) % 16) == 0) {
      string = string + "\n"
    }
  }
  ns.print("AZURE  : " + string + "\u001b[0m Green/2 + Blue")

  string = ""
  for (let i = 48; i < 208; i += 16) {
    if (print_codes) {
      current = "\"\\u001b[" + code + ";2;0;0;"+i+"m\" , "
    }
    else {
      current = "\u001b[" + code + ";2;0;0;"+i+"m" + letter
    }
    string = string + current

    if (((i+1) % 16) == 0) {
      string = string + "\n"
    }
  }
  ns.print("BLUE   : " + string + "\u001b[0m Blue")

  string = ""
  for (let i = 48; i < 208; i += 16) {
    if (print_codes) {
      current = "\"\\u001b[" + code + ";2;"+i/2+";0;"+i+"m\" , "
    }
    else {
      current = "\u001b[" + code + ";2;"+i/2+";0;"+i+"m" + letter
    }
    string = string + current

    if (((i+1) % 16) == 0) {
      string = string + "\n"
    }
  }
  ns.print("PURPLE : " + string + "\u001b[0m Red/2 + Blue")

  string = ""
  for (let i = 48; i < 208; i += 16) {
    if (print_codes) {
      current = "\"\\u001b[" + code + ";2;"+i+";0;"+i+"m\" , "
    }
    else {
      current = "\u001b[" + code + ";2;"+i+";0;"+i+"m" + letter
    }
    string = string + current

    if (((i+1) % 16) == 0) {
      string = string + "\n"
    }
  }
  ns.print("MAGENTA: " + string + "\u001b[0m Red + Blue")

  string = ""
  for (let i = 48; i < 208; i += 16) {
    if (print_codes) {
      current = "\"\\u001b[" + code + ";2;"+i+";0;"+i/2+"m\" , "
    }
    else {
      current = "\u001b[" + code + ";2;"+i+";0;"+i/2+"m" + letter
    }
    string = string + current

    if (((i+1) % 16) == 0) {
      string = string + "\n"
    }
  }
  ns.print("PINK   : " + string + "\u001b[0m Red + Blue/2")

  string = ""
  for (let i = 176; i < 256; i += 16) {
    if (print_codes) {
      current = "\"\\u001b[" + code + ";2;"+i+";"+i+";"+i+"m\" , "
    }
    else {
      current = "\u001b[" + code + ";2;"+i+";"+i+";"+i+"m" + letter
    }
    string = string + current

    if (((i+1) % 16) == 0) {
      string = string + "\n"
    }
  }
  ns.print("WHITE  : " + string + "\u001b[0m Red + Green + Blue")

  string = ""
  for (let i = 32; i < 112; i += 16) {
    if (print_codes) {
      current = "\"\\u001b[" + code + ";2;"+i+";"+i+";"+i+"m\" , "
    }
    else {
      current = "\u001b[" + code + ";2;"+i+";"+i+";"+i+"m" + letter
    }
    string = string + current

    if (((i+1) % 16) == 0) {
      string = string + "\n"
    }
  }
  ns.print("BLACK  : " + string + "\u001b[0m Red + Green + Blue")

  ns.print("\nAnd now the Colour.js version")
  for(let i = 0; i <12; i++){
    string = ""
    for(let j = 0; j<10; j++){
      string = string + colourize(i,j) + "~"
    }
    ns.print("I: " + string)
  }
}