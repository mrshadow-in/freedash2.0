import useSWR from 'swr';
import http from '@/api/http';

export interface Version {
    versionId: string | number;
    versionName: string;
    downloads?: number;
    downloadUrl?: string;
    game_versions: string[];
    loaders: string[];
}

export const rawDataToVersion = (data: any): Version => {
    return {
        versionId: data.versionId,
        versionName: data.versionName,
        downloads: data.downloads,
        downloadUrl: data.downloadUrl,
        game_versions: data.game_versions,
        loaders: data.loaders,
    };
};

export const fetchPluginVersions = (uuid: string, provider: string, pluginId: string | number) => {
    return useSWR<Version[]>(
        ['mcplugins_versions', uuid, provider, pluginId],
        async () => {
            const response = await http.get(`/api/client/servers/${uuid}/mcplugins/version`, {
                params: {
                    provider,
                    pluginId,
                },
            });
            return response.data.data.map((item: any) => rawDataToVersion(item));
        },
        { revalidateOnFocus: false }
    );
};

export const installPluginVersion = (
    uuid: string,
    provider: string,
    pluginId: string | number,
    versionId: string | number
): Promise<void> => {
    return new Promise((resolve, reject) => {
        http.post(`/api/client/servers/${uuid}/mcplugins/install`, {
            provider,
            pluginId,
            versionId,
        })
            .then(() => resolve())
            .catch(reject);
    });
};
