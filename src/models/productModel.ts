import * as mongoose from "mongoose"
import { ProductModel } from '@ramyabala221190/api-contracts';

/**
 * Very important that the interfaces and schemas match
 * If ? is not there in the interface field, then in the schema the required:true must be added.
 * string[] in interface is equivalent to [String] in mongoose schema
 */

//interface that models the schema
export interface ProductDocument extends mongoose.Document {
    _id: mongoose.Types.ObjectId,
    id: number,
    title: string,
    description: string,
    category: string,
    price: number,
    discountPercentage: number,
    rating: number,
    stock: number,
    tags: string[],
    brand?: string | null, //can be string/null
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
        _id: mongoose.Types.ObjectId,
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
    thumbnail: string,
    createdAt: Date, //this will be added by schema so need to add to interface
    updatedAt: Date  // this will be added by schema so need to add to interface
}

export interface ReviewDocument extends mongoose.Document {
    _id: mongoose.Types.ObjectId,
    rating: number,
    comment: string,
    date: Date,
    reviewerName: string,
    reviewerEmail: string,
    createdAt: Date, //this will be added by schema so need to add to interface
    updatedAt: Date  // this will be added by schema so need to add to interface
}

const dimensionSchema = new mongoose.Schema({
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    depth: { type: Number, required: true }
});

const metaSchema = new mongoose.Schema({
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    barcode: { type: String, required: true },
    qrCode: { type: String, required: true }
});

const reviewSchema = new mongoose.Schema({
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    date: { type: Date, required: true },
    reviewerName: { type: String, required: true },
    reviewerEmail: { type: String, required: true },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    discountPercentage: { type: Number, required: true },
    rating: { type: Number, required: true },
    stock: { type: Number, required: true },
    tags: { type: [String], required: true },
    brand: { type: String, required: false, default: null }, //optional field with a default value as null. matches interface
    sku: { type: String, required: true },
    weight: { type: Number, required: true },
    dimensions: { type: dimensionSchema, required: true },
    warrantyInformation: { type: String, required: true },
    shippingInformation: { type: String, required: true },
    availabilityStatus: { type: String, required: true },
    reviews: { type: [reviewSchema], required: true },
    returnPolicy: { type: String, required: true },
    minimumOrderQuantity: { type: Number, required: true },
    meta: { type: metaSchema, required: true },
    images: { type: [String], required: true },
    thumbnail: { type: String, required: true }
}, { timestamps: true });


//export type ProductDocument = mongoose.Document & ProductModel; //This merges your ProductModel interface with Mongoose’s Document type.
export default mongoose.model<ProductDocument>("Product", productSchema); //collection name will be products i.e plural lowercase of model name

/**
 * 
 * 
Inside your service layer: use ProductDocument so you get type safety and Mongoose features.
When returning to the client: convert to plain objects (ProductModel) so you don’t leak Mongoose internals.
 */