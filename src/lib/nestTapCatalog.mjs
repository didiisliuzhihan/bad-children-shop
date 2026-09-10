// User-supplied MP3s, unchanged. Per-clip gain balances measured RMS/peaks.
export const NEST_TAP_CLIPS=Object.freeze({
 tired_crow:[{file:'nest-tap-crow-wow.mp3',gain:.657},{file:'nest-tap-crow-snore.mp3',gain:1.890}],
 miss_popcorn:[{file:'nest-tap-popcorn-1.mp3',gain:1.779},{file:'nest-tap-popcorn-2.mp3',gain:1.294},{file:'nest-tap-popcorn-3.mp3',gain:.536}],
 stressed_jimao:[{file:'nest-tap-stressed-jimao.mp3',gain:1.192}],
 kuku_sunflower:[{file:'nest-tap-kuku.mp3',gain:.649}],
 jimao:[{file:'nest-tap-jimao.mp3',gain:.958}],
 stove:[{file:'nest-tap-stove.mp3',gain:3.589}],
 window:[{file:'nest-tap-window.mp3',gain:8.868}],
});
export const NEST_TAP_FILES=Object.values(NEST_TAP_CLIPS).flat().map(clip=>clip.file);
export const isNestTapTarget=id=>typeof id==='string'&&Object.hasOwn(NEST_TAP_CLIPS,id);
export function roomTapTarget(name){
 const plain=String(name).replaceAll('_',' ');
 if(/^(Arched window sill|Golden arched window frame|Luminous arched window pane)(?:$|[ .-])/i.test(plain))return 'window';
 if(/^(Stove |Hob |Oven |Glowing oven glass|Golden soup |Hollow lavender pan |Upper pan handle )/i.test(plain))return 'stove';
 return null;
}
