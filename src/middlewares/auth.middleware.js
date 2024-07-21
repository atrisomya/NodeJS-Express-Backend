import { asyncHandler } from "../utils/asyncHandler.js";
import { ErrorDTO } from "../utils/ErrorDTO.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

//Used _ instead of res because we weren't using it and it is a standard practice.
export const verifyJWT = asyncHandler(async(req, _, next) => {

    try {
        const token = req.cookies?.accessToken || req?.header("Authorization")?.replace("Bearer ", "");
        if(!token) {
            throw new ErrorDTO(401, "Unauthorized request");
        }
    
        const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        if(!user) {
            throw new ErrorDTO(401, "Invalid access token");
        }
    
        req.user = user;
        next();
    } catch (error) {
        console.error("Error: ", error);
        throw new ErrorDTO(401, error?.message || "Invalid access token");
    }

})