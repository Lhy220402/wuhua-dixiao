import type { Color, KAPLAYCtx } from "kaplay";
import { THEME } from "../config/theme";

export interface Palette {
  ink: Color;
  board: Color;
  board2: Color;
  paper: Color;
  chalk: Color;
  chalk2: Color;
  pen: Color;
  penInk: Color;
  laser: Color;
  expose: Color;
  coin: Color;
  coinInk: Color;
  heart: Color;
  success: Color;
  uniformBlue: Color;
  playerBlue: Color;
  skin: Color;
  hairInk: Color;
  bossPurple: Color;
  schoolGold: Color;
  spikeRed: Color;
  groundGreen: Color;
  platformWarm: Color;
  hallCurtain: Color;
  plaqueBrown: Color;
  boss2Teal: Color;
  chalkWhite: Color;
  shoeBlack: Color;
  deskWood: Color;
  mushroom: Color;
  suitGray: Color;
  white: Color;
  black: Color;
  shadow: Color;
  emperorRobe: Color;
  emperorRobeDark: Color;
  emperorCollar: Color;
  emperorCrown: Color;
  emperorJade: Color;
  studentUniform: Color;
  studentPants: Color;
  studentTie: Color;
}

let cached: Palette | null = null;

export function getPalette(k: KAPLAYCtx): Palette {
  if (cached) return cached;
  const c = THEME.color;
  cached = {
    ink: k.rgb(c.ink0),
    board: k.rgb(c.board),
    board2: k.rgb(c.board2),
    paper: k.rgb(c.paper),
    chalk: k.rgb(c.chalk),
    chalk2: k.rgb(c.chalk2),
    pen: k.rgb(c.pen),
    penInk: k.rgb(c.penInk),
    laser: k.rgb(c.laser),
    expose: k.rgb(c.expose),
    coin: k.rgb(c.coin),
    coinInk: k.rgb(c.coinInk),
    heart: k.rgb(c.heart),
    success: k.rgb(c.success),
    uniformBlue: k.rgb(c.uniformBlue),
    playerBlue: k.rgb(c.playerBlue),
    skin: k.rgb(c.skin),
    hairInk: k.rgb(c.hairInk),
    bossPurple: k.rgb(c.bossPurple),
    schoolGold: k.rgb(c.schoolGold),
    spikeRed: k.rgb(c.spikeRed),
    groundGreen: k.rgb(c.groundGreen),
    platformWarm: k.rgb(c.platformWarm),
    hallCurtain: k.rgb(c.hallCurtain),
    plaqueBrown: k.rgb(c.plaqueBrown),
    boss2Teal: k.rgb(c.boss2Teal),
    chalkWhite: k.rgb(c.chalkWhite),
    shoeBlack: k.rgb(c.shoeBlack),
    deskWood: k.rgb(c.deskWood),
    mushroom: k.rgb(c.mushroom),
    suitGray: k.rgb(c.suitGray),
    white: k.rgb(c.white),
    black: k.rgb(c.black),
    shadow: k.rgb(c.shadow),
    emperorRobe: k.rgb(c.emperorRobe),
    emperorRobeDark: k.rgb(c.emperorRobeDark),
    emperorCollar: k.rgb(c.emperorCollar),
    emperorCrown: k.rgb(c.emperorCrown),
    emperorJade: k.rgb(c.emperorJade),
    studentUniform: k.rgb(c.studentUniform),
    studentPants: k.rgb(c.studentPants),
    studentTie: k.rgb(c.studentTie),
  };
  return cached;
}

export function resetPalette(): void {
  cached = null;
}
