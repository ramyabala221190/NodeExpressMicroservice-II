import axios from "axios";
import { CustomError, ExplicitError } from "../app";
import productModel, { ProductDocument } from "../models/productModel";
import {ProductModel, ProductPayload, ReviewModel} from '@ramyabala221190/api-contracts';
import mongoose, { UpdateResult } from "mongoose";
import { hasUpdateSucceeded } from "../helpers/updateAndDelete";
import {BulkWriteResult} from 'mongodb';
import { schemaToResponseMapper } from "../helpers/mapper";

class ProductService {

  constructor() {
    console.log("instance for Product Service created")
  }

  async getAllProductsService(): Promise<ProductModel[]> {
    try {
      const products:ProductDocument[]=await productModel.find({});
      return products.map(x=>schemaToResponseMapper(x)); //convert it into plain object
    }
    catch (err) {
      throw new CustomError(`Error fetching products:${err}`, 500);
    }
  }

  async messageToCartMicroservice() {
    try {

      let carts = await axios.get(`http://${process.env.API_GATEWAY}:${process.env.API_GATEWAY_PORT}/${process.env.CART_MICROSERVICE_MAPPING}/carts`);
      return carts.data;
    }
    catch (err) {
      throw new CustomError(`Error fetching carts:${err}`, 500);
    }
  }

  async mapProductIdsToDetailService(productIds: string[]): Promise<ProductModel[]> {
    try {
      const products: ProductDocument[] = await productModel.find({ id: { $in: productIds } }
      );
      return [...products.map(x=>schemaToResponseMapper(x))]; //convert into plain object
    }
    catch (err) {
      console.log(err);
      throw new CustomError(`Error fetching products:${err}`, 500);
    }
  }

  async updateProductDiscountService(categories: string[], discountPercentage: Number) {
    try {
      const result:UpdateResult= await productModel.updateMany(
        {
          category: { $in: categories }
        },
        {
          $set: {
            discountPercentage: discountPercentage
          }
        },
      )
      return hasUpdateSucceeded(result);
    }
    catch (err) {
      if(err instanceof ExplicitError){
       throw err;
      }
      else{
  console.log(err);
      throw new CustomError("Error updating discount for category", 500);
      }
    }
  }

  async updateProductStockService(payload: { productId: number, qty: number }[]) {
    try {
      // reducing the stock of all the products ,whose order is completed
      const result:BulkWriteResult= await productModel.bulkWrite(
        payload.map((product) => ({
          updateOne: {
            filter: { id: product.productId },
            update: { $inc: { stock: -product.qty } } //to decrement, we have used -
          }
        })

        )
      )

      if(result.matchedCount == 0 || result.modifiedCount == 0 ){
        throw new ExplicitError("Product not matched or updated",500);
      }
      else{
        return true;
      }
    }
    catch (err) {
       if (err instanceof ExplicitError) {
        throw err;
      }
      else {
      console.log(err);
      throw new CustomError("Error updating product stock", 500);
      }
    }
  }

  async updateProductReviewService(productId: string, reviewId: string, newReview: ReviewModel) {
    try {
      const result: UpdateResult = await productModel.updateOne(
        {
          id: productId,
          reviews: {
            $elemMatch: {
              _id: new mongoose.Types.ObjectId(reviewId)
            }
          }
        },
        {
          $set: {
            //replacing few updatable properties in the entire object
            "reviews.$.rating": newReview.rating,
            "reviews.$.comment": newReview.comment,
          }
        },

      )
      return hasUpdateSucceeded(result);
    }
    catch (err) {
      if (err instanceof ExplicitError) {
        throw err;
      }
      else {
        console.log(err);
        throw new CustomError("Error updating review", 500);
      }
    }
  }

  async createProductReviewService(productId: string, newReview: Partial<ReviewModel>) {
    try {
      const result: UpdateResult = await productModel.updateOne(
        { id: productId },
        {
          // adding a new object to the array
          $push: {
            reviews: newReview
          }
        }
      )
      return hasUpdateSucceeded(result);
    }
    catch (err) {
      if (err instanceof ExplicitError) {
        throw err;
      }
      else {
        throw new CustomError("Error adding Product Review", 500);
      }
    }
  }


  async mapObjectIdsToDetailService(productIds: string[]): Promise<ProductModel[]> {
    try {
      const productObjectIds= productIds.map(x=>new mongoose.Types.ObjectId(x)); //convert string into ObjectId
      const products: ProductDocument[] = await productModel.find({ _id: { $in: productObjectIds } } //find always returns array of docs or []
      );
      return [...products.map(x => schemaToResponseMapper(x))]; 
    }
    catch (err) {
      console.log(err);
      throw new CustomError(`Error fetching products:${err}`, 500);
    }
  }

  async deleteProductService(productId: string): Promise<ProductModel> {
    try {
      const deletedProduct = await productModel.findByIdAndDelete(productId);
      if (!deletedProduct) {
        throw new ExplicitError("Product not found", 404);
      }
      else {
        return schemaToResponseMapper(deletedProduct);
      }
    }
    catch (err) {
      if (err instanceof ExplicitError) {
        throw err;
      }
      else {
        throw new CustomError("Error deleting product", 500);
      }
    }
  }

  async createProductService(newProduct: ProductPayload): Promise<ProductModel> {
    try {
      const newPrdct = await productModel.create(newProduct);
      return schemaToResponseMapper(newPrdct);
    }
    catch (err) {
      console.log(err);
      throw new CustomError(`Error creating product:${err}`, 500)
    }
  }

  async updateProductService(productId: string, updatedProduct: ProductModel): Promise<ProductModel> {
    try {
      const updatedProd:ProductDocument|null = await productModel.findByIdAndUpdate(productId, updatedProduct, { new: true, runValidators: true });
      //{new :true} ensures updated document is returned and not the old document
      // by default schema validation is not done so runValidators:true needs to be passed
      if (updatedProd) {
        return schemaToResponseMapper(updatedProd);
      }
      throw new ExplicitError("Product not found", 404);
    }
    catch (err) {
      if (err instanceof ExplicitError) {
        throw err; //rethrow error
      }
      else {
        throw new CustomError(`Error updating product:${err}`, 500)
      }
    }
  }

}

export default new ProductService();


