<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers\MCPlugins;

use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\MCPluginsConfig;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;

class MCPluginsSettingsController extends ClientApiController
{
    /**
     * List all settings for MC Plugins.
     */
    public function index()
    {
        $settings = Cache::rememberForever('mcplugins_settings', function () {
            return MCPluginsConfig::select(
                'default_page_size',
                'default_provider',
                'text_install_button',
                'text_versions_button',
                'text_download_button',
                'text_search',
                'text_search_box',
                'text_version',
                'text_loader',
                'text_sort_by',
                'text_provider',
                'text_page_size',
                'text_not_found',
                'text_showing',
                'text_version_list',
                'text_versions_not_found',
                'text_version_downloads',
                'text_redirect_url',
                'text_download_url',
                'text_install_success',
                'text_install_failed',
            )->first();
        });

        return response()->json($settings);
    }
}
