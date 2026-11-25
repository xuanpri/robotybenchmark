import type {Box,Point,Room} from './config'
export const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1])
// Slab intersection, including tangencies. Parameter 0..1 along the segment.
export function hit(a:Point,b:Point,box:Box,pad=0):number {
  let lo=0,hi=1
  for(const axis of [0,1]){
    const delta=b[axis]-a[axis],min=box[axis]-pad,max=box[axis+2]+pad
    if(Math.abs(delta)<1e-12){if(a[axis]<min||a[axis]>max)return Infinity;continue}
    const enter=(min-a[axis])/delta,leave=(max-a[axis])/delta
    lo=Math.max(lo,Math.min(enter,leave));hi=Math.min(hi,Math.max(enter,leave))
    if(lo>hi)return Infinity
  }
  return lo
}
export function wallHit(a:Point,b:Point,room:Room,pad=0){
  let first=Infinity
  for(const wall of room.walls)first=Math.min(first,hit(a,b,wall.box,pad))
  return first
}
export function move(a:Point,delta:Point,room:Room,r:number):Point{
  const b:Point=[a[0]+delta[0],a[1]+delta[1]]
  const t=wallHit(a,b,room,r)
  const scale=Math.min(1,Math.max(0,t-1e-7))
  return [Math.max(r,Math.min(room.width-r,a[0]+delta[0]*scale)),Math.max(r,Math.min(room.depth-r,a[1]+delta[1]*scale))]
}
export const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a))
