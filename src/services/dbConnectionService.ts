import { CustomError } from "../app";
import { products } from "../data/seedData";
import dbClient from "../dbClient";
import productModel from "../models/productModel";

export async function connectToDb(){
    try{
    await dbClient.connect();
    await loadProducts();
    }
    catch(err){
       throw new CustomError("Error connecting to DB",500);
    }
}

export async function loadProducts(){
    //adding data this way so that schema is respected.
    try{
        await productModel.deleteMany({}); //delete all before adding new
        await productModel.insertMany(products);
        }
   catch(err){
           throw new CustomError("Loading products to DB",500);
    }
}