import { NextFunction, Request, Response } from "express";
// import { createProductService, deleteProductService, getAllProductsService, 
//     getProductDetailService, messageToCartMicroservice, updateProductService } from "../services/productService";

import productService from '../services/productService';

class ProductController{

    constructor(){
        console.log("instance of ProductController")
    }

    async welcomeProductController(req:Request,res:Response,next:NextFunction){
        res.status(200).send(`Hey You are sucessfully connected to the ProductsMicroservice in ${process.env.APP_ENV} environment 
        on port ${process.env.APP_HTTP_PORT}.\n
        Your API Gateway routing this request is ${process.env.API_GATEWAY} on port ${process.env.API_GATEWAY_PORT}.    
        `);
     }   
    
     async getProductsController(req:Request,res:Response,next:NextFunction){
        try{
        let productsList=await productService.getAllProductsService();
        res.status(200).json({message:"Product retreived successfully",products:productsList});
        }
        catch(err){
           next(err);
        }
    }
    
     async  sendMessageToCartMicroservice(req:Request,res:Response,next:NextFunction){
        try{
       let carts=await productService.messageToCartMicroservice();
       res.status(200).json({message:"Carts retreived successfully",carts:carts});
        }
        catch(err){
            next(err);
        }
    }
    
     async  getProductDetailController(req:Request,res:Response,next:NextFunction){
        try{
            let product=await productService.getProductDetailService(req.params.id);
            res.status(200).json({message:"Products retreived successfully",products:product});
            }
            catch(err){
               next(err);
            }
    }
    
     async  deleteProductController(req:Request,res:Response,next:NextFunction){
    try{
       const deleteCount=await productService.deleteProductService(req.params.id);
       res.status(204).json({message:"Product deleted successfully",count:deleteCount});
    }
    catch(err){
        next(err);
    }
    
    }
    
     async  createProductController(req:Request,res:Response,next:NextFunction){
        try{
        const newProduct=await productService.createProductService(req.body);
         res.status(201).json({message:"Product created successfully",products:newProduct});
        }
        catch(err){
            next(err);
        }
    }
    
     async  updateProductController(req:Request,res:Response,next:NextFunction){
        try{
           const updatedProduct=productService.updateProductService(req.params.id,req.body);
           res.status(200).json({message:"Product updated successfully",products:updatedProduct})
        }
        catch(err){
            next(err);
        }
    }
}

export default new ProductController();

//  export async function welcomeProductController(req:Request,res:Response,next:NextFunction){
//     res.status(200).send(`Hey You are sucessfully connected to the ProductsMicroservice in ${process.env.APP_ENV} environment 
//     on port ${process.env.APP_HTTP_PORT}.\n
//     Your API Gateway routing this request is ${process.env.API_GATEWAY} on port ${process.env.API_GATEWAY_PORT}.    
//     `);
//  }   

// export async function getProductsController(req:Request,res:Response,next:NextFunction){
//     try{
//     let productsList=await getAllProductsService();
//     res.status(200).json({message:"Product retreived successfully",products:productsList});
//     }
//     catch(err){
//        next(err);
//     }
// }

// export async function sendMessageToCartMicroservice(req:Request,res:Response,next:NextFunction){
//     try{
//    let carts=await messageToCartMicroservice();
//    res.status(200).json({message:"Carts retreived successfully",carts:carts});
//     }
//     catch(err){
//         next(err);
//     }
// }

// export async function getProductDetailController(req:Request,res:Response,next:NextFunction){
//     try{
//         let product=await getProductDetailService(req.params.id);
//         res.status(200).json({message:"Products retreived successfully",products:product});
//         }
//         catch(err){
//            next(err);
//         }
// }

// export async function deleteProductController(req:Request,res:Response,next:NextFunction){
// try{
//    const deleteCount=await deleteProductService(req.params.id);
//    res.status(204).json({message:"Product deleted successfully",count:deleteCount});
// }
// catch(err){
//     next(err);
// }

// }

// export async function createProductController(req:Request,res:Response,next:NextFunction){
//     try{
//     const newProduct=await createProductService(req.body);
//      res.status(201).json({message:"Product created successfully",products:newProduct});
//     }
//     catch(err){
//         next(err);
//     }
// }

// export async function updateProductController(req:Request,res:Response,next:NextFunction){
//     try{
//        const updatedProduct=updateProductService(req.params.id,req.body);
//        res.status(200).json({message:"Product updated successfully",products:updatedProduct})
//     }
//     catch(err){
//         next(err);
//     }
// }