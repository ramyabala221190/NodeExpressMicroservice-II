import express from 'express';
import { NextFunction, Request, Response } from "express";
import productRouter from './routes/productRoute.js';
import appRouter from './routes/app.route.js';
import { connectToDb } from './services/dbConnectionService.js';

//custom error class for creating custom error messages
export class CustomError extends Error{
    statusCode:number=0;
    constructor(message:string,statusCode:number){
      super(message);
      this.statusCode=statusCode;
    }
  }

const app=express();

app.use(express.json());

connectToDb();

app.use('/',appRouter);
app.use('/web',productRouter);

app.use((error:CustomError,req:Request,res:Response,next:NextFunction)=>{
    const statusCode= error.statusCode ? error.statusCode : 500;
    const message= error.message ? error.message : "Internal server error";
    res.status(statusCode).json({message: message ,status: statusCode})
  })


app.listen(process.env.APP_HTTP_PORT,()=>{
    console.log(`Server listening on port ${process.env.APP_HTTP_PORT}`)
})