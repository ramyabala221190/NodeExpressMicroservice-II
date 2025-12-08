import express from "express";
// import { createProductController, deleteProductController, getProductDetailController, 
//     getProductsController, sendMessageToCartMicroservice, updateProductController, welcomeProductController } from "../controllers/productController";

import productController from "../controllers/productController";

const productRouter= express.Router();


productRouter.route('/')
.get(productController.welcomeProductController);

productRouter.route('/carts')
.get(productController.sendMessageToCartMicroservice);

productRouter.route('/products')
.get(productController.getProductsController)
.post(productController.createProductController);

productRouter.route('/products/:id')
.get(productController.getProductDetailController)
.delete(productController.deleteProductController)
.put(productController.updateProductController);


export default productRouter;