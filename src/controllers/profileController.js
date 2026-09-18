import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";

const getProfileData = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isEmailVerified: user.isEmailVerified,

    profilePicture: {
      url: user.profilePicture?.url || "",
      publicId: user.profilePicture?.publicId || "",
    },

    address: {
      fullName: user.address?.fullName || "",
      phone: user.address?.phone || "",
      addressLine1: user.address?.addressLine1 || "",
      addressLine2: user.address?.addressLine2 || "",
      city: user.address?.city || "",
      state: user.address?.state || "",
      pincode: user.address?.pincode || "",
      landmark: user.address?.landmark || "",
    },

    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

/*
|--------------------------------------------------------------------------
| GET PROFILE
|--------------------------------------------------------------------------
| GET /api/profile
*/
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully.",
      user: getProfileData(user),
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch profile.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE BASIC PROFILE
|--------------------------------------------------------------------------
| PUT /api/profile
|
| Allowed:
| - name
| - phone
|
| Email is intentionally NOT updated here.
|--------------------------------------------------------------------------
*/
export const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (name !== undefined) {
      const trimmedName = String(name).trim();

      if (trimmedName.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Name must contain at least 2 characters.",
        });
      }

      if (trimmedName.length > 80) {
        return res.status(400).json({
          success: false,
          message: "Name cannot exceed 80 characters.",
        });
      }

      user.name = trimmedName;
    }

    if (phone !== undefined) {
      const trimmedPhone = String(phone).trim();

      if (!trimmedPhone) {
        return res.status(400).json({
          success: false,
          message: "Phone number is required.",
        });
      }

      if (trimmedPhone.length > 20) {
        return res.status(400).json({
          success: false,
          message: "Phone number is too long.",
        });
      }

      user.phone = trimmedPhone;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: getProfileData(user),
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update profile.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE ADDRESS
|--------------------------------------------------------------------------
| PUT /api/profile/address
|--------------------------------------------------------------------------
*/
export const updateAddress = async (req, res) => {
  try {
    const { fullName, phone, addressLine1, addressLine2, city, state, pincode, landmark } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Make sure address object exists
    |--------------------------------------------------------------------------
    */
    if (!user.address) {
      user.address = {};
    }

    if (fullName !== undefined) {
      user.address.fullName = String(fullName).trim();
    }

    if (phone !== undefined) {
      user.address.phone = String(phone).trim();
    }

    if (addressLine1 !== undefined) {
      user.address.addressLine1 = String(addressLine1).trim();
    }

    if (addressLine2 !== undefined) {
      user.address.addressLine2 = String(addressLine2).trim();
    }

    if (city !== undefined) {
      user.address.city = String(city).trim();
    }

    if (state !== undefined) {
      user.address.state = String(state).trim();
    }

    if (pincode !== undefined) {
      user.address.pincode = String(pincode).trim();
    }

    if (landmark !== undefined) {
      user.address.landmark = String(landmark).trim();
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Address updated successfully.",
      user: getProfileData(user),
      address: {
        fullName: user.address?.fullName || "",
        phone: user.address?.phone || "",
        addressLine1: user.address?.addressLine1 || "",
        addressLine2: user.address?.addressLine2 || "",
        city: user.address?.city || "",
        state: user.address?.state || "",
        pincode: user.address?.pincode || "",
        landmark: user.address?.landmark || "",
      },
    });
  } catch (error) {
    console.error("Update address error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update address.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPLOAD PROFILE PICTURE
|--------------------------------------------------------------------------
| PUT /api/profile/picture
|
| Requires:
| multipart/form-data
| field name: profilePicture
|--------------------------------------------------------------------------
*/
export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a profile picture.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Store old image ID
    |--------------------------------------------------------------------------
    */
    const oldPublicId = user.profilePicture?.publicId || "";

    /*
    |--------------------------------------------------------------------------
    | Upload new image FIRST
    |--------------------------------------------------------------------------
    */
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `br30-kadaknath-farms/profile/${user._id}`,
          resource_type: "image",
          transformation: [
            {
              width: 500,
              height: 500,
              crop: "fill",
              gravity: "face",
            },
            {
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        }
      );

      stream.end(req.file.buffer);
    });

    /*
    |--------------------------------------------------------------------------
    | Update database with new image
    |--------------------------------------------------------------------------
    */
    user.profilePicture = {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    };

    await user.save();

    /*
    |--------------------------------------------------------------------------
    | Delete old Cloudinary image AFTER successful update
    |--------------------------------------------------------------------------
    */
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId, {
          resource_type: "image",
        });
      } catch (cloudinaryError) {
        console.error("Old profile picture deletion failed:", cloudinaryError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully.",
      user: getProfileData(user),
      profilePicture: {
        url: user.profilePicture.url,
        publicId: user.profilePicture.publicId,
      },
    });
  } catch (error) {
    console.error("Upload profile picture error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update profile picture.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| REMOVE PROFILE PICTURE
|--------------------------------------------------------------------------
| DELETE /api/profile/picture
|--------------------------------------------------------------------------
*/
export const removeProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!user.profilePicture?.publicId) {
      return res.status(400).json({
        success: false,
        message: "No profile picture is currently set.",
      });
    }

    const oldPublicId = user.profilePicture.publicId;

    /*
    |--------------------------------------------------------------------------
    | Remove from database first
    |--------------------------------------------------------------------------
    */
    user.profilePicture = {
      url: "",
      publicId: "",
    };

    await user.save();

    /*
    |--------------------------------------------------------------------------
    | Delete from Cloudinary
    |--------------------------------------------------------------------------
    */
    try {
      await cloudinary.uploader.destroy(oldPublicId, {
        resource_type: "image",
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary profile picture deletion failed:", cloudinaryError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture removed successfully.",
      user: getProfileData(user),
      profilePicture: {
        url: "",
        publicId: "",
      },
    });
  } catch (error) {
    console.error("Remove profile picture error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to remove profile picture.",
    });
  }
};
