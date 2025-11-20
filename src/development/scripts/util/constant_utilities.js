export const IN_DEV = true

export const COLOURS = {
  black: '\u001b[30m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  white: '\u001b[37m',
  brightBlack: '\u001b[30;1m',
  brightRed: '\u001b[31;1m',
  brightGreen: '\u001b[32;1m',
  brightYellow: '\u001b[33;1m',
  brightBlue: '\u001b[34;1m',
  brightMagenta: '\u001b[35;1m',
  brightCyan: '\u001b[36;1m',
  brightWhite: '\u001b[37;1m',
  default: '\u001b[0m',
}

//export const DEFAULT_COLOUR = "\u001b[0m"

export const COLOUR = {
  DEFAULT: -1
 ,RED    :  0
 ,ORANGE :  1
 ,YELLOW :  2
 ,LGREEN :  3
 ,GREEN  :  4
 ,MINT   :  5
 ,CYAN   :  6
 ,AZURE  :  7
 ,BLUE   :  8
 ,PURPLE :  9
 ,MAGENTA: 10
 ,PINK   : 11
 ,WHITE  : 12
 ,BLACK  : 13
}

const COLOUR_ARRAY = [
  /*RED    */ ["\u001b[38;2;48;0;0m" , "\u001b[38;2;64;0;0m" , "\u001b[38;2;80;0;0m" , "\u001b[38;2;96;0;0m" , "\u001b[38;2;112;0;0m" , "\u001b[38;2;128;0;0m" , "\u001b[38;2;144;0;0m" , "\u001b[38;2;160;0;0m" , "\u001b[38;2;176;0;0m" , "\u001b[38;2;192;0;0m"]
 ,/*ORANGE */ ["\u001b[38;2;48;24;0m" , "\u001b[38;2;64;32;0m" , "\u001b[38;2;80;40;0m" , "\u001b[38;2;96;48;0m" , "\u001b[38;2;112;56;0m" , "\u001b[38;2;128;64;0m" , "\u001b[38;2;144;72;0m" , "\u001b[38;2;160;80;0m" , "\u001b[38;2;176;88;0m" , "\u001b[38;2;192;96;0m"]
 ,/*YELLOW */ ["\u001b[38;2;48;48;0m" , "\u001b[38;2;64;64;0m" , "\u001b[38;2;80;80;0m" , "\u001b[38;2;96;96;0m" , "\u001b[38;2;112;112;0m" , "\u001b[38;2;128;128;0m" , "\u001b[38;2;144;144;0m" , "\u001b[38;2;160;160;0m" , "\u001b[38;2;176;176;0m" , "\u001b[38;2;192;192;0m"]
 ,/*LGREEN */ ["\u001b[38;2;36;48;0m" , "\u001b[38;2;48;64;0m" , "\u001b[38;2;60;80;0m" , "\u001b[38;2;72;96;0m" , "\u001b[38;2;84;112;0m" , "\u001b[38;2;96;128;0m" , "\u001b[38;2;108;144;0m" , "\u001b[38;2;120;160;0m" , "\u001b[38;2;132;176;0m" , "\u001b[38;2;144;192;0m"]
 ,/*GREEN  */ ["\u001b[38;2;0;48;0m" , "\u001b[38;2;0;64;0m" , "\u001b[38;2;0;80;0m" , "\u001b[38;2;0;96;0m" , "\u001b[38;2;0;112;0m" , "\u001b[38;2;0;128;0m" , "\u001b[38;2;0;144;0m" , "\u001b[38;2;0;160;0m" , "\u001b[38;2;0;176;0m" , "\u001b[38;2;0;192;0m"]
 ,/*MINT   */ ["\u001b[38;2;0;48;36m" , "\u001b[38;2;0;64;48m" , "\u001b[38;2;0;80;60m" , "\u001b[38;2;0;96;72m" , "\u001b[38;2;0;112;84m" , "\u001b[38;2;0;128;96m" , "\u001b[38;2;0;144;108m" , "\u001b[38;2;0;160;120m" , "\u001b[38;2;0;176;132m" , "\u001b[38;2;0;192;144m"]
 ,/*CYAN   */ ["\u001b[38;2;0;48;48m" , "\u001b[38;2;0;64;64m" , "\u001b[38;2;0;80;80m" , "\u001b[38;2;0;96;96m" , "\u001b[38;2;0;112;112m" , "\u001b[38;2;0;128;128m" , "\u001b[38;2;0;144;144m" , "\u001b[38;2;0;160;160m" , "\u001b[38;2;0;176;176m" , "\u001b[38;2;0;192;192m"]
 ,/*AZURE  */ ["\u001b[38;2;0;24;48m" , "\u001b[38;2;0;32;64m" , "\u001b[38;2;0;40;80m" , "\u001b[38;2;0;48;96m" , "\u001b[38;2;0;56;112m" , "\u001b[38;2;0;64;128m" , "\u001b[38;2;0;72;144m" , "\u001b[38;2;0;80;160m" , "\u001b[38;2;0;88;176m" , "\u001b[38;2;0;96;192m"]
 ,/*BLUE   */ ["\u001b[38;2;0;0;48m" , "\u001b[38;2;0;0;64m" , "\u001b[38;2;0;0;80m" , "\u001b[38;2;0;0;96m" , "\u001b[38;2;0;0;112m" , "\u001b[38;2;0;0;128m" , "\u001b[38;2;0;0;144m" , "\u001b[38;2;0;0;160m" , "\u001b[38;2;0;0;176m" , "\u001b[38;2;0;0;192m"]
 ,/*PURPLE */ ["\u001b[38;2;24;0;48m" , "\u001b[38;2;32;0;64m" , "\u001b[38;2;40;0;80m" , "\u001b[38;2;48;0;96m" , "\u001b[38;2;56;0;112m" , "\u001b[38;2;64;0;128m" , "\u001b[38;2;72;0;144m" , "\u001b[38;2;80;0;160m" , "\u001b[38;2;88;0;176m" , "\u001b[38;2;96;0;192m"]
 ,/*MAGENTA*/ ["\u001b[38;2;48;0;48m" , "\u001b[38;2;64;0;64m" , "\u001b[38;2;80;0;80m" , "\u001b[38;2;96;0;96m" , "\u001b[38;2;112;0;112m" , "\u001b[38;2;128;0;128m" , "\u001b[38;2;144;0;144m" , "\u001b[38;2;160;0;160m" , "\u001b[38;2;176;0;176m" , "\u001b[38;2;192;0;192m"]
 ,/*PINK   */ ["\u001b[38;2;48;0;24m" , "\u001b[38;2;64;0;32m" , "\u001b[38;2;80;0;40m" , "\u001b[38;2;96;0;48m" , "\u001b[38;2;112;0;56m" , "\u001b[38;2;128;0;64m" , "\u001b[38;2;144;0;72m" , "\u001b[38;2;160;0;80m" , "\u001b[38;2;176;0;88m" , "\u001b[38;2;192;0;96m"]
 ,/*WHITE  */ ["\u001b[38;2;176;176;176m" , "\u001b[38;2;192;192;192m" , "\u001b[38;2;208;208;208m" , "\u001b[38;2;224;224;224m" , "\u001b[38;2;240;240;240m"]
 ,/*BLACK  */ ["\u001b[38;2;32;32;32m" , "\u001b[38;2;48;48;48m" , "\u001b[38;2;64;64;64m" , "\u001b[38;2;80;80;80m" , "\u001b[38;2;96;96;96m"]
]

export const PORT_IDS = {
  CONTROL_PARAM_HANDLER : 1
 ,BITNODE_MULTS_HANDLER : 2
 ,SERVER_INFO_HANDLER   : 3
 ,UPDATE_HANDLER        : 4
 ,RAM_REQUEST_HANDLER   : 5
 ,RAM_PROVIDE_HANDLER   : 6
}

/**
 * @param {number} colour 
 * @param {number} intensity 
 * @returns Colourizing escape code
 */
export function colourize(colour,intensity = 4) {
  //ns.tprint(colour + " : " + intensity)
  switch (colour) {
    case COLOUR.WHITE:
    case COLOUR.BLACK:
      if (intensity >= 0 && intensity <= 4) return COLOUR_ARRAY[colour][intensity]
      else return ""
      break
    case COLOUR.RED:
    case COLOUR.ORANGE:
    case COLOUR.YELLOW:
    case COLOUR.LGREEN:
    case COLOUR.GREEN:
    case COLOUR.MINT:
    case COLOUR.CYAN:
    case COLOUR.AZURE:
    case COLOUR.BLUE:
    case COLOUR.PURPLE:
    case COLOUR.MAGENTA:
    case COLOUR.PINK:
      if (intensity >= 0 && intensity <= 9) return COLOUR_ARRAY[colour][intensity]
      else return ""
      break
    case COLOUR.DEFAULT:
      return "\u001b[0m"
    default:
      return ""
  }
}