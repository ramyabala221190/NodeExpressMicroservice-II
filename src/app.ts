import express from 'express';
import { NextFunction, Request, Response } from "express";
import productRouter from './routes/productRoute';
import { connectToDb } from './services/dbConnectionService';
import { join } from 'path';
import https from 'https';
import fs from 'fs';
import morganMiddleWare from './logger/morganLogger';
import winstonLogger from './logger/winstonLogger';

//custom error class for creating custom error messages
export class CustomError extends Error{
    statusCode:number=0;
    constructor(message:string,statusCode:number){
      super(message);
      this.statusCode=statusCode;
    }
  }

const app=express();

app.use(morganMiddleWare);

app.use(express.json());

app.use(express.static(join(`${process.cwd()}`,'src','public')))

app.use((req:Request,res:Response,next:NextFunction)=>{
  winstonLogger.info(`Received a request on ${req.protocol}://${req.headers.host}${req.originalUrl}`);
  next();
})

connectToDb();

app.use('/myproduct',productRouter);

app.use((req,res,next)=>{
  next(new CustomError("Path not found",404));
})

app.use((error:CustomError,req:Request,res:Response,next:NextFunction)=>{
    const statusCode= error.statusCode ? error.statusCode : 500;
    const message= error.message ? error.message : "Internal server error";
    winstonLogger.error(
      message,{
        error:error,
        stacktrace:error.stack
      }
    )
    res.status(statusCode).json({message: message ,status: statusCode})
  })

  if(process.env.APP_ENV === "prod"){
    const options = {
      key: fs.readFileSync('/var/lib/certs/product.key'), // Path to your private key
      cert: fs.readFileSync('/var/lib/certs/product.crt')  // Path to your certificate
  };
    https.createServer(options, app).listen(process.env.APP_HTTP_PORT, () => {
          winstonLogger.debug(`HTTPS server running on port ${process.env.APP_HTTP_PORT}`);
      });
    }
else{
app.listen(process.env.APP_HTTP_PORT,()=>{
     winstonLogger.debug(`Server listening on port ${process.env.APP_HTTP_PORT}`)
})
}