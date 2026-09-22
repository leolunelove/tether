import { env } from "cloudflare:workers";
export type SpaceRow = {id:string;a_token:string;b_token:string|null;a_name:string;b_name:string|null;invite:string|null;holder:number;revision:number;listened:number;audio_key:string|null;audio_type:string|null;duration:number;updated_at:number};
export class SpaceError extends Error { constructor(message:string, public status=400){super(message);} }
export function db(){if(!env.DB) throw new SpaceError("Your space is temporarily unavailable. Please try again.",503);return env.DB;}
export function bucket(){if(!env.BUCKET) throw new SpaceError("Voice storage is temporarily unavailable. Your recording is still here.",503);return env.BUCKET;}
export function token(){return crypto.randomUUID()+crypto.randomUUID().replaceAll("-","");}
export async function hash(value:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");}
export const PAGES_ORIGIN="https://leolunelove.github.io";
export function session(req:Request){const bearer=req.headers.get("authorization");if(bearer){const value=bearer.startsWith("Bearer ")?bearer.slice(7):"";return /^[a-zA-Z0-9-]{60,80}$/.test(value)?value:null;}if(req.headers.get("origin")===PAGES_ORIGIN)return null;const raw=req.headers.get("cookie")?.split(";").map(s=>s.trim()).find(s=>s.startsWith("tether_session="))?.slice(15);return raw && /^[a-zA-Z0-9-]{60,80}$/.test(raw)?raw:null;}
export function cookie(req:Request,value:string){return `tether_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${new URL(req.url).protocol==="https:"?"; Secure":""}`;}
export async function current(req:Request){const raw=session(req);if(!raw)return null;const key=await hash(raw);const row=await db().prepare("SELECT * FROM spaces WHERE a_token = ? OR b_token = ?").bind(key,key).first<SpaceRow>();return row?{row,side:row.a_token===key?0:1}:null;}
export function view(row:SpaceRow,side:number){return {id:row.id,you:side===0?row.a_name:row.b_name,partner:side===0?row.b_name:row.a_name,pending:!row.b_token,mine:row.holder===side,revision:row.revision,listened:!!row.listened,hasAudio:!!row.audio_key,duration:row.duration,invite:side===0&&!row.b_token?row.invite:null};}
export function json(data:unknown,status=200,headers:Record<string,string>={}){return Response.json(data,{status,headers:{"Cache-Control":"no-store",...headers}});}
export function failure(error:unknown){if(error instanceof SpaceError)return json({error:error.message},error.status);console.error("Tether storage error",error);return json({error:"Your space is temporarily unavailable. Please try again."},503);}
export function sameOrigin(req:Request){const origin=req.headers.get("origin");if(origin&&origin!==new URL(req.url).origin&&origin!==PAGES_ORIGIN)throw new SpaceError("Please open your space and try again.",403);}
export function name(value:unknown){if(typeof value!=="string"||!value.trim()||value.trim().length>24)throw new SpaceError("Use a name between 1 and 24 characters.");return value.trim();}

export function withCors(req:Request,response:Response){
  const origin=req.headers.get("origin");
  if(origin!==PAGES_ORIGIN)return response;
  const headers=new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin",origin);
  headers.set("Access-Control-Allow-Methods","GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers","Content-Type, Authorization");
  headers.set("Access-Control-Max-Age","600");
  headers.set("Vary","Origin");
  return new Response(response.body,{status:response.status,headers});
}
export function preflight(req:Request){try{sameOrigin(req);return withCors(req,new Response(null,{status:204}));}catch(error){return failure(error);}}
