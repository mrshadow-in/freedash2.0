<?php

namespace Pterodactyl\Http\Controllers\Admin\MCPlugins;

use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Models\MCPluginsConfig;
use Pterodactyl\Http\Controllers\Controller;

class MCPluginsController extends Controller
{
    /**
     * Constructs the MCPluginsController.
     */
    public function __construct(
        protected AlertsMessageBag $alert,
    ) {}

    public function index()
    {
        $config = MCPluginsConfig::first();
        if (!$config) {
            $config = new MCPluginsConfig();
            $config->curseforge_api_key = null;
            $config->default_page_size = null;
            $config->default_provider = null;
            $config->save();
        }

        $latestRelease = $this->fetchLatestRelease();

        return view('admin.mcplugins.index', [
            'config' => $config,
            'latestRelease' => $latestRelease,
        ]);
    }

    /**
     * Updates the configurations settings in databse.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'curseforge_api_key' => 'nullable|string|max:255',
            'default_page_size' => 'nullable|integer|min:1|max:48',
            'default_provider' => 'nullable|string|max:255',
            'text_install_button' => 'nullable|string|max:255',
            'text_versions_button' => 'nullable|string|max:255',
            'text_download_button' => 'nullable|string|max:255',
            'text_search' => 'nullable|string|max:255',
            'text_search_box' => 'nullable|string|max:255',
            'text_version' => 'nullable|string|max:255',
            'text_loader' => 'nullable|string|max:255',
            'text_sort_by' => 'nullable|string|max:255',
            'text_provider' => 'nullable|string|max:255',
            'text_page_size' => 'nullable|string|max:255',
            'text_not_found' => 'nullable|string|max:255',
            'text_showing' => 'nullable|string|max:255',
            'text_version_list' => 'nullable|string|max:255',
            'text_versions_not_found' => 'nullable|string|max:255',
            'text_version_downloads' => 'nullable|string|max:255',
            'text_redirect_url' => 'nullable|string|max:255',
            'text_download_url' => 'nullable|string|max:255',
            'text_install_success' => 'nullable|string|max:255',
            'text_install_failed' => 'nullable|string|max:255',
        ]);

        $config = MCPluginsConfig::first();
        $config->fill($validated);
        $config->save();

        Cache::forget('mcplugins_settings');

        $this->alert->success('Configurations updated successfully!')->flash();
        return redirect()->route('admin.mcplugins');
    }

    /**
     * Fetches latest version of MC Plugins from GitHub Releases.
     */
    private function fetchLatestRelease()
    {
        try {
            return Cache::remember('mcplugins_latest_version', 60, function () {
                $client = new Client();
                $response = $client->get('https://api.github.com/repos/StellarStudiosXYZ/mcplugins/releases/latest', [
                    'headers' => [
                        'Accept' => 'application/vnd.github.v3+json',
                    ],
                ]);
                $data = json_decode($response->getBody(), true);
                return $data['tag_name'];
            });
        } catch (\Exception $e) {
            Log::error('Failed to fetch MC Plugins latest release data: ' . $e->getMessage());
            return "Unknown";
        }
    }
}
