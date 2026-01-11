import tw from 'twin.macro';
import React, { useState } from 'react';
import { ApplicationStore } from '@/state';
import { VersionSearchRow } from './SearchRow';
import { ServerContext } from '@/state/server';
import Spinner from '@/components/elements/Spinner';
import { Dialog } from '@/components/elements/dialog';
import { useStoreActions, Actions } from 'easy-peasy';
import GreyRowBox from '@/components/elements/GreyRowBox';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudDownloadAlt, faDownload } from '@fortawesome/free-solid-svg-icons';
import { fetchPluginVersions, installPluginVersion } from '@/api/server/mcplugins/getVersions';

interface PluginVersionContainerProps {
    provider: string;
    pluginId: string | number;
    pluginName: string;
    pluginUrl: string;
    textSearch: string;
    textSearchBox: string;
    textVersion: string;
    textLoader: string;
    textVersionList: string;
    textVersionsNotFound: string;
    textVersionDownloads: string;
    textInstallSuccess: string;
    textInstallFailed: string;
    textInstallButton: string;
    textDownloadButton: string;
    textRedirectUrl: string;
}

const PluginVersionContainer: React.FC<PluginVersionContainerProps> = ({
    provider,
    pluginId,
    pluginName,
    pluginUrl,
    textSearch,
    textSearchBox,
    textVersion,
    textLoader,
    textVersionList,
    textVersionsNotFound,
    textVersionDownloads,
    textInstallSuccess,
    textInstallFailed,
    textInstallButton,
    textDownloadButton,
    textRedirectUrl,
}) => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { clearFlashes, addFlash } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);
    const [externalUrl, setExternalUrl] = useState<{ open: boolean; version?: any }>({ open: false });
    const [search, setSearch] = useState('');
    const [minecraftVersion, setMinecraftVersion] = useState('');
    const [loader, setLoader] = useState('');

    const { data: versions, error, isValidating } = fetchPluginVersions(uuid, provider, pluginId);

    const isStableVersion = (version: string) => {
        return (
            !version.includes('w') &&
            // !version.includes('pre') &&
            // !version.includes('rc') &&
            !version.includes('CB') &&
            !version.includes('Snapshot')
        );
    };

    const filteredVersions = versions?.filter((version) => {
        const matchesSearch = version.versionName.toLowerCase().includes(search.toLowerCase());
        const matchesMinecraftVersion = minecraftVersion ? version.game_versions?.includes(minecraftVersion) : true;
        let matchesLoader = true;

        if (loader) {
            if (provider === 'modrinth' && version.loaders) {
                matchesLoader = version.loaders.includes(loader);
            } else if (provider === 'curseforge') {
                matchesLoader = version.game_versions?.includes(loader);
            }
        }

        return matchesSearch && matchesMinecraftVersion && matchesLoader;
    });

    const handleInstall = async (versionId: string | number, pluginName: string) => {
        try {
            clearFlashes('mcplugins:install');
            await installPluginVersion(uuid, provider, pluginId, versionId);
            addFlash({
                type: 'success',
                key: 'mcplugins:install',
                message: textInstallSuccess.replace('%_PLUGIN_NAME_%', pluginName),
            });
        } catch (error) {
            addFlash({
                type: 'error',
                key: 'mcplugins:install',
                title: 'Error',
                message: textInstallFailed.replace('%_PLUGIN_NAME_%', pluginName),
            });
        }
    };

    return (
        <div css={tw`p-2`}>
            <h1 css={tw`w-full text-center text-2xl pb-4`}>
                {textVersionList.replace('%_PLUGIN_NAME_%', pluginName).concat(versions ? ` (${versions.length})` : '')}{' '}
                {isValidating && <Spinner size={'small'} css={tw`inline-block`}></Spinner>}
            </h1>
            <div css={tw`grid gap-4`}>
                <VersionSearchRow
                    onSearch={setSearch}
                    minecraftVersion={minecraftVersion}
                    setMinecraftVersion={setMinecraftVersion}
                    provider={provider}
                    loader={loader}
                    setLoader={setLoader}
                    textSearch={textSearch}
                    textSearchBox={textSearchBox}
                    textVersion={textVersion}
                    textLoader={textLoader}
                />
            </div>

            {isValidating ? (
                <div css={tw`flex items-center justify-center h-full mt-4 mb-4`}>
                    <Spinner size='large' />
                </div>
            ) : filteredVersions && filteredVersions.length > 0 ? (
                <div css={tw`space-y-4 mt-4`}>
                    {filteredVersions.map((version) => (
                        <GreyRowBox key={version.versionId} css={tw`flex flex-col md:flex-row md:justify-between`}>
                            <div css={tw`flex-1`}>
                                <span css={tw`font-semibold text-left`}>{version.versionName}</span>
                                {version.downloads && version.downloads > 0 && (
                                    <p css={tw`text-sm text-neutral-400 flex items-center`}>
                                        <FontAwesomeIcon icon={faDownload} css={tw`w-3 h-3 mr-1`} />
                                        <span>
                                            {textVersionDownloads.replace(
                                                '%_VERSION_DOWNLOADS_%',
                                                version.downloads.toLocaleString()
                                            )}
                                        </span>
                                    </p>
                                )}
                                {version.loaders && version.loaders.length > 0 && (
                                    <div css={tw`flex items-center gap-2 mt-1`}>
                                        <span css={tw`text-sm text-neutral-300`}>{textLoader}:</span>
                                        <div css={tw`flex gap-1`}>
                                            {version.loaders.map((loader) => (
                                                <span
                                                    key={loader}
                                                    css={tw`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-300`}
                                                >
                                                    {loader.charAt(0).toUpperCase() + loader.slice(1)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {version.game_versions && version.game_versions.length > 0 && (
                                    <div css={tw`flex items-center gap-2 mt-1`}>
                                        <span css={tw`text-sm text-neutral-300`}>{textVersion}:</span>
                                        <span css={tw`text-sm text-neutral-400`}>
                                            {version.game_versions.filter(isStableVersion).join(', ')}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div css={tw`flex justify-center md:justify-end items-center mt-4 md:mt-0`}>
                                <div css={tw`flex space-x-2`}>
                                    <button
                                        onClick={() => setExternalUrl({ open: true, version: version })}
                                        css={tw`bg-neutral-600 hover:bg-neutral-500 text-white p-2.5 rounded`}
                                    >
                                        <svg
                                            xmlns='http://www.w3.org/2000/svg'
                                            viewBox='0 0 512 512'
                                            css={tw`w-4 h-4 fill-current`}
                                        >
                                            <path d='M320 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l82.7 0L201.4 265.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L448 109.3l0 82.7c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160c0-17.7-14.3-32-32-32L320 0zM80 32C35.8 32 0 67.8 0 112L0 432c0 44.2 35.8 80 80 80l320 0c44.2 0 80-35.8 80-80l0-112c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 112c0 8.8-7.2 16-16 16L80 448c-8.8 0-16-7.2-16-16l0-320c0-8.8 7.2-16 16-16l112 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L80 32z' />
                                        </svg>
                                    </button>
                                    {version.downloadUrl ? (
                                        <a
                                            href={version.downloadUrl}
                                            css={tw`bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded text-sm flex items-center`}
                                        >
                                            <FontAwesomeIcon icon={faCloudDownloadAlt} css={tw`mr-2`} />
                                            {textDownloadButton}
                                        </a>
                                    ) : (
                                        <button
                                            css={tw`bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded text-sm flex items-center`}
                                            onClick={() => handleInstall(version.versionId, pluginName)}
                                        >
                                            <FontAwesomeIcon icon={faDownload} css={tw`mr-2`} />
                                            {textInstallButton}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </GreyRowBox>
                    ))}
                </div>
            ) : (
                <div css={tw`text-gray-300 mt-4`}>{textVersionsNotFound}</div>
            )}
            <Dialog.Confirm
                open={externalUrl.open}
                onClose={() => setExternalUrl({ open: false })}
                title={`Redirect To Plugin's Website`}
                confirm={'Open'}
                onConfirmed={() => {
                    if (provider === 'modrinth' && externalUrl.version) {
                        const versionUrl = `https://modrinth.com/plugin/${pluginId}/version/${externalUrl.version.versionId}`;
                        window.open(versionUrl, '_blank');
                    } else if (provider === 'curseforge') {
                        const versionUrl = `${pluginUrl}/files/${externalUrl.version.versionId}`;
                        window.open(versionUrl, '_blank');
                    } else {
                        window.open(pluginUrl!, '_blank');
                    }
                    setExternalUrl({ open: false });
                }}
            >
                {textRedirectUrl.replace('&apos;', "'")}
            </Dialog.Confirm>
        </div>
    );
};
export default PluginVersionContainer;
