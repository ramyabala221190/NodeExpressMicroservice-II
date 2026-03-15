import { DeleteResult, UpdateResult } from "mongoose";
import { ExplicitError } from "../app";

export function hasUpdateSucceeded(result:UpdateResult){
   if(!result.acknowledged){
     throw new ExplicitError(`Update not acknowledged`,500);
   }
   if(result.matchedCount === 0){
    throw new ExplicitError(`No documents matched`,404);
   }
   if(result.modifiedCount === 0){
    throw new ExplicitError(`Documents matched but not modified`,500);
   }
   return true;
}

export function hasDeleteSucceeded(result:DeleteResult){
   if(!result.acknowledged){
     throw new ExplicitError(`Update not acknowledged`,500);
   }
   if(result.deletedCount === 0){
    throw new ExplicitError(`Document not deleted`,500);
   }
   return true;
}
