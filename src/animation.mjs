// Integral of a steadily increasing flash frequency (2 -> 9.2 Hz in 4 s).
export function tntFlash(fuse){const age=Math.max(0,Math.min(4,4-fuse));return (age*2+.9*age*age)%1<.5;}
