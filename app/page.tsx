"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Copy, Headphones, LockKeyhole, Mic, Pause, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { API_ORIGIN, ASSET_BASE, apiResponse, saveSessionToken, clearSession, onboardingCredential, finishOnboarding, pendingCredential } from "@/lib/client-api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Space={id:string;you:string;partner:string|null;pending:boolean;mine:boolean;revision:number;listened:boolean;hasAudio:boolean;duration:number;invite:string|null};
type Demo={holder:number;side:number;revision:number;listened:boolean;audio:string;duration:number};
const initialDemo:Demo={holder:0,side:0,revision:0,listened:false,audio:ASSET_BASE+"demo-harry.wav",duration:6.212562};
const format=(s:number)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
const wave=[12,22,32,20,42,54,33,21,38,27,14];
async function request(path:string,options?:RequestInit){const response=await apiResponse(path,options);if(!response.headers.get("content-type")?.includes("application/json"))throw new Error("The service couldn’t respond. Please try again; your draft stays in this tab.");const data=await response.json() as {space:Space|null;error?:string;ok?:boolean;sessionToken?:string;recoveryCode?:string};if(!response.ok)throw new Error(data.error||"Something went wrong. Please try again.");if(data.sessionToken)saveSessionToken(data.sessionToken);return data;}

export default function Home(){
  const [space,setSpace]=useState<Space|null>(null),[demo,setDemo]=useState(initialDemo),[loaded,setLoaded]=useState(false);
  const [dialog,setDialog]=useState<"help"|"connect"|"invite"|"settings"|"restore"|"privacy"|null>(null),[invite,setInvite]=useState(""),[yourName,setYourName]=useState("");
  const [busy,setBusy]=useState(false),[recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[draft,setDraft]=useState<Blob|null>(null),[draftSeconds,setDraftSeconds]=useState(0);
  const [playing,setPlaying]=useState<"incoming"|"draft"|null>(null),[progress,setProgress]=useState(0),[error,setError]=useState(""),[copied,setCopied]=useState(false);
  const [recoveryCode,setRecoveryCode]=useState(""),[restoreCode,setRestoreCode]=useState(""),[endConfirmed,setEndConfirmed]=useState(false),[audioFailed,setAudioFailed]=useState(false);
  const draftRevision=useRef<number|null>(null);
  const playbackKind=useRef<"incoming"|"draft"|null>(null);
  const audio=useRef<HTMLAudioElement|null>(null),recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),started=useRef(0),objectUrl=useRef<string|null>(null);
  const live=!!space,mine=space?space.mine:demo.holder===demo.side,pending=space?.pending||false,partner=space?.partner||(demo.side===0?"Harry":"You"),you=space?.you||(demo.side===0?"You":"Harry"),listened=space?space.listened:demo.listened;
  const hasAudio=space?space.hasAudio:true,duration=space?space.duration:demo.duration;
  const incoming=mine&&hasAudio&&!listened&&!pending;
  const stopAudio=useCallback(()=>{audio.current?.pause();audio.current=null;playbackKind.current=null;if(objectUrl.current){URL.revokeObjectURL(objectUrl.current);objectUrl.current=null;}setPlaying(null);setProgress(0);},[]);

  useEffect(()=>{let active=true;
    async function restoreSession(){
      let data=await request("/api/space");
      const credential=pendingCredential();
      if(!data.space&&credential){data=await request("/api/space",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"resume",credential})});if(data.space)finishOnboarding();}
      if(active)setSpace(data.space);
    }
    restoreSession().catch(()=>{if(active)setError("Your space couldn’t be restored. Check your connection before opening a new space.");}).finally(()=>{if(active)setLoaded(true);});
    const code=new URLSearchParams(location.hash.slice(1)).get("join");if(code){setInvite(code);setDialog("connect");}
    return()=>{active=false;audio.current?.pause();if(recorder.current?.state==="recording")recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());};
  },[]);
  useEffect(()=>{if(!space)return;let active=true;const interval=setInterval(()=>{if(document.hidden||busy||recording)return;request("/api/space").then(data=>{const next=data.space;if(!active)return;
    if(!next){stopAudio();setSpace(null);setDraft(null);clearSession();setRecoveryCode("");setDialog(null);setError("This device no longer has access. The space may have ended or moved to another device.");return;}
    setSpace(previous=>{if(previous&&previous.revision!==next.revision){stopAudio();setAudioFailed(false);}return next;});
  }).catch(()=>{if(active)setError("Connection paused. Your draft stays in this tab; keep it open while we reconnect.");});},4000);return()=>{active=false;clearInterval(interval);};},[space?.id,busy,recording,stopAudio]);
  useEffect(()=>{if(!recording)return;const timer=setInterval(()=>{const elapsed=Math.floor((Date.now()-started.current)/1000);setSeconds(elapsed);if(elapsed>=120&&recorder.current?.state==="recording")recorder.current.stop();},200);return()=>clearInterval(timer);},[recording]);
  useEffect(()=>{if(!draft&&!recording)return;const guard=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};window.addEventListener("beforeunload",guard);return()=>window.removeEventListener("beforeunload",guard);},[draft,recording]);

  async function markListened(){if(space){await request("/api/space",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"listened",revision:space.revision})});setSpace(old=>old?{...old,listened:true}:old);}else setDemo(old=>({...old,listened:true}));}
  async function play(kind:"incoming"|"draft"){
    if(!loaded||busy)return;setAudioFailed(false);
    if(playing===kind){audio.current?.pause();setPlaying(null);return;}
    if(audio.current&&playbackKind.current===kind&&!audio.current.ended){try{await audio.current.play();setPlaying(kind);}catch{setError("Tap Listen to try again.");}return;}
    stopAudio();setError("");
    let src=space?`/api/voice?r=${space.revision}`:demo.audio;
    if(space&&kind==="incoming"&&API_ORIGIN){
      setBusy(true);
      try{const response=await apiResponse(src);if(!response.ok)throw new Error("This recording couldn’t load. Please try again.");src=URL.createObjectURL(await response.blob());objectUrl.current=src;}
      catch(e){setError((e as Error).message);setAudioFailed(true);setBusy(false);return;}
      setBusy(false);
    }
    if(kind==="draft"){if(!draft)return;src=URL.createObjectURL(draft);objectUrl.current=src;}
    const player=new Audio(src);audio.current=player;playbackKind.current=kind;player.preload="auto";player.ontimeupdate=()=>setProgress(player.currentTime);
    player.onended=()=>{setPlaying(null);setProgress(0);if(kind==="incoming")void markListened().catch(e=>setError(e.message));};
    player.onerror=()=>{setPlaying(null);if(kind==="incoming")setAudioFailed(true);setError("This recording couldn’t play. Please try listening again.");};
    try{await player.play();setPlaying(kind);}catch{setPlaying(null);setError("Audio couldn’t start. Tap Listen to try again.");}
  }
  async function record(){
    if(!loaded||busy||!mine||pending||incoming)return;setError("");stopAudio();setBusy(true);
    try{
      if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined")throw new Error("Voice recording needs a recent browser with microphone access.");
      const recordingRevision=space?.revision??null;
      const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});stream.current=media;
      const mime=["audio/webm;codecs=opus","audio/mp4","audio/ogg;codecs=opus"].find(type=>MediaRecorder.isTypeSupported(type));
      const instance=new MediaRecorder(media,mime?{mimeType:mime}:undefined);recorder.current=instance;const chunks:BlobPart[]=[];
      instance.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      instance.onstop=()=>{const elapsed=Math.min(120,Math.max(1,Math.round((Date.now()-started.current)/1000)));const blob=new Blob(chunks,{type:instance.mimeType||"audio/webm"});media.getTracks().forEach(t=>t.stop());stream.current=null;setRecording(false);setDraftSeconds(elapsed);if(blob.size){draftRevision.current=recordingRevision;setDraft(blob);}else setError("We didn’t catch any audio. Please record again.");};
      instance.onerror=()=>{media.getTracks().forEach(t=>t.stop());setRecording(false);setError("Recording stopped unexpectedly. Please try again.");};
      instance.start(200);started.current=Date.now();setSeconds(0);setDraft(null);setRecording(true);
    }catch(e){stream.current?.getTracks().forEach(t=>t.stop());const err=e as Error;setError(err.name==="NotAllowedError"?"Allow microphone access in your browser, then try again.":err.name==="NotFoundError"?"No microphone was found. Connect one and try again.":err.message);}finally{setBusy(false);}
  }
  async function sample(){setBusy(true);setError("");try{const response=await fetch(ASSET_BASE+(demo.side===0?"demo-you.wav":"demo-harry.wav"));if(!response.ok)throw new Error("The sample couldn’t load. Please try again.");setDraft(await response.blob());setDraftSeconds(demo.side===0?8.288662:6.212562);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function pass(){if(!loaded||!draft||busy||!mine)return;setBusy(true);setError("");stopAudio();try{
    if(space){
      if(draftRevision.current!==null&&draftRevision.current!==space.revision){setDraft(null);throw new Error("The turn changed while this draft was open. Please record a new reply.");}
      const form=new FormData();form.set("audio",draft,"voice");form.set("duration",String(draftSeconds));form.set("revision",String(draftRevision.current??space.revision));const data=await request("/api/voice",{method:"POST",body:form});setSpace(data.space);}else{const src=URL.createObjectURL(draft);if(demo.audio.startsWith("blob:"))URL.revokeObjectURL(demo.audio);setDemo(old=>({...old,holder:1-old.side,revision:old.revision+1,listened:false,audio:src,duration:draftSeconds}));}
    setDraft(null);
  }catch(e){
    if(space){try{const latest=await request("/api/space");if(latest.space&&latest.space.id===space.id&&latest.space.revision>(draftRevision.current??space.revision)){setSpace(latest.space);setDraft(null);setError("The space has moved. Check its current turn before recording again.");return;}}catch{}}
    setError((e as Error).message);
  }finally{setBusy(false);}}
  async function connect(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");stopAudio();try{const data=await request("/api/space",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:invite?"join":"create",name:yourName,invite,credential:onboardingCredential()})});if(!data.space)throw new Error("Your space couldn’t open. Please try again.");finishOnboarding();history.replaceState(null,"",location.pathname);setSpace(data.space);setDraft(null);setRecoveryCode("");setDialog(data.space.pending?"invite":null);setInvite("");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function restore(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{
    const data=await request("/api/space",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"restore",code:restoreCode.trim(),credential:onboardingCredential()})});
    if(!data.space)throw new Error("Your space couldn’t open. Please try again.");
    finishOnboarding();setSpace(data.space);setRestoreCode("");setRecoveryCode("");setDraft(null);setDialog("settings");
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function revealRecovery(){setBusy(true);setError("");try{const data=await request("/api/space",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"recovery"})});setRecoveryCode(data.recoveryCode||"");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function endSpace(){if(!endConfirmed)return;setBusy(true);setError("");stopAudio();try{
    await request("/api/space",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"end"})});
    clearSession();finishOnboarding();setSpace(null);setDraft(null);setRecoveryCode("");setEndConfirmed(false);setDialog(null);setDemo(initialDemo);setError("The space has ended for both of you. Audio access has been removed and storage deletion requested.");
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function skipBrokenAudio(){setBusy(true);try{await request("/api/space",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"skip",revision:space?.revision})});setSpace(old=>old?{...old,listened:true}:old);setAudioFailed(false);setError("");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  function switchSide(){stopAudio();setDraft(null);setError("");setDemo(old=>({...old,side:1-old.side}));}
  const invitation=space?.invite&&typeof window!=="undefined"?`${window.location.origin}${ASSET_BASE}#join=${space.invite}`:"";
  async function copyInvite(){try{await navigator.clipboard.writeText(invitation);setCopied(true);}catch{setError("Select and copy your invitation link below.");}}
  function openConnect(){setError("");setCopied(false);setDialog(space?.pending?"invite":"connect");}
  const stateLabel=!loaded?"RESTORING YOUR SPACE":pending?"WAITING TO CONNECT":!mine?"WITH YOUR PERSON":recording?"RECORDING":draft?"READY TO PASS":"YOUR TURN";
  const title=!loaded?"One moment.":pending?"It starts with two.":!mine?`It’s with ${partner}.`:recording?"Just be yourself.":draft?"A little of you.":"It’s with you.";
  const subtitle=!loaded?"Finding your end of the conversation.":pending?"Invite your person to hold the other end.":!mine?"Your part is done. Let life happen in between.":recording?"A thought, a story, or simply hello.":draft?"Take a listen, then pass it across.":incoming?`${partner} left a little something for you.`:"Leave a little of your day here.";
  const buttonLabel=pending?"Invite your person":!mine?"Waiting for it to come back":recording?"Finish recording":draft?"Pass it to "+partner:incoming?(playing?"Pause":"Listen to "+partner):"Record your reply";
  const primaryAction=()=>{if(!loaded||busy)return;if(pending)openConnect();else if(recording)recorder.current?.stop();else if(draft)void pass();else if(incoming)void play("incoming");else void record();};

  const stateRef=useRef({preview:true,holder:"You",state:stateLabel});stateRef.current={preview:!live,holder:mine?you:partner,state:stateLabel};
  useEffect(()=>{
    type Tool={name:string;description:string;inputSchema:object;annotations:object;execute:(input:unknown)=>unknown};
    const context=(document as Document&{modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
    if(!context?.registerTool)return;const lifecycle=new AbortController();
    const validate=(input:unknown)=>{if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).length)throw new Error("Expected an empty object.");};
    try{void Promise.resolve(context.registerTool({name:"get_shared_space_state",description:"Read who holds the shared voice space, whether this is a preview, and the current conversation state.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){validate(input);return stateRef.current;}},{signal:lifecycle.signal})).catch(()=>{});}catch{}
    return()=>lifecycle.abort();
  },[]);

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href={ASSET_BASE} aria-label="Tether home"><span className="brand-mark"><i/><i/></span>tether<span className="brand-period">.</span></a><span className="header-note">A space for two.</span><button className="text-button" onClick={()=>setDialog("help")}>How it works <ArrowUpRight size={15}/></button></header>
    <main className="main-wrap"><div className="space-heading"><div><p className="eyebrow">A CONNECTION WORTH KEEPING</p><h2>Your shared space<span>.</span></h2></div>{(!live||pending)&&<button className="outline-button" disabled={busy||recording||!loaded} onClick={openConnect}>{live?"Your invitation":"Make it yours"} <ArrowUpRight size={15}/></button>}</div>
      <section className={`space-card ${!mine?"is-away":""} ${recording||playing?"is-sounding":""} ${busy&&draft?"is-passing":""}`}>
        <div className="card-top"><span className="space-id">{live?`${you} & ${space.partner||"…"}`:"YOU & HARRY"}{!live&&<span className="preview-tag">PREVIEW</span>}</span><span className="private-label"><LockKeyhole size={13}/> A space for two</span></div>
        <div className="connection"><div className={`person ${mine?"active":""}`}><span className="avatar you">{you.charAt(0).toUpperCase()}</span><span>{you}</span></div><div className="connection-line"><span className="traveler"/></div><div className={`person ${!mine?"active":""}`}><span className="avatar them">{pending?"?":partner.charAt(0).toUpperCase()}</span><span>{pending?"Your person":partner}</span></div></div>
        <div className="state-copy" aria-live="polite"><span className="status-pill"><i/>{stateLabel}</span><h1>{title}</h1><p>{subtitle}</p></div>
        <div className="object-stage"><button className="voice-object" disabled={!loaded||!mine||busy||pending} onClick={()=>draft?void play("draft"):primaryAction()} aria-label={draft?(playing==="draft"?"Pause recording preview":"Preview your recording"):buttonLabel}><span className="object-shine"/><span className="voice-wave">{wave.map((h,i)=><i key={i} style={{height:h,animationDelay:`${i*.07}s`}}/>)}</span></button><div className="object-shadow"/>{(recording||playing)&&<span className="record-time">{format(recording?seconds:progress)}<span> / {recording?"2:00":format(playing==="draft"?draftSeconds:duration)}</span></span>}</div>
        <div className="actions">
          <button className="primary-button" disabled={!loaded||busy||(!mine&&!pending)} onClick={primaryAction}>{pending?<ArrowRight size={16}/>:!mine?<span className="waiting-dot"/>:recording?<Square size={14} fill="currentColor"/>:draft?<ArrowRight size={16}/>:incoming?(playing?<Pause size={16} fill="currentColor"/>:<Play size={15} fill="currentColor"/>):<Mic size={16}/>} {busy?(draft?"Passing it across…":"One moment…"):buttonLabel}{incoming&&!recording&&!draft&&<span className="button-duration">{format(duration)}</span>}</button>
          {draft&&mine?<div className="draft-tools"><button onClick={()=>void play("draft")} disabled={busy}>{playing==="draft"?<Pause size={12}/>:<Headphones size={12}/>} Listen back</button><span>·</span><button disabled={busy} onClick={()=>{stopAudio();setDraft(null);void record();}}><RotateCcw size={12}/> Record again</button></div>:<span className="action-hint">{recording?"Up to two minutes. There’s no perfect thing to say.":pending?"One invitation. One other person.":!mine?"This space will wake up when they pass it back.":incoming?<><Volume2 size={13}/> A voice, a moment, just for you.</>:<>Shared with your person. No public feed.</>}</span>}
          {live&&mine&&hasAudio&&listened&&!recording&&!draft&&<button className="sample-button" disabled={busy} onClick={()=>void play("incoming")}>{playing==="incoming"?"Pause":"Listen again"}</button>}
          {live&&audioFailed&&incoming&&<button className="sample-button" disabled={busy} onClick={()=>void skipBrokenAudio()}>Can’t play this recording? Continue with a reply</button>}
          {!live&&mine&&!incoming&&!draft&&!recording&&<button className="sample-button" disabled={!loaded||busy} onClick={()=>void sample()}>Or try a sample reply</button>}
        </div>
        {error&&<p role="alert" className="inline-error">{error}</p>}
        <div className="card-bottom"><span className="small-mark"><i/><i/></span><p>Listen. Take your time. Pass it on.</p><span className="bottom-detail">No rush. No noise.</span></div>
      </section>
      <div className="under-card"><span className="mini-orbit"/><p>One shared space. It only moves when you do.</p></div>
      {!live&&<div className="demo-controls"><span>You’re trying a sample space.</span><button disabled={!loaded||recording||busy} onClick={switchSide}>Try {demo.side===0?"Harry’s":"your"} side <ArrowRight size={12}/></button></div>}
    </main>
    <footer className="site-footer"><span>A little less scrolling. A little more connection.</span><span><a href="https://leolune.com" target="_blank" rel="noreferrer">made by leo</a> · <button className="footer-link" onClick={()=>setDialog("privacy")}>Privacy</button> · <button className="footer-link" disabled={!loaded||busy||recording} onClick={()=>{setError("");setRecoveryCode("");setEndConfirmed(false);setDialog(live?"settings":"restore");}}>{live?"Space settings":"Restore a space"}</button></span></footer>
    <Dialog open={dialog!==null} onOpenChange={open=>{if(!open&&!busy){setDialog(null);setError("");}}}><DialogContent className="tether-dialog"><DialogHeader><span className="dialog-mark"><span className="brand-mark"><i/><i/></span></span><DialogTitle>{dialog==="settings"?"Your end of the space.":dialog==="restore"?"Welcome back.":dialog==="privacy"?"A small, private space.":dialog==="help"?"A conversation you share.":dialog==="invite"?"The other end is theirs.":invite?"Someone saved you a space.":"Who’s your person?"}</DialogTitle><DialogDescription>{dialog==="settings"?"Save access for later, or end the conversation.":dialog==="restore"?"Use your recovery code to move your end to this browser.":dialog==="privacy"?"What Tether keeps, and what it doesn’t.":dialog==="help"?"One space that travels between the two of you.":dialog==="invite"?"Send this invitation to the one person you want here.":invite?"Add your name to take the other end.":"Start with your name. Then invite someone to hold the other end."}</DialogDescription></DialogHeader>
      {dialog==="settings"?<div className="settings-content">
        <p className="dialog-note">Keep your recovery code somewhere safe. Anyone with it can take your end of this space. Restoring on another device revokes this device and the old code.</p>
        {recoveryCode?<><label className="field-label" htmlFor="recovery-code">Your private recovery code</label><textarea id="recovery-code" className="name-input" readOnly value={recoveryCode} onFocus={e=>e.target.select()}/><p className="dialog-note">Save this code in a password manager. After restoring, save the new code.</p></>:<button className="outline-button" disabled={busy} onClick={()=>void revealRecovery()}>Show recovery code</button>}
        <hr/><p className="dialog-note">Ending this space removes access for both people and requests deletion of its recordings. This cannot be undone.</p>
        <label className="end-confirm"><input type="checkbox" checked={endConfirmed} onChange={e=>setEndConfirmed(e.target.checked)}/> End this space for both of us</label>
        <button className="primary-button" disabled={busy||!endConfirmed} onClick={()=>void endSpace()}>End and delete space</button>
      </div>:dialog==="restore"?<form onSubmit={restore}><label className="field-label" htmlFor="restore-code">Recovery code</label><textarea id="restore-code" className="name-input" value={restoreCode} onChange={e=>setRestoreCode(e.target.value)} autoComplete="off" spellCheck={false} required/><p className="dialog-note">Your old device and recovery code will lose access. Without a saved code or an accessible device, we cannot restore your end.</p><button className="primary-button" disabled={busy||!restoreCode.trim()} type="submit">Restore my space</button></form>:dialog==="privacy"?<div className="settings-content"><p>Only the two participants can open a space through the app. Tether is not end-to-end encrypted: its hosting service can access stored audio.</p><p>We store your names, access credentials as hashes, invitation, turn state, and current recording. Passing replaces the recording and requests deletion of the previous one.</p><p>Inactive spaces currently remain until someone ends them. Ending removes access immediately; storage deletion is retried if it fails. Backup retention has not yet been verified for public launch.</p><p>This browser stores your access credential. Unsaved drafts stay in this tab and are lost if you close or reload it.</p><a href="https://github.com/leolunelove/tether/issues" target="_blank" rel="noreferrer">Report a problem</a><p>Reports are public. Never include recordings, invitations, or recovery codes.</p></div>:dialog==="help"?<><div className="how-steps"><div><span>01</span><section><h3>When it’s yours, be here.</h3><p>Listen to what they left. Record a little something back.</p></section></div><div><span>02</span><section><h3>Pass it across.</h3><p>Your voice replaces the last recording, and the space becomes theirs.</p></section></div><div><span>03</span><section><h3>Let the in-between be.</h3><p>There’s no feed or message history. You can continue when they pass it back.</p></section></div></div><button className="primary-button" onClick={()=>setDialog(null)}>Back to your space <ArrowRight size={16}/></button></>:dialog==="invite"?<><label className="field-label" htmlFor="invite-link">Your invitation</label><div className="invite-field"><input id="invite-link" value={invitation} readOnly onFocus={e=>e.target.select()}/><button aria-label="Copy invitation" onClick={()=>void copyInvite()}>{copied?<Check size={18}/>:<Copy size={18}/>}</button></div><p className="dialog-note">{copied?"Invitation copied. Pass it to your person.":"This invitation can be used once. Keep it just between the two of you."}</p><button className="primary-button" onClick={()=>setDialog(null)}>I’ll be here</button></>:<form onSubmit={connect}><label className="field-label" htmlFor="your-name">Your first name</label><input id="your-name" className="name-input" placeholder="What should they call you?" value={yourName} onChange={e=>setYourName(e.target.value)} maxLength={24} required autoComplete="given-name" autoFocus/><p className="dialog-note">This browser keeps your end. After joining, save your recovery code in Space settings before clearing browser data or changing devices.</p><button className="primary-button" type="submit" disabled={busy||!yourName.trim()||!loaded}>{busy?"Making room…":invite?"Join your person":"Create our space"}<ArrowRight size={16}/></button></form>}
      {error&&<p role="alert" className="inline-error">{error}</p>}
    </DialogContent></Dialog>
  </div>;
}
