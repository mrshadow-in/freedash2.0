@extends('layouts.admin')

@section('title')
MC Plugins Installer
@endsection

@section('content-header')
<h1>
    MC Plugins Installer
    <small>Install & Manage Minecraft Plugins with ease.</small>
</h1>
<ol class="breadcrumb">
    <li><a href="{{ route('admin.index') }}">Admin</a></li>
    <li class="active">MC Plugins</li>
</ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12 col-md-6">
        <div class="box box-info">
            <div class="box-header with-border">
                <h3 class="box-title"><i class="fa fa-info-circle"></i> Information</h3>
            </div>
            <div class="box-body">
                <p>
                    <strong>MC Plugins</strong> is developed with
                    <i class="fa fa-heart" style="color: #FB0000"></i>
                    by <strong>sarthak77 (StellarStudios)</strong>.
                    Thanks a lot purchasing our extension!
                    If you have any questions or need assistance, Please contact us on
                    <a href="https://discord.gg/sQjuWcDxBY" target="_blank">Discord</a>.
                </p>
                <p>
                    If you like our extension, please leave us a review on the platform where you purchased it because that makes you cool 😎
                </p>
                <p>
                    You are currently using version <code>1.2</code> (latest: <code>{{ $latestRelease }}</code>)
                </p>
            </div>
            <div class="box-footer">
                <a type="submit" class="btn btn-primary" target="_blank"
                    href="https://www.sourcexchange.net/products/mcplugins">
                    <i class="fa fa-shopping-cart"></i> sourceXchange
                </a>
                <a type="button" class="btn btn-primary" target="_blank"
                    href="https://builtbybit.com/resources/mc-plugins-installer-for-pterodactyl.50779/">
                    <i class="fa fa-shopping-cart"></i> BuiltByBit
                </a>
                <a type="button" class="btn btn-primary" target="_blank"
                    href="https://discord.gg/sQjuWcDxBY">
                    <i class="fa fa-comment"></i> Discord
                </a>
                <a type="button" class="btn btn-primary" target="_blank"
                    href="https://github.com/StellarStudiosXYZ/mcplugins/releases">
                    <i class="fa fa-github"></i> GitHub
                </a>
            </div>
        </div>
    </div>

    <div class="col-xs-12 col-md-6">
        <div class="box box-success">
            <div class="box-header with-border">
                <h3 class="box-title"><i class="fa fa-cog"></i> Configurations</h3>
            </div>
            <form action="{{ route('admin.mcplugins.update') }}" method="POST">
                @csrf
                <div class="box-body">
                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label for="default_page_size">Default Page Size:</label>
                            <select class="form-control" autocomplete="off" id="default_page_size" name="default_page_size">
                                <option value="6" {{ $config->default_page_size == 6 ? 'selected' : '' }}>6</option>
                                <option value="12" {{ $config->default_page_size == 12 ? 'selected' : '' }}>12</option>
                                <option value="24" {{ $config->default_page_size == 24 ? 'selected' : '' }}>24</option>
                                <option value="48" {{ $config->default_page_size == 48 ? 'selected' : '' }}>48</option>
                            </select>
                        </div>
                        <div class="form-group col-md-6">
                            <label for="default_provider">Default Provider:</label>
                            <select class="form-control" autocomplete="off" id="default_provider" name="default_provider">
                                <option value="modrinth" {{ $config->default_provider == 'modrinth' ? 'selected' : '' }}>Modrinth</option>
                                <option value="curseforge" {{ $config->default_provider == 'curseforge' ? 'selected' : '' }}>CurseForge</option>
                                <option value="spigotmc" {{ $config->default_provider == 'spigotmc' ? 'selected' : '' }}>SpigotMC</option>
                                <option value="hangar" {{ $config->default_provider == 'hangar' ? 'selected' : '' }}>Hangar</option>
                                <option value="polymart" {{ $config->default_provider == 'polymart' ? 'selected' : '' }}>Polymart</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group col-md-12">
                        <label for="curseforge_api_key">CurseForge API Key:</label>
                        <input type="text" class="form-control" autocomplete="off" id="curseforge_api_key" name="curseforge_api_key" value="{{ $config->curseforge_api_key }}" placeholder="Enter your CurseForge API key">
                    </div>
                </div>
                <div class="box-footer">
                    <button type="submit" class="btn btn-primary"><i class="fa fa-save"></i> Save</button>
                </div>
            </form>
        </div>
    </div>
    <div class="col-xs-12 col-md-12">
        <div class="box box-warning">
            <div class="box-header with-border">
                <h3 class="box-title"><i class="fa fa-cog"></i> Text Configurations</h3>
            </div>
            <form action="{{ route('admin.mcplugins.update') }}" method="POST">
                @csrf
                <div class="box-body">
                    <div class="form-group col-md-12">
                        <label for="text_install_button">Text for Install Button:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_install_button"
                            name="text_install_button" value="{{ $config->text_install_button ?? 'Install' }}" placeholder="Install">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_versions_button">Text for Versions Button:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_versions_button"
                            name="text_versions_button" value="{{ $config->text_versions_button ?? 'Versions' }}" placeholder="Versions">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_download_button">Text for Download Button:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_download_button"
                            name="text_download_button" value="{{ $config->text_download_button ?? 'Download' }}" placeholder="Download">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_search">Text for Search Label:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_search"
                            name="text_search" value="{{ $config->text_search ?? 'Search' }}" placeholder="Search">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_search_box">Text for Search Box:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_search_box"
                            name="text_search_box" value="{{ $config->text_search_box ?? 'Search plugins...' }}" placeholder="Search plugins...">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_version">Text for Versions Label:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_version"
                            name="text_version" value="{{ $config->text_version ?? 'Versions' }}" placeholder="Versions">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_loader">Text for Server Loader Label:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_loader"
                            name="text_loader" value="{{ $config->text_loader ?? 'Server Loaders' }}" placeholder="Server Loaders">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_sort_by">Text for Sort By Label:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_sort_by"
                            name="text_sort_by" value="{{ $config->text_sort_by ?? 'Sort By' }}" placeholder="Sort By">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_provider">Text for Providers Label:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_provider"
                            name="text_provider" value="{{ $config->text_provider ?? 'Providers' }}" placeholder="Providers">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_page_size">Text for Page Size Label:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_page_size"
                            name="text_page_size" value="{{ $config->text_page_size ?? 'Size' }}" placeholder="Size">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_not_found">Text for Plugins Not Found:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_not_found"
                            name="text_not_found" value="{{ $config->text_not_found ?? 'No Plugins were found.' }}" placeholder="No Plugins were found.">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_showing">Text for Showing Plugins:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_showing"
                            name="text_showing" value="{{ $config->text_showing ?? 'Showing %_PLUGINS_% out of %_TOTAL_PLUGINS_% plugins.' }}" placeholder="Showing %_PLUGINS_% out of %_TOTAL_PLUGINS_% plugins.">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_version_list">Text for Versions List:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_version_list"
                            name="text_version_list" value="{{ $config->text_version_list ?? 'Available Versions for %_PLUGIN_NAME_%' }}" placeholder="Available Versions for %_PLUGIN_NAME_%">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_versions_not_found">Text for Versions Not Found:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_versions_not_found"
                            name="text_versions_not_found" value="{{ $config->text_versions_not_found ?? 'No versions of this plugin were found.' }}" placeholder="No versions of this plugin were found.">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_version_downloads">Text for Versions Downloads:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_version_downloads"
                            name="text_version_downloads" value="{{ $config->text_version_downloads ?? '%_VERSION_DOWNLOADS_% downloads' }}" placeholder="%_VERSION_DOWNLOADS_% downloads">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_redirect_url">Text for Redirect Url:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_redirect_url"
                            name="text_redirect_url" value="{{ $config->text_redirect_url ?? 'View the plugin\'s official page in a new tab.' }}" placeholder="View the plugin's official page in a new tab.">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_download_url">Text for Download Url:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_download_url"
                            name="text_download_url" value="{{ $config->text_download_url ?? 'This plugin is only available for download on its official website.' }}" placeholder="This plugin is only available for download on its official website.">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_install_success">Text for Install Success:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_install_success"
                            name="text_install_success" value="{{ $config->text_install_success ?? 'The plugin %_PLUGIN_NAME_% has been successfully installed in your Plugins folder.' }}" placeholder="The plugin %_PLUGIN_NAME_% has been successfully installed in your Plugins folder.">
                    </div>
                    <div class="form-group col-md-12">
                        <label for="text_install_failed">Text for Install Failed:</label>
                        <input type="text" class="form-control" autocomplete="off" id="text_install_failed"
                            name="text_install_failed" value="{{ $config->text_install_failed ?? 'We were not able to install the plugin %_PLUGIN_NAME_%. However, you can still download this plugin from its official website.' }}" placeholder="We were not able to install the plugin %_PLUGIN_NAME_%. However, you can still download this plugin from its official website.">
                    </div>
                </div>
                <div class="box-footer">
                    <button type="submit" class="btn btn-primary"><i class="fa fa-save"></i> Save</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection