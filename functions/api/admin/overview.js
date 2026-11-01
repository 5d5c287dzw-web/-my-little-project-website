import {requireStaff,staffJson} from "./staff-auth.js";
// Private administrative overview: deliberately returns no customer or order data.
export async function onRequestGet({request,env}){
 try{
  await requireStaff(request,env,"admin");
  return staffJson({status:"ready",modules:{products:"not_connected",suppliers:"not_connected",orders:"not_connected"},dataLive:false});
 }catch(error){
  return staffJson({error:error.status?"access_denied":"temporarily_unavailable"},error.status||503);
 }
}
