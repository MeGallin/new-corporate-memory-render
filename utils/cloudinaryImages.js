import { v2 as cloudinary } from 'cloudinary';

export const configureCloudinary = (client) => {
  client.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
  });
};

export const uploadCloudinaryImage = async (filePath, client = cloudinary) => {
  configureCloudinary(client);
  return client.uploader.upload(filePath);
};

export const replaceCloudinaryImage = async ({
  document,
  filePath,
  imageUrlField,
  client = cloudinary,
  logger = console,
}) => {
  const previousImage = {
    publicId: document.cloudinaryId,
    imageUrl: document[imageUrlField],
  };
  const uploadedImage = await uploadCloudinaryImage(filePath, client);

  document[imageUrlField] = uploadedImage.secure_url;
  document.cloudinaryId = uploadedImage.public_id;

  try {
    await document.save();
  } catch (saveError) {
    try {
      await deleteCloudinaryImage(
        {
          publicId: uploadedImage.public_id,
          imageUrl: uploadedImage.secure_url,
        },
        client,
      );
    } catch {
      logger.error('New Cloudinary image cleanup failed after a database error.');
    }
    throw saveError;
  }

  let cleanupWarning = false;
  if (previousImage.publicId) {
    try {
      await deleteCloudinaryImage(previousImage, client);
    } catch {
      cleanupWarning = true;
      logger.error('Previous Cloudinary image cleanup failed after replacement.');
    }
  }

  return { uploadedImage, cleanupWarning };
};

export const deleteCloudinaryImage = async (
  { publicId, imageUrl },
  client = cloudinary,
) => {
  if (!publicId) {
    if (imageUrl) {
      throw new Error('Cloudinary image cleanup identifier is missing');
    }

    return { result: 'skipped' };
  }

  configureCloudinary(client);
  const response = await client.uploader.destroy(publicId);

  if (!['ok', 'not found'].includes(response?.result)) {
    throw new Error('Cloudinary image cleanup was not successful');
  }

  return response;
};
