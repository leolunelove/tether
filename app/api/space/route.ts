import { withCors, preflight, PAGES_ORIGIN, cookie,current,db,failure,hash,json,name,sameOrigin,session,SpaceError,token,view,readJson,cleanupVoices,limitAction,type SpaceRow } from "@/lib/space-server";
async function handleGET(req:Request){try{const found=await current(req);return json({space:found?view(found.row,found.side):null});}catch(e){return failure(e);}}
function opened(req:Request,row:SpaceRow,side:number,raw:string){return json({space:view(row,side),...(req.headers.get("origin")===PAGES_ORIGIN?{sessionToken:raw}:{})},200,{"Set-Cookie":cookie(req,raw)});}
async function handlePOST(req:Request){try{
  sameOrigin(req);const body=await readJson(req);const found=await current(req);
  if(body.action==="end"){
    if(found){
      await db().batch([
        db().prepare("INSERT OR IGNORE INTO voice_cleanup (prefix) SELECT 'voices/' || id || '/' FROM spaces WHERE id = ?").bind(found.row.id),
        db().prepare("DELETE FROM spaces WHERE id = ?").bind(found.row.id)
      ]);
      await cleanupVoices();
    }
    return json({space:null,ok:true},200,{"Set-Cookie":cookie(req,"").replace("Max-Age=31536000","Max-Age=0")});
  }
  if(body.action==="recovery"){
    if(!found)throw new SpaceError("Open your shared space first.",401);
    return json({recoveryCode:session(req)});
  }
  if(body.action==="listened"||body.action==="skip"){
    if(!found)throw new SpaceError("Open your shared space first.",401);
    const {row,side}=found;
    if(row.holder!==side||row.revision!==body.revision)throw new SpaceError("The space has already moved. Refresh to catch up.",409);
    await db().prepare("UPDATE spaces SET listened = 1 WHERE id = ? AND holder = ? AND revision = ?").bind(row.id,side,row.revision).run();
    return json({ok:true});
  }
  if(!["create","join","restore","resume"].includes(String(body.action)))throw new SpaceError("Unknown action.");
  const raw=typeof body.credential==="string"?body.credential:token();
  if(!/^[a-zA-Z0-9-]{60,80}$/.test(raw))throw new SpaceError("Your recovery credential isn’t valid.");
  const key=await hash(raw);
  const existing=await db().prepare("SELECT * FROM spaces WHERE a_token = ? OR b_token = ?").bind(key,key).first<SpaceRow>();
  if(existing){
    if(found&&found.row.id!==existing.id)throw new SpaceError("End your current space before restoring another.",409);
    return opened(req,existing,existing.a_token===key?0:1,raw);
  }
  if(body.action==="resume")return json({space:null});
  if(found)throw new SpaceError("This browser already holds one end of a space. Open Space settings to end it first.",409);
  const address=req.headers.get("cf-connecting-ip");
  if(address)await limitAction(`onboarding:${address}`,30,60*60*1000);
  let row:SpaceRow|null=null;let side=0;
  if(body.action==="restore"){
    if(typeof body.code!=="string"||!/^[a-zA-Z0-9-]{60,80}$/.test(body.code))throw new SpaceError("Enter your complete recovery code.");
    const old=await hash(body.code);
    row=await db().prepare("UPDATE spaces SET a_token = CASE WHEN a_token = ? THEN ? ELSE a_token END, b_token = CASE WHEN b_token = ? THEN ? ELSE b_token END WHERE a_token = ? OR b_token = ? RETURNING *").bind(old,key,old,key,old,old).first<SpaceRow>();
    if(!row)throw new SpaceError("That recovery code has expired or the space has ended.",409);
    side=row.a_token===key?0:1;
  }else if(body.action==="create"){
    await db().prepare("INSERT OR IGNORE INTO spaces (id,a_token,a_name,invite,updated_at) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),key,name(body.name),token(),Date.now()).run();
    row=await db().prepare("SELECT * FROM spaces WHERE a_token = ?").bind(key).first<SpaceRow>();
  }else{
    if(typeof body.invite!=="string"||body.invite.length>80)throw new SpaceError("This invitation isn’t valid.");
    row=await db().prepare("UPDATE spaces SET b_token = ?, b_name = ?, invite = NULL, updated_at = ? WHERE invite = ? AND b_token IS NULL RETURNING *").bind(key,name(body.name),Date.now(),body.invite).first<SpaceRow>();
    // A concurrent retry may have completed the join already.
    if(!row)row=await db().prepare("SELECT * FROM spaces WHERE b_token = ?").bind(key).first<SpaceRow>();
    if(!row)throw new SpaceError("This invitation has already been used or is no longer available.",409);
    side=1;
  }
  if(!row)throw new SpaceError("We couldn’t open your space. Please try again.",503);
  return opened(req,row,side,raw);
}catch(e){return failure(e);}}
export async function GET(req:Request){return withCors(req,await handleGET(req));}
export async function POST(req:Request){return withCors(req,await handlePOST(req));}
export function OPTIONS(req:Request){return preflight(req);}
