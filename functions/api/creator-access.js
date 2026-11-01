import {requireStaff,staffJson} from "./staff-auth.js";
export async function onRequestGet({request,env}){
 try{
  await requireStaff(request,env,"creator");
  return staffJson({authorized:true,role:"creator"});
 }catch(error){
  return staffJson({authorized:false,error:error.message||"access_denied"},error.status||503);
 }
}
