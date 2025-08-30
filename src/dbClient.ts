import * as mongoose from 'mongoose';
import { ConnectOptions } from 'mongoose';
import { CustomError } from './app';

const uri=`mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}`;
/**
 * mongodb://  A prefix that identifies this as a string in the standard connection format.
 * db:27017 is the host:port
 * myApp is a collection
 */

const dbOptions:ConnectOptions={
    serverSelectionTimeoutMS:5000,
    socketTimeoutMS:45000,
    autoIndex:true //tells mongoose to auto manage the id properties on the documents we create
}

export async function connect(){
    try{
    await mongoose.connect(uri,dbOptions);
    console.log("Successfully connected to Mongo");
    }
    catch(err){
        console.log(err);
    }
}

export async function disconnect(){
try{
   await mongoose.disconnect();
   console.log("Successfully disconnected from Mongo");
}
catch(err){
    console.log(err);
    throw new Error(`Error disconnecting from mongo: ${err}`)
}


}

