import { CustomError } from "../app.js";
import { products } from "../data/seedData.js";
import { connect } from "../dbClient.js";
import productModel from "../models/productModel.js";

export async function connectToDb(){
    try{
    await connect();
    await loadProducts();
    }
    catch(err){
       throw new CustomError("Error connecting to DB",500);
    }
}

export async function loadProducts(){
    try{
        await productModel.insertMany(products)
        }
   catch(err){
           throw new CustomError("Loading products to DB",500);
    }
}