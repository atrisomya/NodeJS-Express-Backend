//asyncHandler for Promises

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch((err) => next(err));
    }
};


export { asyncHandler };

//asyncHandler with try and catch Block

// const asyncHandler = (fn) => async(req, res, next) => {

//     try {

//         await fn();
        
//     } catch (error) {
//         res.status(err.code || 500).json({
//             sucess: false,
//             message: err.message
//         })
//     }

// };