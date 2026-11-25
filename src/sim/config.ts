import room from '../../config/room.json'
import patrols from '../../config/patrols.json'
import settings from '../../config/case.json'
export type Point = [number, number]
export type Box = [number,number,number,number]
export interface Room {width:number; depth:number; spawn:Point; exit:Point; exitRadius:number; walls:{id:string;box:Box}[]}
export interface Patrol {id:string;nodes:Point[];speed:number;pause:number;turn:number;phase:number;periodSeconds?:number}
export interface Config {
  room:Room; patrols:Patrol[]; robotCount:0|1|2|4; robotRadius:number;playerRadius:number;playerSpeed:number;
  visionDegrees:number;visionRange:number;playerRange:number;failure:'contact'|'vision'|'both';
  observation:'limited'|'omniscient';publishRules:boolean;phaseJitter:number;maxTime:number;maxAttempts:number
}
export function defaults():Config {
  return structuredClone({...settings,room,patrols}) as Config
}
export const actions = ['MOVE_NORTH','MOVE_SOUTH','MOVE_WEST','MOVE_EAST','WAIT'] as const
export type Action = typeof actions[number]
export const direction:Record<Action,Point> = {MOVE_NORTH:[0,-1],MOVE_SOUTH:[0,1],MOVE_WEST:[-1,0],MOVE_EAST:[1,0],WAIT:[0,0]}
