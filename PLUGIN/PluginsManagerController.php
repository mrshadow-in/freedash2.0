<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers\MCPlugins;

use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\MCPluginsConfig;
use Illuminate\Auth\Access\AuthorizationException;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;

class PluginsManagerController extends ClientApiController
{
    protected array $httpClient;
    
    /**
     * Constructs the PluginsManagerController.
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
     * Fetches a list of plugins based on various filters.
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
        $provider = $request->query('provider', 'modrinth');
        $page = $request->query('page', 1);
        $pageSize = $request->query('page_size', 6);
        $searchQuery = $request->query('search_query', '');
        $loader = $request->query('loader', '');
        $sortBy = $request->query('sort_by', '');
        $minecraftVersion = $request->query('minecraft_version', '');

        $url = $this->getUrl($provider, $page, $pageSize, $searchQuery, $loader, $sortBy, $minecraftVersion);
        $client = $this->httpClient[$provider];

        try {
            $response = $client->get($url);
            if ($response->getStatusCode() !== 200) {
                return response()->json(['status' => 'error', 'message' => 'Error fetching Plugins'], 503);
            }

            $data = json_decode($response->getBody()->getContents(), true);
            $pagination = $this->getPagination($provider, $data, $page, $pageSize);
            $formattedData = $this->formatResponse($provider, $data);

            return response()->json([
                'data' => $formattedData,
                'pagination' => $pagination
            ]);

        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Error fetching data: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Constructs the URL for API requests based on parameters.
     *
     * @param string $provider The provider for plugins.
     * @param int $page The current page.
     * @param int $pageSize The number of items per page.
     * @param string $searchQuery The search query.
     * @param string $loader The server loader.
     * @param string $sortBy The sort order.
     * @param string $minecraftVersion The Minecraft version filter.
     * 
     * @return string The constructed URL for the API request.
     */
    private function getUrl(
        string $provider,
        int $page,
        int $pageSize,
        string $searchQuery,
        string $loader,
        string $sortBy,
        string $minecraftVersion
    ): string {
        $offset = ($page - 1) * $pageSize;

        return match ($provider) {
            'modrinth' => $this->getModrinthUrl($pageSize, $searchQuery, $sortBy, $offset, $loader, $minecraftVersion),
            'curseforge' => $this->getCurseForgeUrl($pageSize, $searchQuery, $sortBy, $offset, $loader, $minecraftVersion),
            'hangar' => $this->getHangarUrl($pageSize, $offset, $searchQuery, $sortBy, $minecraftVersion),
            'spigotmc' => $this->getSpigotmcUrl($pageSize, $page, $searchQuery, $sortBy),
            'polymart' => $this->getPolymartUrl($pageSize, $page, $searchQuery, $sortBy),
        };
    }

    /**
     * Constructs Modrinth API URL.
     */
    private function getModrinthUrl(int $pageSize, string $searchQuery, string $sortBy, int $offset, string $loader, string $minecraftVersion): string
    {
        $facets = [
            ["categories:$loader"],
            ["server_side!=unsupported"],
        ];

        if ($minecraftVersion) {
            $facets[] = ["versions:$minecraftVersion"];
        }

        $facetsQuery = urlencode(json_encode($facets));

        return "search?limit={$pageSize}&query={$searchQuery}&index={$sortBy}&offset={$offset}&facets={$facetsQuery}";
    }

    /**
     * Constructs CurseForge API URL.
     */
    private function getCurseForgeUrl(int $pageSize, string $searchQuery, string $sortBy, int $offset, string $loader, string $minecraftVersion): string
    {
        $gameId = 432;
        $classId = 5;
        $sortOrder = "desc";

        return "mods/search?gameId={$gameId}&classId={$classId}&pageSize={$pageSize}&index={$offset}&searchFilter={$searchQuery}&modLoaderType={$loader}&gameVersion={$minecraftVersion}&sortField={$sortBy}&sortOrder={$sortOrder}";
    }

    /**
     * Constructs SpigotMC API URL.
     */
    private function getSpigotmcUrl(int $pageSize, int $page, string $searchQuery, string $sortBy): string
    {
        $url = $searchQuery ? "search/resources/{$searchQuery}" : "resources";
        return "{$url}?size={$pageSize}&page={$page}&sort={$sortBy}";
    }

    /**
     * Constructs Hangar API URL.
     */
    private function getHangarUrl(int $pageSize, int $offset, string $searchQuery, string $sortBy, string $minecraftVersion): string
    {
        $params = [
            'limit' => $pageSize,
            'offset' => $offset,
            'sort' => $sortBy,
        ];
        if ($minecraftVersion) {
            $params['version'] = $minecraftVersion;
        }
        if ($searchQuery) {
            $params['query'] = $searchQuery;
        }
        $queryString = http_build_query($params);
        
        return "projects?{$queryString}";
    }

    /**
     * Constructs Polymart API URL.
     */
    private function getPolymartUrl(int $pageSize, int $page, string $searchQuery, string $sortBy): string
    {
        return "search?limit={$pageSize}&start={$page}&query={$searchQuery}&sort={$sortBy}";
    }

    /**
     * Generates pagination details from the response data.
     */
    private function getPagination(string $provider, array $data, int $page, int $pageSize): array
    {
        return match ($provider) {
            'modrinth' => [
                'total' => (int)$data['total_hits'],
                'count' => count($data['hits']),
                'per_page' => $pageSize,
                'current_page' => $page,
                'total_pages' => (int)ceil($data['total_hits'] / $pageSize),
            ],
            'curseforge' => [
                'total' => (int)$data['pagination']['totalCount'],
                'count' => (int)$data['pagination']['resultCount'],
                'per_page' => $pageSize,
                'current_page' => $page,
                'total_pages' => (int)ceil(
                    ((int)$data['pagination']['totalCount'] < 5000 
                        ? (int)$data['pagination']['totalCount'] 
                        : 5000) / $pageSize
                ),
            ],
            'hangar' => [
                'total' => (int)$data['pagination']['count'],
                'count' => count($data['result']),
                'per_page' => $pageSize,
                'current_page' => $page,
                'total_pages' => (int)ceil($data['pagination']['count'] / $pageSize),
            ],
            'spigotmc' => [
                'total' => (int)(count($data) < $pageSize ? count($data) : 300),
                'count' => count($data),
                'per_page' => $pageSize,
                'current_page' => $page,
                'total_pages' => (int)(count($data) < $pageSize ? 1 : 50),
            ],
            'polymart' => [
                'total' => (int)$data['response']['total'],
                'count' => (int)$data['response']['result_count'],
                'per_page' => $pageSize,
                'current_page' => $page,
                'total_pages' => (int)ceil($data['response']['total'] / $pageSize),
            ],
        };
    }
    
    /**
     * Formats the response data based on the provider.
     */
    private function formatResponse(string $provider, array $data): array
    {
        return match ($provider) {
            'modrinth' => $this->formatModrinthResponse($data),
            'curseforge' => $this->formatCurseForgeResponse($data),
            'hangar' => $this->formatHangarResponse($data),
            'spigotmc' => $this->formatSpigotmcResponse($data),
            'polymart' => $this->formatPolymartResponse($data),
        };
    }

    /**
     * Formats Modrinth response data.
     */
    private function formatModrinthResponse(array $data): array
    {
        return array_map(function ($plugin) {
            return [
                'provider' => 'modrinth',
                'id' => $plugin['project_id'],
                'name' => $plugin['title'],
                'description' => $plugin['description'],
                'icon' => $plugin['icon_url'],
                'downloads' => $plugin['downloads'],
                'url' => "https://modrinth.com/plugin/{$plugin['project_id']}",
                'installable' => true,
            ];
        }, $data['hits']);
    }

    /**
     * Formats CurseForge response data.
     */
    private function formatCurseForgeResponse(array $data): array
    {
        return array_map(function ($plugin) {
            return [
                'provider' => 'curseforge',
                'id' => $plugin['id'],
                'name' => $plugin['name'],
                'description' => $plugin['summary'],
                'icon' => $plugin['logo']['url'] ?? null,
                'downloads' => $plugin['downloadCount'] ?? 0,
                'url' => "https://www.curseforge.com/minecraft/bukkit-plugins/{$plugin['slug']}",
                'installable' => true,
            ];
        }, $data['data']);
    }

    /**
     * Formats SpigotMC response data.
     */
    private function formatSpigotmcResponse(array $data): array
    {
        return array_map(function ($plugin) {
            $installable = true;
            if (isset($plugin['file']['externalUrl']) && !str_ends_with($plugin['file']['externalUrl'], '.jar')) {
                $installable = false;
            }
            if (isset($plugin['premium']) && $plugin['premium']) {
                $installable = false;
            }
            return [
                'provider' => 'spigotmc',
                'id' => $plugin['id'],
                'name' => $plugin['name'],
                'description' => $plugin['tag'],
                'icon' => "https://www.spigotmc.org/{$plugin['icon']['url']}",
                'downloads' => $plugin['downloads'],
                'url' => "https://www.spigotmc.org/resources/{$plugin['id']}",
                'installable' => $installable,
            ];
        }, $data);
    }

    /**
     * Formats Hangar response data.
     */
    private function formatHangarResponse(array $data): array
    {
        return array_map(function ($plugin) {
            return [
                'provider' => 'hangar',
                'id' => $plugin['name'],
                'name' => $plugin['name'],
                'description' => $plugin['description'],
                'icon' => $plugin['avatarUrl'],
                'downloads' => $plugin['stats']['downloads'],
                'url' => "https://hangar.papermc.io/{$plugin['namespace']['owner']}/{$plugin['name']}",
                'installable' => true,
            ];
        }, $data['result']);
    }

    /**
     * Formats Polymart response data.
     */
    private function formatPolymartResponse(array $data): array
    {
        return array_map(function ($plugin) {
            return [
                'provider' => 'polymart',
                'id' => $plugin['id'],
                'name' => $plugin['title'],
                'description' => $plugin['subtitle'],
                'icon' => $plugin['thumbnailURL'],
                'downloads' => $plugin['totalDownloads'],
                'url' => $plugin['url'],
                'installable' => (bool)$plugin['canDownload'],
            ];
        }, $data['response']['result']);
    }
}
