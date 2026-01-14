<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers\MCPlugins;

use GuzzleHttp\Client;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\MCPluginsConfig;
use Pterodactyl\Services\Nodes\NodeJWTService;
use Illuminate\Auth\Access\AuthorizationException;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;

class InstallPluginsController extends ClientApiController
{
    protected array $httpClient;
    private string $directory = '/plugins';
    private DaemonFileRepository $daemonFileRepository;

    /**
     * Constructs the InstallPluginsController.
     * Initializes HTTP clients with base URIs and headers.
     */
    public function __construct(
        private NodeJWTService $jwtService,
        DaemonFileRepository $daemonFileRepository
    ) {
        $apiKey = MCPluginsConfig::first()?->curseforge_api_key;
        $this->httpClient = [
            'modrinth' => new Client(['base_uri' => 'https://api.modrinth.com/v2/']),
            'curseforge' => new Client([
                'base_uri' => 'https://api.curseforge.com/v1/',
                'headers' => ['X-API-Key' => $apiKey ?? '']
            ]),
            'spigotmc' => new Client(['base_uri' => 'https://api.spiget.org/v2/']),
            'hangar' => new Client(['base_uri' => 'https://hangar.papermc.io/api/v1/']),
            'polymart' => new Client(['base_uri' => 'https://api.polymart.org/v1/']),
        ];
        $this->daemonFileRepository = $daemonFileRepository;
    }

    /**
     * Handles the installation of a plugin by fetching the plugin data and downloading it.
     *
     * @param Request $request The HTTP request containing plugin information.
     * @param Server $server The server where the plugin will be installed.
     * 
     * @throws AuthorizationException if the user does not have permission.
     */
    public function index(Request $request, Server $server)
    {
        if (!$request->user()->can(Permission::ACTION_FILE_CREATE, $server)) {
            throw new AuthorizationException();
        }
        $provider = $request->input('provider');
        $pluginId = $request->input('pluginId');
        $versionId = $request->input('versionId');

        $data = $this->fetchPlugin($provider, $pluginId, $versionId);
        if ($data['status'] === 'error') {
            return response()->json(['status' => 'error', 'message' => 'An error occured while installing the plugin.'], 503);
        }

        if ($provider === 'spigotmc') {
            $status = $this->uploadPluginToServer($server, $data['pluginName'], $data['pluginFileContent'], $request);
            return response()->json($status);
        } else {
            $pluginFileUrl = $data['pluginFileUrl'];
            $this->daemonFileRepository->setServer($server)->pull(
                $pluginFileUrl,
                $this->directory,
                [
                    'use_header' => true,
                    'foreground' => true,
                ]
            );
            return response()->json(['status' => 'success', 'message' => 'Plugin installed successfully']);
        }
    }

    /**
     * Retrieves the plugin file URL based on provider, pluginId, and versionId.
     *
     * @param string $provider The plugin provider provider.
     * @param string $pluginId The pluginId.
     * @param string|null $versionId The version ID of the plugin.
     * 
     * @return array The plugin file URL and name or an error message.
     */
    private function fetchPlugin(string $provider, ?string $pluginId, ?string $versionId): array
    {
        $pluginDetails = match ($provider) {
            'modrinth' => $this->fetchModrinthPluginData($pluginId, $versionId),
            'curseforge' => $this->fetchCurseForgePluginData($pluginId, $versionId),
            'hangar' => $this->fetchHangarPluginData($pluginId, $versionId),
            'spigotmc' => $this->fetchSpigotmcPluginData($pluginId),
            'polymart' => $this->fetchPolymartPluginData($pluginId),
            default => throw new \InvalidArgumentException('Unsupported plugin provider'),
        };

        if ($provider === 'spigotmc') {
            $pluginFileContent = file_get_contents($pluginDetails['url']);
            return [
                'status' => 'success',
                'pluginName' => $pluginDetails['name'],
                'pluginFileContent' => $pluginFileContent,
            ];
        } else {
            return [
                'status' => 'success',
                'pluginFileUrl' => $pluginDetails['url'],
                'pluginName' => $pluginDetails['name'],
            ];
        }
    }

    /**
     * Fetches Modrinth plugin data based on pluginId and versionId.
     *
     * @param string $pluginId The ID of the plugin.
     * @param string|null $versionId The specific version ID of the plugin.
     * 
     * @return array Plugin file details including URL and filename.
     */
    private function fetchModrinthPluginData(?string $pluginId, ?string $versionId): array
    {
        $client = $this->httpClient['modrinth'];
        $response = $client->get($versionId ? "version/{$versionId}" : "project/{$pluginId}/version");
        $data = json_decode($response->getBody()->getContents(), true);
        $pluginFile = $versionId ? $data['files'][0] : $data[0]['files'][0];

        return ['url' => $pluginFile['url'], 'name' => $pluginFile['filename']];
    }

    /**
     * Fetches CurseForge plugin data based on pluginId and versionId.
     *
     * @param string $pluginId The ID of the plugin.
     * @param string|null $versionId The specific version ID of the plugin.
     * 
     * @return array Plugin file details including URL and filename.
     */
    private function fetchCurseForgePluginData(?string $pluginId, ?string $versionId): array
    {
        $client = $this->httpClient['curseforge'];
        $response = $client->get($versionId ? "mods/{$pluginId}/files/{$versionId}" : "mods/{$pluginId}/files");
        $data = json_decode($response->getBody()->getContents(), true);
        $pluginFile = $versionId ? $data['data'] : $data['data'][0];

        return [
            'url' => str_replace("edge", "mediafiles", $pluginFile['downloadUrl']),
            'name' => $pluginFile['fileName'],
        ];
    }

    /**
     * Fetches SpigotMC plugin data based on pluginId.
     *
     * @param string $pluginId The ID of the plugin.
     * 
     * @return array Plugin file details including URL and filename.
     */
    private function fetchSpigotmcPluginData(string $pluginId): array
    {
        $client = $this->httpClient['spigotmc'];
        $response = $client->get("resources/{$pluginId}");
        $plugin = json_decode($response->getBody()->getContents(), true);
        $externalUrl = $plugin['file']['externalUrl'] ?? null;

        $pluginFileUrl = str_ends_with($externalUrl, '.jar') ? $externalUrl : "https://cdn.spiget.org/file/spiget-resources/{$pluginId}.jar";
        $pluginName = $plugin['name'] . '.jar';

        return ['url' => $pluginFileUrl, 'name' => $pluginName];
    }

    /**
     * Fetches Hangar plugin data based on pluginId and versionId.
     *
     * @param string $pluginId The ID of the plugin.
     * @param string|null $versionId The specific version ID of the plugin.
     * 
     * @return array Plugin file details including URL and filename.
     */
    private function fetchHangarPluginData(?string $pluginId, ?string $versionId): array
    {
        $client = $this->httpClient['hangar'];
        if ($versionId) {
            list($versionNumber, $serverType) = explode(' - ', $versionId);
            $response = $client->get("projects/{$pluginId}/versions/{$versionNumber}");
            $data = json_decode($response->getBody()->getContents(), true);
            $pluginFileUrl = $data['downloads'][$serverType]['downloadUrl'] ?? $data['downloads'][$serverType]['externalUrl'];
            $pluginName = $data['downloads'][$serverType]['fileInfo']['name'];
        } else {
            $response = $client->get("projects/{$pluginId}/versions");
            $data = json_decode($response->getBody()->getContents(), true);
            $firstResult = $data['result'][0];
            $pluginFileUrl = $firstResult['downloads']['PAPER']['downloadUrl'] ?? $firstResult['downloads']['PAPER']['externalUrl'];
            $pluginName = $firstResult['downloads']['PAPER']['fileInfo']['name'];
        }
        return ['url' => $pluginFileUrl, 'name' => $pluginName];
    }

    /**
     * Fetches Polymart plugin data based on pluginId.
     *
     * @param string $pluginId The ID of the plugin.
     * 
     * @return array Plugin file details including URL and filename.
     */
    private function fetchPolymartPluginData(string $pluginId): array
    {
        $client = $this->httpClient['polymart'];
        $downloadResponse = $client->post("getDownloadURL", [
            'form_params' => [
                'allow_redirects' => '0',
                'resource_id' => $pluginId,
            ],
        ]);
        $downloadData = json_decode($downloadResponse->getBody()->getContents(), true);
        $pluginFileUrl = $downloadData['response']['result']['url'];

        $response = $client->get("getResourceInfo?resource_id={$pluginId}");
        $plugin = json_decode($response->getBody()->getContents(), true);
        $pluginName = $plugin['response']['resource']['title'] . '.jar';

        return ['url' => $pluginFileUrl, 'name' => $pluginName];
    }

    /**
     * Uploads SpigotMC plugins to the server. This is to fix the SpigotMC issue where it downloads the plugin with pluginId.jar
     */
    private function uploadPluginToServer(Server $server, string $pluginName, string $pluginContent, Request $request): array
    {
        try {
            $token = $this->jwtService
                ->setExpiresAt(CarbonImmutable::now()->addMinutes(15))
                ->setUser($request->user())
                ->setClaims(['server_uuid' => $server->uuid])
                ->handle($server->node, $request->user()->id . $server->uuid);

            $uploadUrl = sprintf(
                '%s/upload/file?token=%s&directory=%s',
                $server->node->getConnectionAddress(),
                $token->toString(),
                urlencode($this->directory)
            );

            $boundary = '----WebKitFormBoundary' . bin2hex(random_bytes(16));
            $postData = "--{$boundary}\r\n"
                . "Content-Disposition: form-data; name=\"files\"; filename=\"{$pluginName}\"\r\n"
                . "Content-Type: application/java-archive\r\n\r\n"
                . $pluginContent . "\r\n"
                . "--{$boundary}--\r\n";

            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL => $uploadUrl,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 0,
                CURLOPT_CUSTOMREQUEST => "POST",
                CURLOPT_POSTFIELDS => $postData,
                CURLOPT_HTTPHEADER => [
                    "Accept: application/json, text/plain, */*",
                    "Content-Type: multipart/form-data; boundary={$boundary}",
                    "Content-Length: " . strlen($postData),
                ],
            ]);
            
            $response = curl_exec($curl);
            curl_close($curl);

            return ['status' => 'success', 'message' => 'Plugin installed successfully'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'An error occurred during file upload: ' . $e->getMessage()];
        }
    }
}
