import { CustomError } from "../app";
import { products } from "../data/seedData";
import { connect } from "../dbClient";
import productModel from "../models/productModel";

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