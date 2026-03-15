import { NextFunction, Request, Response } from "express";
import productService from '../services/productService';
import { ProductModel, ProductPayload } from "@ramyabala221190/api-contracts";

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


    async mapProductIdsToDetail(req: Request, res: Response, next: NextFunction) {
        try {
            let product:ProductModel[] = await productService.mapProductIdsToDetailService(req.body.productIds);
            if (!product.length) {
                res.status(404).json({ message: "No products found", product: null })
            }
            res.status(200).json({ message: "Product Detail retreived successfully", product: product });
        }
        catch (err) {
            next(err);
        }
    }

    async mapObjectIdsToDetail(req: Request, res: Response, next: NextFunction) {
        try {
            let product:ProductModel[] = await productService.mapObjectIdsToDetailService(req.body.productIds);
            if (!product.length) {
                res.status(404).json({ message: "Products not found", product: null })
            }
            else{
            res.status(200).json({ message: "Product Detail retreived successfully", product: product });
            }
        }
        catch (err) {
            next(err);
        }
    }

    async getAllProductsController(req: Request, res: Response, next: NextFunction) {
        try {
            let productsList:ProductModel[] = await productService.getAllProductsService();
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
            await productService.deleteProductService(req.params.id);
            res.status(204).json({ message: "Product deleted successfully" });
        }
        catch (err) {
            next(err);
        }

    }

    async createProductController(req: Request, res: Response, next: NextFunction) {
        try {
            const newProduct:ProductModel = await productService.createProductService(req.body);
            res.status(201).json({ message: "Product created successfully", product: newProduct });
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
            res.status(201).json({ message: "Added review successfully" })
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

    async updateProductDiscountController(req: Request, res: Response, next: NextFunction){
        try{
       await productService.updateProductDiscountService(req.body.categories, req.body.discountPercentage);
       res.status(200).json({message: "Discount percentage updated for the product categories"})
        }
        catch(err){
            next(err);
        }

    }

    async updateProductController(req: Request, res: Response, next: NextFunction) {
        try {
            const updatedProduct = productService.updateProductService(req.params.id, req.body);
            res.status(200).json({ message: "Product updated successfully", product: updatedProduct })
        }
        catch (err) {
            next(err);
        }
    }
}

export default new ProductController();

