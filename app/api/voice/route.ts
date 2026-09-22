import { withCors, preflight, PAGES_ORIGIN } from "@/lib/space-server";
import { bucket,current,db,failure,json,sameOrigin,SpaceError,view,type SpaceRow } from "@/lib/space-server";
async function handleGET(req:Request){try{
  const found=await current(req);
  if(!found)throw new SpaceError("Open your shared space first.",401);
  if(found.row.holder!==found.side||!found.row.audio_key)throw new SpaceError("There’s no voice here to listen to yet.",403);
  const audio=await bucket().get(found.row.audio_key);if(!audio)throw new SpaceError("This recording is unavailable. Please try again.",503);
  return new Response(audio.body,{headers:{"Content-Type":found.row.audio_type||"audio/webm","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Length":String(audio.size)}});
}catch(e){return failure(e);}}
async function handlePOST(req:Request){let uploaded:string|null=null;try{
  sameOrigin(req);const found=await current(req);
  if(!found)throw new SpaceError("Open your shared space first.",401);
  const {row,side}=found;
  if(!row.b_token)throw new SpaceError("Your person needs to join before you can pass it.",409);
  if(row.holder!==side)throw new SpaceError("It’s with your person. Wait for them to pass it back.",409);
  if(!row.listened)throw new SpaceError("Listen to your person before replying.",409);
  const limit=9*1024*1024;
  if(Number(req.headers.get("content-length"))>limit)throw new SpaceError("Keep your recording under two minutes.",413);
  const reader=req.body?.getReader();if(!reader)throw new SpaceError("Record something first.");
  let size=0;const chunks:Uint8Array<ArrayBuffer>[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new SpaceError("Keep your recording under two minutes.",413);}chunks.push(value);}
  const form=await new Response(new Blob(chunks),{headers:{"Content-Type":req.headers.get("content-type")||""}}).formData();
  const file=form.get("audio"),duration=Number(form.get("duration")),revision=Number(form.get("revision"));
  if(!(file instanceof File)||!file.size||file.size>8*1024*1024)throw new SpaceError("Please record a short voice message first.");
  if(!["audio/webm","audio/mp4","audio/ogg","audio/wav"].includes(file.type.split(";")[0]))throw new SpaceError("Your browser’s audio format isn’t supported.");
  if(!Number.isFinite(duration)||duration<1||duration>120)throw new SpaceError("Record between one second and two minutes.");
  if(revision!==row.revision)throw new SpaceError("The space has already moved. Refresh to catch up.",409);
  const nextKey=`voices/${row.id}/${crypto.randomUUID()}`;
  await bucket().put(nextKey,file.stream(),{httpMetadata:{contentType:file.type}});uploaded=nextKey;
  const updated=await db().prepare("UPDATE spaces SET holder = ?, revision = revision + 1, listened = 0, audio_key = ?, audio_type = ?, duration = ?, updated_at = ? WHERE id = ? AND holder = ? AND revision = ? AND listened = 1 RETURNING *").bind(1-side,nextKey,file.type,Math.round(duration),Date.now(),row.id,side,row.revision).first<SpaceRow>();
  if(!updated)throw new SpaceError("The space has already moved. Refresh to catch up.",409);
  uploaded=null;
  if(row.audio_key){try{await bucket().delete(row.audio_key);}catch(e){console.error("Old voice cleanup failed",e);}}
  return json({space:view(updated,side)});
}catch(e){if(uploaded){try{await bucket().delete(uploaded);}catch(cleanup){console.error("Voice cleanup failed",cleanup);}}return failure(e);}}

export async function GET(req:Request){return withCors(req,await handleGET(req));}
export async function POST(req:Request){return withCors(req,await handlePOST(req));}
export function OPTIONS(req:Request){return preflight(req);}
