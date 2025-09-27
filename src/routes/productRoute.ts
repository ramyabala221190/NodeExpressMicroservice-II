import express from "express";
import { createProductController, deleteProductController, getProductDetailController, 
    getProductsController, sendMessageToCartMicroservice, updateProductController, welcomeProductController } from "../controllers/productController";

const productRouter= express.Router();


productRouter.route('/')
.get(welcomeProductController);

productRouter.route('/carts')
.get(sendMessageToCartMicroservice);

productRouter.route('/products')
.get(getProductsController)
.post(createProductController);

productRouter.route('/products/:id')
.get(getProductDetailController)
.delete(deleteProductController)
.put(updateProductController);


export default productRouter;