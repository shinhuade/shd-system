import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const normalizeCloudinaryPath = (value: string) =>
  value
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');

const cloudinaryRootFolder = normalizeCloudinaryPath(process.env.CLOUDINARY_ROOT_FOLDER || '');

const resolveCloudinaryFolder = (folder: string) => {
  const normalizedFolder = normalizeCloudinaryPath(folder);

  if (!cloudinaryRootFolder) {
    return normalizedFolder || undefined;
  }

  if (!normalizedFolder) {
    return cloudinaryRootFolder;
  }

  if (normalizedFolder === cloudinaryRootFolder || normalizedFolder.startsWith(`${cloudinaryRootFolder}/`)) {
    return normalizedFolder;
  }

  return `${cloudinaryRootFolder}/${normalizedFolder}`;
};

/**
 * 將 File 物件上傳至 Cloudinary
 * @param file 來自前端 FormData 的 File 物件
 * @param folder Cloudinary 上的資料夾路徑
 */
export const uploadToCloudinary = async (file: File, folder: string): Promise<UploadApiResponse> => {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: resolveCloudinaryFolder(folder),
          resource_type: 'auto', // 自動辨識圖片、影片或檔案
        },
        (error, result) => {
          if (error || !result) reject(error);
          else resolve(result);
        },
      )
      .end(buffer);
  });
};

export const deleteFromCloudinary = async (url: string) => {
  try {
    if (!url) return null;

    // 支援直接傳入 public_id 或完整 Cloudinary URL。
    const publicId = (() => {
      if (!url.includes('cloudinary')) {
        return url.replace(/^\/+/, '').replace(/\.[^.\/]+$/, '');
      }

      const parsed = new URL(url);
      const segments = parsed.pathname.split('/').filter(Boolean);
      const uploadIndex = segments.indexOf('upload');

      if (uploadIndex === -1) {
        throw new Error('Cloudinary URL 格式不正確：找不到 upload 節點');
      }

      // upload 後面可能有 transformation 參數，接著才是版本號 (v123...)。
      let startIndex = uploadIndex + 1;
      while (startIndex < segments.length && !/^v\d+$/.test(segments[startIndex])) {
        startIndex += 1;
      }

      // 如果沒有版本號，直接以 upload 後段作為 public_id 來源。
      if (startIndex < segments.length && /^v\d+$/.test(segments[startIndex])) {
        startIndex += 1;
      }

      const assetPath = segments.slice(startIndex).join('/');
      return assetPath.replace(/\.[^.\/]+$/, '');
    })();

    if (!publicId) return null;

    // 2. 執行刪除
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`Cloudinary 刪除結果 (${publicId}):`, result);
    return result;
  } catch (error) {
    console.error('Cloudinary 刪除失敗:', error);
    return null;
  }
};

export default cloudinary;
