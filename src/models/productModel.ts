import * as mongoose from "mongoose"

export interface ProductModel {
    _id: mongoose.Types.ObjectId,
    id:number,
    title: string,
    description: string,
    category: string,
    price: number,
    discountPercentage: number,
    rating: number,
    stock: number,
    tags: string[],
    brand: string,
    sku: string,
    weight: number,
    dimensions: {
        width: number,
        height: number,
        depth: number
    },
    warrantyInformation: string,
    shippingInformation: string,
    availabilityStatus: string,
    reviews: {
        rating: number,
        comment: string,
        date: Date,
        reviewerName: string,
        reviewerEmail: string
    }[],
    returnPolicy: string,
    minimumOrderQuantity: number,
    meta: {
        createdAt: Date,
        updatedAt: Date,
        barcode: string,
        qrCode: string
    },
    images: string[],
    thumbnail: string
}

export interface ReviewModel {
    rating: number,
    comment: string,
    date: Date,
    reviewerName: string,
    reviewerEmail: string
}


const dimensionSchema = new mongoose.Schema({
    width: Number,
    height: Number,
    depth: Number
},{_id:true,timestamps:true});

const metaSchema = new mongoose.Schema({
    createdAt: Date,
    updatedAt: Date,
    barcode: String,
    qrCode: String
},{_id:true,timestamps:true});

const reviewSchema = new mongoose.Schema({
    rating: Number,
    comment: String,
    date: Date,
    reviewerName: String,
    reviewerEmail: String
},{_id:true,timestamps:true});

const productSchema = new mongoose.Schema({
    id: Number,
    title: String,
    description: String,
    category: String,
    price: Number,
    discountPercentage: Number,
    rating: Number,
    stock: Number,
    tags: Array<String>,
    brand: String,
    sku: String,
    weight: Number,
    dimensions: dimensionSchema,
    warrantyInformation: String,
    shippingInformation: String,
    availabilityStatus: String,
    reviews: [reviewSchema],
    returnPolicy: String,
    minimumOrderQuantity: Number,
    meta: metaSchema,
    images: Array<String>,
    thumbnail: String
},{timestamps:true})

export default mongoose.model("Product", productSchema); //collection name will be products i.e plural lowercase of model name