const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");

require("dotenv").config();

const generateFileName = (bytes = 16) => crypto.randomBytes(bytes).toString("hex");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Uploads a file to S3 and returns a pre-signed URL
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {string} fileName - Original file name
 * @param {string} [prefix="uploads"] - S3 prefix
 * @param {number} [expiresIn=300] - URL expiration time in seconds
 * @param {string} [mimetype="application/octet-stream"] - File MIME type
 * @returns {Object} - Attachment object with id, givenName, and fileURL
 */
const uploadAttachmentToS3 = async (fileBuffer, fileName, prefix = "uploads", expiresIn = '90d', mimetype = "application/octet-stream") => {
  try {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error("Invalid file buffer: Buffer is required");
    }
    if (!fileName) {
      throw new Error("Invalid file name: File name is required");
    }

    const uniqueFileName = `${prefix}/${generateFileName()}-${fileName}`;
    const putCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: uniqueFileName,
      Body: fileBuffer,
      ContentType: mimetype,
    });
    await s3Client.send(putCommand);

    const fileURL = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: uniqueFileName,
      }),
      { expiresIn }
    );

    return {
      id: generateFileName(),
      givenName: uniqueFileName,
      fileURL,
    };
  } catch (error) {
    throw new Error(`Failed to upload attachment: ${error.message}`);
  }
};

module.exports = {
  uploadAttachmentToS3,
  s3Client,
  generateFileName,
};