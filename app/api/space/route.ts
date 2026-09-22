import { withCors, preflight, PAGES_ORIGIN } from "@/lib/space-server";
import { cookie,current,db,failure,hash,json,name,sameOrigin,SpaceError,token,view,type SpaceRow } from "@/lib/space-server";
async function handleGET(req:Request){try{const found=await current(req);return json({space:found?view(found.row,found.side):null});}catch(e){return failure(e);}}
async function handlePOST(req:Request){try{
  sameOrigin(req);
  if(Number(req.headers.get("content-length"))>4096)throw new SpaceError("That request is too large.",413);
  const body=await req.json() as Record<string,unknown>;
  const found=await current(req);
  if(body.action==="listened"){
    if(!found)throw new SpaceError("Open your shared space first.",401);
    const {row,side}=found;
    if(row.holder!==side||row.revision!==body.revision)throw new SpaceError("The space has already moved. Refresh to catch up.",409);
    await db().prepare("UPDATE spaces SET listened = 1 WHERE id = ? AND holder = ? AND revision = ?").bind(row.id,side,row.revision).run();
    return json({ok:true});
  }
  if(body.action!=="create"&&body.action!=="join")throw new SpaceError("Unknown action.");
  if(found)throw new SpaceError("This browser already holds one end of a space.",409);
  const userName=name(body.name), raw=token(), key=await hash(raw);
  let row:SpaceRow|null=null;let side=0;
  if(body.action==="create"){
    const id=crypto.randomUUID(),invite=token();
    await db().prepare("INSERT INTO spaces (id,a_token,a_name,invite,updated_at) VALUES (?,?,?,?,?)").bind(id,key,userName,invite,Date.now()).run();
    row=await db().prepare("SELECT * FROM spaces WHERE id = ?").bind(id).first<SpaceRow>();
  }else{
    if(typeof body.invite!=="string"||body.invite.length>80)throw new SpaceError("This invitation isn’t valid.");
    row=await db().prepare("UPDATE spaces SET b_token = ?, b_name = ?, invite = NULL, updated_at = ? WHERE invite = ? AND b_token IS NULL RETURNING *").bind(key,userName,Date.now(),body.invite).first<SpaceRow>();
    if(!row)throw new SpaceError("This invitation has already been used or is no longer available.",409);
    side=1;
  }
  if(!row)throw new SpaceError("We couldn’t create your space. Please try again.",503);
  return json({space:view(row,side),...(req.headers.get("origin")===PAGES_ORIGIN?{sessionToken:raw}:{})},200,{"Set-Cookie":cookie(req,raw)});
}catch(e){return failure(e);}}

export async function GET(req:Request){return withCors(req,await handleGET(req));}
export async function POST(req:Request){return withCors(req,await handlePOST(req));}
export function OPTIONS(req:Request){return preflight(req);}
