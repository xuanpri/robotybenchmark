// Render derived logs from the reservation ledger without issuing a provider request.
import {Ledger,type Track} from '../src/learning/dmx'
import {baseDir,pilot} from '../src/learning/dmx-pilot'
const track=process.argv[2] as Track
if(!['A','B','smoke'].includes(track))throw Error('Choose smoke, A or B')
console.log(JSON.stringify(await pilot(track,new Ledger(baseDir+'/wire',true),baseDir+'/checkpoint/'+track)))
