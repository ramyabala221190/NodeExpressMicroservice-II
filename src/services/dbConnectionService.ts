import { CustomError } from "../app";
import { products } from "../data/seedData";
import dbClient from "../dbClient";
import productModel, { ProductDocument } from "../models/productModel";

export async function connectToDb(){
    try{
    await dbClient.connect();
    await loadProducts();
    }
    catch(err){
        console.log(err);
       throw new CustomError("Error connecting to DB",500);
    }
}

export async function loadProducts(){
    //adding data this way so that schema is respected.
    try{
        const products:ProductDocument[]= await productModel.find({});
        if(!products.map(x=>x.toObject()).length){
        console.log("no products in collection. loading from file");
        await productModel.deleteMany({}); //delete all before adding new
        await productModel.create(products); //create runs validation as well
        }
        }
   catch(err){
           console.log(err);
           throw new CustomError("Loading products to DB",500);
    }
}