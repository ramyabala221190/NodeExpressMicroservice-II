import express from "express";
import productController from "../controllers/productController";

const productRouter= express.Router();


productRouter.route('/')
.get(productController.welcomeProductController);

productRouter.route('/carts')
.get(productController.sendMessageToCartMicroservice);


productRouter.route('/products')
.get(productController.getAllProductsController) // getting details for all products at a time
.post(productController.createProductController);

// getting details for multiple products at a time
productRouter.route('/products/ids')
.post(productController.mapProductIdsToDetail) 

productRouter.route('/products/internal/ids')
.post(productController.mapObjectIdsToDetail) 

productRouter.route('/product/:productId')
.delete(productController.deleteProductController)
.put(productController.updateProductController);


export default productRouter;