import client from './client';

export interface FileObject {
  uri: string;
  name?: string;
  type?: string;
}

export const uploadsApi = {
  /**
   * Upload multiple files using FormData
   */
  uploadFiles: (files: FileObject[]) => {
    const formData = new FormData();
    files.forEach((file) => {
      // @ts-ignore - React Native FormData expects an object with uri, name, type
      formData.append('files', {
        uri: file.uri,
        name: file.name || `upload_${Date.now()}.jpg`,
        type: file.type || 'image/jpeg',
      });
    });

    return client.post<string[]>('/api/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Increase timeout for uploads
      timeout: 60000, 
    });
  },

  /**
   * Upload a single file
   */
  uploadFile: (file: FileObject) => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: file.uri,
      name: file.name || `upload_${Date.now()}.jpg`,
      type: file.type || 'image/jpeg',
    });

    return client.post<string>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });
  },
};

export default uploadsApi;
