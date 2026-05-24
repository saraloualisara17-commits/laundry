import client, { BASE_URL } from './client';

export interface SystemSettings {
  appName: string;
  logoUrl: string | null;
  businessPhone: string | null;
}

export interface UpdateSettingsRequest {
  appName?: string;
  businessPhone?: string;
  logo?: {
    uri: string;
    name: string;
    type: string;
  };
}

const toFullLogoUrl = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  return `${BASE_URL}/uploads/${raw}`;
};

export const settingsApi = {
  getSettings: (): Promise<SystemSettings> =>
    client.get<SystemSettings>('/api/public/settings').then(res => ({
      appName: res.data.appName || 'PureClean',
      logoUrl: toFullLogoUrl((res.data as any).logoUrl),
      businessPhone: (res.data as any).businessPhone || null,
    })),

  updateSettings: (req: UpdateSettingsRequest): Promise<SystemSettings> => {
    const formData = new FormData();
    if (req.appName) formData.append('appName', req.appName);
    if (req.businessPhone) formData.append('businessPhone', req.businessPhone);
    if (req.logo) {
      // React Native FormData accepts the object shape directly
      (formData as any).append('logo', {
        uri: req.logo.uri,
        name: req.logo.name,
        type: req.logo.type,
      });
    }
    return client
      .put<SystemSettings>('/api/admin/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(res => ({
        appName: res.data.appName || 'PureClean',
        logoUrl: toFullLogoUrl((res.data as any).logoUrl),
        businessPhone: (res.data as any).businessPhone || null,
      }));
  },
};

export default settingsApi;
