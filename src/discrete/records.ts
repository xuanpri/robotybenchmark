import type {Condition,Decision,Attribution} from './protocol'
import type {State,Action} from './environment'
export type StepRecord={before:State;after:State;decision?:Decision;raw?:string;predictionCorrect?:boolean;formatError?:string;wireName?:string;latency?:number;model?:string;usage?:Record<string,unknown>}
export type Run={id:string;condition:Condition;phase:number;states:State[];steps:StepRecord[];actions:Action[];outcome:string;attribution?:{category:Attribution;evidence:string};infrastructureError?:string}
