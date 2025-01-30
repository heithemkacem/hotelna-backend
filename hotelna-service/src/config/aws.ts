import config from "./config";
import multer from "multer";
import { S3Client } from "@aws-sdk/client-s3";

// Validate required environment variables
if (
  !config.AWS_ACCESS_KEY_ID ||
  !config.AWS_SECRET_ACCESS_KEY ||
  !config.AWS_REGION
) {
  throw new Error(
    "Missing required AWS configuration in environment variables"
  );
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 6 },
});

const s3Client = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});

export { upload, s3Client };
