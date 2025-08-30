import * as mongoose from "mongoose"

export interface ProductModel{
    title: string,
    description: string,
    category: string,
    price: Number,
    discountPercentage: number,
    rating: number,
    stock: number,
    brand: string,
    availabilityStatus:string,
    images:string[]
}

const productSchema=new mongoose.Schema({
    id:Number,
    title: String,
    description: String,
    category: String,
    price: Number,
    discountPercentage: Number,
    rating: Number,
    stock: Number,
    brand: String,
    availabilityStatus:String,
    images:Array<String>
})

export default mongoose.model("Product",productSchema); //collection name will be products i.e plural lowercase of model name