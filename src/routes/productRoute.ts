import express from "express";
import { createProductController, deleteProductController, getProductDetailController, 
    getProductsController, updateProductController } from "../controllers/productController";

const productRouter= express.Router();

productRouter.route('/products')
.get(getProductsController)
.post(createProductController);

productRouter.route('/products/:id')
.get(getProductDetailController)
.delete(deleteProductController)
.put(updateProductController);


export default productRouter;