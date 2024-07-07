//require('dotenv').config({path: './env'});
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './env'
})

connectDB()
.then(() => {
    const port = process.env.PORT;
    
    app.on("error", (error) => {
        console.log("Encountered an error while running the application", error);
        throw error;
    });

    app.listen(port || 8000, () => {
        console.log("Application is running at port : ", port);
    });
})
.catch((err) => console.log("Connection to MongoDB failed", err));














/*

// This is the first type of approach wherein everything is written in the index file itself but this
// approach pollutes this file too much.

import express from "express";

//this semi colon in the beginning is added to clean the code, so that no other lines are included the execution
//of this method. To terminate previous line and treat this as a separate, new entity.

const app = express();

;( async() => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error", () => {
            console.log("Encountered an error while connecting with the database", error);
            throw error;
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on ${process.env.PORT}`);
        })

    } catch (error) {
        console.log("ERROR: ", error);
    }
} )();
*/