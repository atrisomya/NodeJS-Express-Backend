import { response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorDTO } from '../utils/ErrorDTO.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ResponseDTO } from '../utils/ResponseDTO.js'; 

const registerUser = asyncHandler( async (req, res) => {
    /* Step1: get user details from postman/front-end
        Step2: validation of the request variables
        Step3: check if user already exists where we verify both email and username because both of these have been kept as unique
        Step4: check for images, check for avatar
        Step5: if it's there upload to cloudinary
        Step6: Create user object - create entry in db.
        Step7: Remove password and refreshToken field from response
        Step8: Check the response and return the status code accordingly
    */
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

export { registerUser };