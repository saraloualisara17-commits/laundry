import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Production-ready image compression.
 * Resizes the image to a maximum of 1200px (width or height) 
 * and applies 70% JPEG compression.
 * 
 * This typically reduces a 10MB camera photo to ~200KB-400KB
 * without noticeable quality loss for a mobile screen.
 */
export const compressImage = async (uri: string): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }], // Maintain aspect ratio, max width 1200
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.error('Compression failed, falling back to original:', error);
    return uri;
  }
};

export const compressMultipleImages = async (uris: string[]): Promise<string[]> => {
  return Promise.all(uris.map(uri => compressImage(uri)));
};
