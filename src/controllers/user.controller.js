import { response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorDTO } from '../utils/ErrorDTO.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ResponseDTO } from '../utils/ResponseDTO.js';
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async function(userId) {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave : false }); //don't validate the existing values just save the object as is.

        return { accessToken, refreshToken };
    } catch(error) {
        throw new ErrorDTO(500, "Something went wrong while logging in");
    }
}

const registerUser = asyncHandler( async (req, res) => {

    const {fullName, email, username, password } = req?.body;

    if([fullName, email, username, password].some(data => !data)) {
        throw new ErrorDTO(400, "All fields are mandatory");
    }

    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if(existingUser) {
        throw new ErrorDTO(409, "Either the email or the username is already taken.");
    }

    //files key is added by multer middleware
    const avatarPath = req?.files?.avatar?.[0]?.path;
    const coverImagePath = req?.files?.coverImage?.[0]?.path;

    if(!avatarPath) {
        throw new ErrorDTO(400, "Avatar is mandatory");
    }

    const avatar = await uploadOnCloudinary(avatarPath);
    const coverImage = await uploadOnCloudinary(coverImagePath);

    if(!avatar) {
        throw new ErrorDTO(400, "Avatar is mandatory");
    }

    const user = await User.create({
        username: username?.toLowerCase(),
        email,
        fullName,
        avatar: avatar?.url,
        coverImage: coverImage?.url || "",
        password
    });

    //select method selects fields and - here indicates that we are removing them.
    const savedUser = await User?.findById(user?._id)?.select("-password -refreshToken");

    if(!savedUser) {
        throw new ErrorDTO(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(new ResponseDTO(201, savedUser, "User registered successfully"));

});

const loginUser = asyncHandler( async (req, res) => {

    const { username, email, password } = req.body;

    if(!username && !email) {
        throw new ErrorDTO(400, "Username is mandatory");
    }

    if(!password) {
        throw new ErrorDTO(400, "Password is mandatory");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if(!user) {
        throw new ErrorDTO(404, "User does not exist");
    }

    const isPasswordCorrect = await user?.isPasswordCorrect(password);

    if(!isPasswordCorrect) {
        throw new ErrorDTO(401, "Bad credentials.");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user?._id);

    //For now we are using a database call to remove password and refreshToken Object which could be an expensive operation
    //so I need to figure out a way to do it without a db call.
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    //creating the options for cookies and here httpOnly and secure ensures that the cookies are not modifyable 
    //by the client(which in most cases is the front end) and it's only readable.
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ResponseDTO(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "Login successful"
            )
        );

});

const logoutUser = asyncHandler( async (req, res) => {

    const user = await User.findByIdAndUpdate(
        req?.user?._id,
        {
            $unset: {
                refreshToken: ""
            }
        },
        {
            new: true //we'll get the new value of user from this attribute
        }
    );
    
    console.log("User11 post logout: ", user);

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ResponseDTO(200, {}, "Logout successful"));
});

const refreshAccessToken = asyncHandler( async (req, res) => {
    
    try {
        const incomingToken = req?.cookies?.refreshToken || req?.body?.refreshToken;
    
        if(!incomingToken) {
            throw new ErrorDTO(401, "Invalid refresh token");
        }
    
        const decodedToken = await jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user) {
            throw new ErrorDTO(401, "Invalid refresh token");
        }
    
        if(incomingToken !== user?.refreshToken) {
            throw new ErrorDTO(401, "Invalid refresh token");
        }
    
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user?._id);
    
        const options = {
            httpOnly: true,
            secure: true
        };
    
        return res
            .status(200)
            .cookie("accessToken", accessToken)
            .cookie("refreshToken", newRefreshToken)
            .json(new ResponseDTO(200, { accessToken, newRefreshToken }), "Token refreshed successfully");
    } catch (error) {
        console.error("Error: ", error);
        throw new ErrorDTO(401, error?.message || "Invaliad refreshToken");
    }

});

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
};
