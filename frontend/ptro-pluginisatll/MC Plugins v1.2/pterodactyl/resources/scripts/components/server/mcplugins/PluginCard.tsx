import tw from 'twin.macro';
import React, { useState } from 'react';
import { ApplicationStore } from '@/state';
import { ServerContext } from '@/state/server';
import Modal from '@/components/elements/Modal';
import { Dialog } from '@/components/elements/dialog';
import { useStoreActions, Actions } from 'easy-peasy';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Plugin, installPlugin } from '@/api/server/mcplugins/getPlugins';
import { faList, faCloudDownloadAlt, faDownload } from '@fortawesome/free-solid-svg-icons';
import PluginsVersionContainer from '@/components/server/mcplugins/PluginsVersionContainer';

const PluginCard: React.FC<{
    plugin: Plugin;
    textInstallButton: string;
    textVersionsButton: string;
    textRedirectUrl: string;
    textDownloadUrl: string;
    textInstallSuccess: string;
    textInstallFailed: string;
    textSearch: string;
    textSearchBox: string;
    textVersion: string;
    textLoader: string;
    textVersionList: string;
    textVersionsNotFound: string;
    textVersionDownloads: string;
    textDownloadButton: string;
}> = ({
    plugin,
    textInstallButton,
    textVersionsButton,
    textRedirectUrl,
    textDownloadUrl,
    textInstallSuccess,
    textInstallFailed,
    textSearch,
    textSearchBox,
    textVersion,
    textLoader,
    textVersionList,
    textVersionsNotFound,
    textVersionDownloads,
    textDownloadButton,
}) => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { clearFlashes, addFlash } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);
    const [expanded, setExpanded] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [externalDownload, setExternalDownload] = useState(false);
    const [externalUrl, setExternalUrl] = useState(false);

    const handleInstallPlugin = async (provider: string, pluginId: number | string, pluginName: string) => {
        clearFlashes('mcplugins:install');
        try {
            await installPlugin(uuid, provider, pluginId);
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
        <div css={tw`bg-neutral-700 rounded-lg p-4 flex flex-col h-full`} style={{ boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
            <div css={tw`flex items-start mb-2`}>
                <div
                    css={tw`w-12 h-12 mr-4 rounded bg-neutral-600 flex items-center justify-center overflow-hidden flex-shrink-0`}
                >
                    <img src={plugin.icon} alt={plugin.name} css={tw`w-10 h-10 object-cover`} />
                </div>
                <div css={tw`flex-grow`}>
                    <h3 css={tw`text-lg font-normal`}>{plugin.name}</h3>
                    <p css={tw`text-sm text-neutral-400 flex items-center`}>
                        <FontAwesomeIcon icon={faDownload} css={tw`w-3 h-3 mr-1`} />
                        <span>{plugin.downloads.toLocaleString()}</span>
                    </p>
                </div>
            </div>
            <div css={tw`text-sm mb-4 text-neutral-300 flex-grow`}>
                <p css={[tw`flex-grow`, expanded ? tw`` : tw`line-clamp-2`]}>{plugin.description}</p>
                {plugin.description.length > 100 && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        css={tw`text-neutral-400 hover:text-neutral-300 mt-1 text-xs`}
                    >
                        {expanded ? 'Read less' : 'Read more'}
                    </button>
                )}
            </div>
            <div css={tw`flex justify-between items-center mt-auto`}>
                <div css={tw`flex items-center space-x-2`}>
                    <button
                        onClick={() => setExternalUrl(true)}
                        css={tw`bg-neutral-600 hover:bg-neutral-500 text-white p-2.5 rounded`}
                    >
                        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' css={tw`w-4 h-4 fill-current`}>
                            <path d='M320 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l82.7 0L201.4 265.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L448 109.3l0 82.7c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160c0-17.7-14.3-32-32-32L320 0zM80 32C35.8 32 0 67.8 0 112L0 432c0 44.2 35.8 80 80 80l320 0c44.2 0 80-35.8 80-80l0-112c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 112c0 8.8-7.2 16-16 16L80 448c-8.8 0-16-7.2-16-16l0-320c0-8.8 7.2-16 16-16l112 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L80 32z' />
                        </svg>
                    </button>
                </div>
                <div css={tw`flex items-center space-x-2`}>
                    <button
                        css={tw`bg-neutral-600 hover:bg-neutral-500 text-white px-4 py-2 rounded text-sm flex items-center`}
                        onClick={() => setModalVisible(true)}
                    >
                        <FontAwesomeIcon icon={faList} css={tw`mr-2`} />
                        {textVersionsButton}
                    </button>
                    {plugin.installable ? (
                        <button
                            css={tw`bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded text-sm flex items-center`}
                            onClick={() => handleInstallPlugin(plugin.provider, plugin.id, plugin.name)}
                        >
                            <FontAwesomeIcon icon={faDownload} css={tw`mr-2`} />
                            {textInstallButton}
                        </button>
                    ) : (
                        <button
                            onClick={() => setExternalDownload(true)}
                            css={tw`bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded text-sm flex items-center`}
                        >
                            <FontAwesomeIcon icon={faCloudDownloadAlt} css={tw`mr-2`} />
                            {textInstallButton}
                        </button>
                    )}
                </div>
            </div>
            <Dialog.Confirm
                open={externalUrl}
                onClose={() => setExternalUrl(false)}
                title={`Redirect To Plugin's Website`}
                confirm={'Open'}
                onConfirmed={() => {
                    window.open(plugin.url!);
                    setExternalUrl(false);
                }}
            >
                {textRedirectUrl.replace('&apos;', "'")}
            </Dialog.Confirm>
            <Dialog.Confirm
                open={externalDownload}
                onClose={() => setExternalDownload(false)}
                title={`Download Plugin`}
                confirm={'Open'}
                onConfirmed={() => {
                    window.open(plugin.url!);
                    setExternalDownload(false);
                }}
            >
                {textDownloadUrl.replace('&apos;', "'")}
            </Dialog.Confirm>
            <Modal visible={modalVisible} dismissable onDismissed={() => setModalVisible(false)} css={tw`mb-4`}>
                <div css={tw`grid gap-4`}>
                    <PluginsVersionContainer
                        provider={plugin.provider}
                        pluginId={plugin.id}
                        pluginName={plugin.name}
                        pluginUrl={plugin.url}
                        textSearch={textSearch}
                        textSearchBox={textSearchBox}
                        textVersion={textVersion}
                        textLoader={textLoader}
                        textVersionList={textVersionList}
                        textVersionsNotFound={textVersionsNotFound}
                        textVersionDownloads={textVersionDownloads}
                        textInstallSuccess={textInstallSuccess}
                        textInstallFailed={textInstallFailed}
                        textInstallButton={textInstallButton}
                        textDownloadButton={textDownloadButton}
                        textRedirectUrl={textRedirectUrl}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default PluginCard;
