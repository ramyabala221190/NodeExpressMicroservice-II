import { ProductModel } from "@ramyabala221190/api-contracts";
import { ProductDocument, ReviewDocument } from "../models/productModel"

export function schemaToResponseMapper(product: ProductDocument): ProductModel {
    const productObj=product.toObject();
    return {
        ...productObj,
        ...{
            _id: productObj._id.toString(),
            ...{
                reviews: productObj.reviews.map((x:ReviewDocument) => {
                    return {
                        ...x,
                        ...{ _id: x._id.toString() }
                    }
                })
            }
        }
    }
}