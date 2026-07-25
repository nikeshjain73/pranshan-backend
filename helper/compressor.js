const fs = require('fs')
const sharp = require('sharp')
const md5 = require('md5')
const path = require('path');
const compressImage = async (originalImagePath) => {
  
  try {
    const originalImageBuffer = await fs.promises.readFile(originalImagePath);
    const compressedImageBuffer = await sharp(originalImageBuffer).jpeg({ quality: 50 }).toBuffer();
    const compressedFileName = `${md5(Date.now())}.${path.extname(originalImagePath)}`;
    const compressedFilePath = `./uploads/${compressedFileName}`;
    
    await fs.promises.writeFile(compressedFilePath, compressedImageBuffer);
    
    return compressedFileName; 
  } catch (error) {
    console.error("Error occurred during image compression:", error);
    throw error;
  }
};

module.exports = {compressImage};