import { v2 as cloudinary, type TransformationOptions } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function uploadImage(
  buffer: Buffer,
  options: { folder: string; publicId: string; transformation: TransformationOptions }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        overwrite: true,
        transformation: options.transformation,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Upload immagine fallito"));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

export function uploadAvatar(buffer: Buffer, userId: string): Promise<string> {
  return uploadImage(buffer, {
    folder: "arcadia/avatars",
    publicId: userId,
    transformation: [{ width: 256, height: 256, crop: "fill", gravity: "face" }],
  });
}

export function uploadCourseCover(buffer: Buffer, courseId: string): Promise<string> {
  return uploadImage(buffer, {
    folder: "arcadia/courses",
    publicId: courseId,
    transformation: [{ width: 800, height: 450, crop: "fill" }],
  });
}
