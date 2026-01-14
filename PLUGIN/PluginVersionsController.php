<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers\MCPlugins;

use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\MCPluginsConfig;
use Illuminate\Auth\Access\AuthorizationException;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;

class PluginVersionsController extends ClientApiController
{
    protected array $httpClient;

    /**
     * Constructs the PluginVersionsController.
     * Initializes HTTP clients with base URIs and headers.
     */
    public function __construct()
    {
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
    }

    /**
     * Fetches plugin versions from the specified provider.
     * 
     * @param Request $request The HTTP request containing query parameters.
     * @param Server $server The server associated with the request.
     * 
     * @throws AuthorizationException if the user does not have permission.
     */
    public function index(Request $request, Server $server)
    {
        if (!$request->user()->can(Permission::ACTION_FILE_READ, $server)) {
            throw new AuthorizationException();
        }
        $provider = $request->query('provider');
        $pluginId = $request->query('pluginId');

        $url = $this->getUrl($provider, $pluginId);
        $client = $this->httpClient[$provider];
        
        $response = $client->get($url);

        if ($response->getStatusCode() !== 200) {
            return response()->json(['status' => 'error', 'message' => 'Error fetching Versions'], 503);
        }

        $data = json_decode($response->getBody()->getContents(), true);
        $formattedData = $this->formatResponse($provider, $data);

        return response()->json(['data' => $formattedData]);
    }

    /**
     * Constructs the URL for fetching plugins versions based on the provider and pluginId.
     * 
     * @param string $provider The provider.
     * @param string|int $pluginId The ID of the plugin.
     * 
     * @return string The constructed URL for the API request.
     */
    private function getUrl(string $provider, string|int $pluginId): string
    {
        return match ($provider) {
            'modrinth' => "project/{$pluginId}/version",
            'curseforge' => "mods/{$pluginId}/files",
            'spigotmc' => "resources/{$pluginId}/versions?sort=-releaseDate",
            'hangar' => "projects/{$pluginId}/versions",
            'polymart' => "getResourceUpdates/&resource_id={$pluginId}",
        };
    }

    /**
     * Formats the API response data to a consistent structure.
     * 
     * @param string $provider The provider of plugins.
     * @param array $data The raw data from the API response.
     * 
     * @return array The formatted array of plugin versions.
     */
    private function formatResponse(string $provider, array $data): array
    {
        return match ($provider) {
            'modrinth' => array_map(fn($version) => [
                'provider' => $provider,
                'versionId' => $version['id'],
                'versionName' => $version['name'],
                'game_versions' => $version['game_versions'],
                'loaders' => $version['loaders'],
                'downloads' => $version['downloads'] > 0 ? $version['downloads'] : null,
                'downloadUrl' => null,
            ], $data),
            'curseforge' => array_map(fn($version) => [
                'provider' => $provider,
                'versionId' => $version['id'],
                'versionName' => $version['displayName'],
                'game_versions' => $version['gameVersions'],
                'loaders' => null,
                'downloads' => $version['downloadCount'] > 0 ? $version['downloadCount'] : null,
                'downloadUrl' => null,
            ], $data['data']),
            'hangar' => $this->formatHangarResponse($data['result'], $provider),
            'spigotmc' => array_map(fn($version) => [
                'provider' => $provider,
                'versionId' => $version['id'],
                'versionName' => $version['name'],
                'downloads' => $version['downloads'],
                'game_versions' => null,
                'loaders' => null,
                'downloadUrl' => "https://www.spigotmc.org/resources/{$version['resource']}/download?version={$version['id']}",
            ], $data),
            'polymart' => array_map(fn($version) => [
                'provider' => $provider,
                'versionId' => $version['id'],
                'versionName' => $version['version'],
                'game_versions' => null,
                'loaders' => null,
                'downloads' => null,
                'downloadUrl' => $version['url'],
            ], $data['response']['updates']),
        };
    }

    /**
     * Formats the API response data for Hangar.
     * 
     * @param string $provider The provider of plugins.
     * @param array $data The raw data from the API response.
     * 
     * @return array The formatted array of plugin versions.
     */
    private function formatHangarResponse(array $versions, string $provider): array
    {
        $uniqueVersions = [];
        foreach ($versions as $version) {
            $platformDownloads = [
                'PAPER' => isset($version['stats']['platformDownloads']['PAPER']) ? $version['stats']['platformDownloads']['PAPER'] : 0,
                'WATERFALL' => isset($version['stats']['platformDownloads']['WATERFALL']) ? $version['stats']['platformDownloads']['WATERFALL'] : 0,
                'VELOCITY' => isset($version['stats']['platformDownloads']['VELOCITY']) ? $version['stats']['platformDownloads']['VELOCITY'] : 0,
            ];
            foreach ($platformDownloads as $platform => $downloads) {
                if ($downloads > 0) {
                    $versionKey = $version['name'] . ' - ' . $platform;
                    if (!isset($uniqueVersions[$versionKey])) {
                        $uniqueVersions[$versionKey] = [
                            'provider' => $provider,
                            'versionId' => $versionKey,
                            'versionName' => $version['name'] . ' - ' . $platform,
                            'downloads' => $downloads,
                            'game_versions' => null,
                            'loaders' => null,
                            'downloadUrl' => null,
                        ];
                    }
                }
            }
        }
        return array_values($uniqueVersions);
    }
}
