import multer from "multer";

const storage = multer.memoryStorage();

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, and WebP images are allowed."));
  }

  cb(null, true);
};

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter,
});

const uploadSingleImage = (fieldName = "image") => {
  return upload.single(fieldName);
};

export default uploadSingleImage;
