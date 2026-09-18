import express from "express";

import { getProfile, updateProfile, updateAddress, uploadProfilePicture, removeProfilePicture } from "../controllers/profileController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import uploadSingleImage from "../middleware/upload.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET PROFILE
|--------------------------------------------------------------------------
| GET /api/profile
| Requires authentication
|--------------------------------------------------------------------------
*/
router.get("/", authMiddleware, getProfile);

/*
|--------------------------------------------------------------------------
| UPDATE BASIC PROFILE
|--------------------------------------------------------------------------
| PUT /api/profile
| Updates:
| - name
| - phone
|
| Email is not changed here.
|--------------------------------------------------------------------------
*/
router.put("/", authMiddleware, updateProfile);

/*
|--------------------------------------------------------------------------
| UPDATE ADDRESS
|--------------------------------------------------------------------------
| PUT /api/profile/address
|--------------------------------------------------------------------------
*/
router.put("/address", authMiddleware, updateAddress);

/*
|--------------------------------------------------------------------------
| UPLOAD PROFILE PICTURE
|--------------------------------------------------------------------------
| PUT /api/profile/picture
| Content-Type: multipart/form-data
| Field name: profilePicture
|--------------------------------------------------------------------------
*/
router.put("/picture", authMiddleware, uploadSingleImage("profilePicture"), uploadProfilePicture);

/*
|--------------------------------------------------------------------------
| REMOVE PROFILE PICTURE
|--------------------------------------------------------------------------
| DELETE /api/profile/picture
|--------------------------------------------------------------------------
*/
router.delete("/picture", authMiddleware, removeProfilePicture);

export default router;
