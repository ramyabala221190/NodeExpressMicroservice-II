import { NextFunction, Request, Response } from "express";
// import { createProductService, deleteProductService, getAllProductsService, 
//     getProductDetailService, messageToCartMicroservice, updateProductService } from "../services/productService";

import productService from '../services/productService';
import { ProductModel } from "../models/productModel";

class ProductController {

    constructor() {
        console.log("instance of ProductController")
    }

    async welcomeProductController(req: Request, res: Response, next: NextFunction) {
        res.status(200).send(`Hey You are sucessfully connected to the ProductsMicroservice in ${process.env.APP_ENV} environment 
        on port ${process.env.APP_HTTP_PORT}.\n
        Your API Gateway routing this request is ${process.env.API_GATEWAY} on port ${process.env.API_GATEWAY_PORT}.    
        `);
    }

    //  async getMultipleProductDetailController(req:Request,res:Response,next:NextFunction){
    //     try{
    //       let products:ProductModel[]=await productService.getMultipleProductDetailService(req.body.productIds);
    //       res.status(200).json({message:"Product(s) Detail retreived successfully",products:products})
    //     }
    //     catch(err){
    //         next(err);
    //     }
    //  }

    async mapProductIdsToDetail(req: Request, res: Response, next: NextFunction) {
        try {
            let product = await productService.mapProductIdsToDetailService(req.body.productIds);
            if (!product) {
                res.status(404).json({ message: "Product not found", product: null })
            }
            res.status(200).json({ message: "Product Detail retreived successfully", product: product });
        }
        catch (err) {
            next(err);
        }
    }

    async mapObjectIdsToDetail(req: Request, res: Response, next: NextFunction) {
        try {
            let product = await productService.mapObjectIdsToDetailService(req.body.productIds);
            if (!product) {
                res.status(404).json({ message: "Product not found", product: null })
            }
            res.status(200).json({ message: "Product Detail retreived successfully", product: product });
        }
        catch (err) {
            next(err);
        }
    }

    async getAllProductsController(req: Request, res: Response, next: NextFunction) {
        try {
            let productsList = await productService.getAllProductsService();
            res.status(200).json({ message: "Product retreived successfully", products: productsList });
        }
        catch (err) {
            next(err);
        }
    }

    async sendMessageToCartMicroservice(req: Request, res: Response, next: NextFunction) {
        try {
            let carts = await productService.messageToCartMicroservice();
            res.status(200).json({ message: "Carts retreived successfully", carts: carts });
        }
        catch (err) {
            next(err);
        }
    }



    async deleteProductController(req: Request, res: Response, next: NextFunction) {
        try {
            const deleteCount = await productService.deleteProductService(req.params.id);
            res.status(204).json({ message: "Product deleted successfully", count: deleteCount });
        }
        catch (err) {
            next(err);
        }

    }

    async createProductController(req: Request, res: Response, next: NextFunction) {
        try {
            const newProduct = await productService.createProductService(req.body);
            res.status(201).json({ message: "Product created successfully", products: newProduct });
        }
        catch (err) {
            next(err);
        }
    }

    async updateProductStockController(req: Request, res: Response, next: NextFunction) {
        try {
            await productService.updateProductStockService(req.body.productList);
            res.status(200).json({ message: "Product stock updated" });
        }
        catch (err) {
            next(err);
        }
    }

    async addProductReview(req: Request, res: Response, next: NextFunction) {
        try {
            await productService.createProductReviewService(req.params.productId, req.body.newReview);
            res.status(200).json({ message: "Added review successfully" })
        }
        catch (err) {
            next(err);
        }
    }

    async updateProductReview(req: Request, res: Response, next: NextFunction) {
        try {
            await productService.updateProductReviewService(req.params.productId,req.params.reviewId, req.body.updatedReview);
            res.status(200).json({ message: "Updated review successfully" })
        }
        catch (err) {
            next(err);
        }
    }

    async updateProductController(req: Request, res: Response, next: NextFunction) {
        try {
            const updatedProduct = productService.updateProductService(req.params.id, req.body);
            res.status(200).json({ message: "Product updated successfully", products: updatedProduct })
        }
        catch (err) {
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