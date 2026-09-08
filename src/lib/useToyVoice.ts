import {useEffect,useRef,useState} from 'react';
import {playVoice,stopVoice} from './audio';

/** Playback belongs to the toy room, not any of its model/card/story panes. */
export function useToyVoice(toy:{id:string;audio_url:string},onError:()=>void){
 const [playing,setPlaying]=useState(false);
 const generation=useRef(0);
 useEffect(()=>{
  ++generation.current;stopVoice();setPlaying(false);
  return()=>{++generation.current;stopVoice()};
 },[toy.id,toy.audio_url]);
 const listen=async()=>{
  const request=++generation.current;
  if(playing){stopVoice();setPlaying(false);return}
  setPlaying(true);
  try{await playVoice(toy.audio_url,()=>{if(generation.current===request)setPlaying(false)})}
  catch{if(generation.current===request){setPlaying(false);onError()}}
 };
 return {playing,listen};
}
