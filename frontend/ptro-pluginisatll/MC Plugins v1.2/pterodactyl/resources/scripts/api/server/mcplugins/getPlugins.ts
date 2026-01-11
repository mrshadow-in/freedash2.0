import useSWR from 'swr';
import http, { getPaginationSet, PaginatedResult } from '@/api/http';

export interface Plugin {
    provider: string;
    id: number | string;
    name: string;
    description: string;
    icon: string;
    downloads: number;
    url: string;
    installable: boolean;
}

export const rawDataToPlugin = (data: any): Plugin => {
    return {
        provider: data.provider,
        id: data.id,
        name: data.name,
        description: data.description,
        icon: data.icon,
        downloads: data.downloads,
        url: data.url,
        installable: data.installable,
    };
};

export type PluginsResponse = PaginatedResult<Plugin>;

export const fetchPlugins = (
    uuid: string,
    provider: string,
    page: number,
    pageSize: number,
    searchQuery: string,
    loader: string,
    sortBy: string,
    minecraftVersion: string
) => {
    const { data, error } = useSWR<PluginsResponse>(
        [
            'mcplugins',
            uuid,
            provider,
            page,
            pageSize,
            searchQuery,
            loader,
            sortBy,
            minecraftVersion,
        ],
        async () => {
            const response = await http.get(`/api/client/servers/${uuid}/mcplugins`, {
                params: {
                    provider: provider,
                    page: page,
                    page_size: pageSize,
                    search_query: searchQuery,
                    loader: loader,
                    sort_by: sortBy,
                    minecraft_version: minecraftVersion,
                },
            });

            const plugins = response.data.data.map((item: any) => rawDataToPlugin(item));
            const pagination = getPaginationSet(response.data.pagination);

            return {
                items: plugins,
                pagination: pagination,
            };
        }
    );

    return {
        plugins: data?.items,
        pagination: data?.pagination,
        loading: !error && !data,
        error: error,
    };
};

export const installPlugin = (uuid: string, provider: string, pluginId: string | number): Promise<void> => {
    return new Promise((resolve, reject) => {
        http.post(`/api/client/servers/${uuid}/mcplugins/install`, {
            provider,
            pluginId,
        })
            .then(() => resolve())
            .catch(reject);
    });
};
