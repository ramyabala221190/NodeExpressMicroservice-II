import axios from "axios";
import { CustomError } from "../app";
import productModel, { ProductModel } from "../models/productModel";

class ProductService   {

  constructor(){
    console.log("instance for Product Service created")
  }

async getAllProductsService():Promise<ProductModel[]>{
    try{
      return await productModel.find({});
    }
    catch(err){
       throw new CustomError(`Error fetching products:${err}`,500);
    }
}

async messageToCartMicroservice(){
  try{
   
    let carts= await axios.get(`http://${process.env.API_GATEWAY}:${process.env.API_GATEWAY_PORT}/${process.env.CART_MICROSERVICE_MAPPING}/carts`);
    return carts.data
     }
     catch(err){
      throw new CustomError(`Error fetching carts:${err}`,500);
     }
}

// async getMultipleProductDetailService(productIds:string[]):Promise<ProductModel[]>{
//    try{
//     return await productModel.find(
//       {
//         id: {$in:productIds}
//       }
//     )
//    }
//    catch(err){
//     throw new CustomError(`Error fetching product details`,500);
//    }
// }

async mapProductIdsToDetailService(productIds:string[]):Promise<ProductModel[]>{
    try{
      const products:ProductModel|ProductModel[]=await productModel.find({id: {$in:productIds}}
      );
      return [...products];
    }
    catch(err){
       console.log(err);
       throw new CustomError(`Error fetching products:${err}`,500);
    }
}

async mapObjectIdsToDetailService(productIds:string[]):Promise<ProductModel[]>{
    try{
      const products:ProductModel|ProductModel[]=await productModel.find({_id: {$in:productIds}}
      );
      return [...products];
    }
    catch(err){
       console.log(err);
       throw new CustomError(`Error fetching products:${err}`,500);
    }
}

async  deleteProductService(productId:string){
  try{
   const deletedProduct= await productModel.findByIdAndDelete(productId);
   if(!deletedProduct){
    throw new CustomError("Product not found",404);
  } 
  }
  catch(err){
    throw err; //just rethrowing the error
  }
}

async  createProductService(newProduct:ProductModel){
try{
   const newProd=await productModel.insertOne(newProduct);
   return newProd;
}
catch(err){
  throw new CustomError(`Error creating product:${err}`,500)
}
}

async  updateProductService(productId:string,updatedProduct:ProductModel){
 try{
    const updatedProd=await productModel.findByIdAndUpdate(productId,updatedProduct,{new:true,runValidators: true });
    //{new :true} ensures updated document is returned
    // by default schema validation is not done so runValidators:true needs to be passed
    return updatedProd;
 }
 catch(err){
  throw new CustomError(`Error updating product:${err}`,500)

 }
}

}

export default new ProductService();


// export async function getAllProductsService(){
//     try{
//       const product=await productModel.find();
//       return product;
//     }
//     catch(err){
//        throw new CustomError(`Error fetching products:${err}`,500);
//     }
// }

// export async function messageToCartMicroservice(){
//   try{
   
//     let carts= await axios.get(`${process.env.protocol}://${process.env.API_GATEWAY}:${process.env.API_GATEWAY_PORT}/${process.env.CART_MICROSERVICE_MAPPING}/carts`);
//     return carts.data
//      }
//      catch(err){
//       throw new CustomError(`Error fetching carts:${err}`,500);
//      }
// }

// export async function getProductDetailService(productId:string){
//     try{
//       const product=await productModel.findById(productId);
//       return product;
//     }
//     catch(err){
//        throw new CustomError(`Error fetching products:${err}`,500);
//     }
// }

// export async function deleteProductService(productId:string){
//   try{
//    const deletedProduct= await productModel.findByIdAndDelete(productId);
//    if(!deletedProduct){
//     throw new CustomError("Product not found",404);
//   } 
//   }
//   catch(err){
//     throw err; //just rethrowing the error
//   }
// }

// export async function createProductService(newProduct:ProductModel){
// try{
//    const newProd=await productModel.insertOne(newProduct);
//    return newProd;
// }
// catch(err){
//   throw new CustomError(`Error creating product:${err}`,500)
// }
// }

// export async function updateProductService(productId:string,updatedProduct:ProductModel){
//  try{
//     const updatedProd=await productModel.findByIdAndUpdate(productId,updatedProduct,{new:true,runValidators: true });
//     //{new :true} ensures updated document is returned
//     // by default schema validation is not done so runValidators:true needs to be passed
//     return updatedProd;
//  }
//  catch(err){
//   throw new CustomError(`Error updating product:${err}`,500)

//  }
// }

