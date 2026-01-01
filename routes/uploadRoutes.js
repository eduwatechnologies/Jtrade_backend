const express = require("express");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const dotenv = require("dotenv");

dotenv.config();

const router = express.Router();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "jtrade", // Folder in Cloudinary
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({ storage: storage });

router.post("/", upload.array("images", 3), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send({ message: "No files uploaded" });
  }

  // Cloudinary returns the URL in `path` or `secure_url`
  const filePaths = req.files.map((file) => file.path);
  res.send(filePaths);
});

module.exports = router;
