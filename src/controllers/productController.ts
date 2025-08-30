import { NextFunction, Request, Response } from "express";
import { createProductService, deleteProductService, getAllProductsService, getProductDetailService, updateProductService } from "../services/productService";


export async function getProductsController(req:Request,res:Response,next:NextFunction){
    try{
    let productsList=await getAllProductsService();
    res.status(200).json({message:"Product retreived successfully",products:productsList});
    }
    catch(err){
       console.log(err);
       next(err);
    }
}

export async function getProductDetailController(req:Request,res:Response,next:NextFunction){
    try{
        let product=await getProductDetailService(req.params.id);
        res.status(200).json({message:"Products retreived successfully",products:product});
        }
        catch(err){
           console.log(err);
           next(err);
        }
}

export async function deleteProductController(req:Request,res:Response,next:NextFunction){
try{
   const deleteCount=await deleteProductService(req.params.id);
   res.status(204).json({message:"Product deleted successfully",count:deleteCount});
}
catch(err){
    console.log(err);
    next(err);
}

}

export async function createProductController(req:Request,res:Response,next:NextFunction){
    try{
    const newProduct=await createProductService(req.body);
     res.status(201).json({message:"Product created successfully",products:newProduct});
    }
    catch(err){
        console.log(err);
        next(err);
    }
}

export async function updateProductController(req:Request,res:Response,next:NextFunction){
    try{
       const updatedProduct=updateProductService(req.params.id,req.body);
       res.status(200).json({message:"Product updated successfully",products:updatedProduct})
    }
    catch(err){
        next(err);
    }
}