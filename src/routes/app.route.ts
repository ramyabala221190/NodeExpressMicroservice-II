import express, { NextFunction, Request, Response } from "express";

const appRouter= express.Router();

appRouter.get('/',(req:Request,res:Response,next:NextFunction)=>{
    res.status(200).send("Hey You are sucessfully connected to express server");
})


export default appRouter;