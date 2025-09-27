import * as mongoose from 'mongoose';
import { ConnectOptions } from 'mongoose';
import winstonLogger from './logger/winstonLogger';

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
    winstonLogger.debug("Successfully connected to Mongo");
    }
    catch(err){
        throw new Error(`Error connecting to mongo: ${err}`)
    }
}

export async function disconnect(){
try{
   await mongoose.disconnect();
  winstonLogger.debug("Successfully disconnected from Mongo");
}
catch(err){
    throw new Error(`Error disconnecting from mongo: ${err}`)
}


}

