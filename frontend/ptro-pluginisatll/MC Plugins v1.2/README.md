# Welcome

Thank you for purchasing MC Plugins Installer! This extension simplifies the installation and management of Minecraft plugins. If you encounter any issues or have questions, feel free to reach out on our **Support Server**.

# Installation

Before using MC Plugins Installer, ensure that your Pterodactyl Panel Version is v1.11x

1. Open the `pterodactyl` folder, where you'll find three directories: `app`, `database` and `resources`. Please upload these directories to your Pterodactyl directory (commonly located at `/var/www/pterodactyl`).

2. Open the file `resources/scripts/routers/routes.ts`

- Find the code:

```js
import ServerActivityLogContainer from "@/components/server/ServerActivityLogContainer";
```

- Add this code below it:

```js
import PluginsManagerContainer from "@/components/server/mcplugins/PluginsManagerContainer";
```

- Find this code:

```js
        {
            path: '/files',
            permission: 'file.*',
            name: 'Files',
            component: FileManagerContainer,
        },
```

- Add this code below it: (refer to help-1.png for assistance)

```js

        {
            path: '/mcplugins',
            permission: 'file.*',
            name: 'Plugins',
            component: PluginsManagerContainer,
        },
```

3. Open the file `routes/api-client.php`

- Find this code:

```php
    Route::post('/command', [Client\Servers\CommandController::class, 'index']);
    Route::post('/power', [Client\Servers\PowerController::class, 'index']);
```

- Add this code below: (refer to help-2.png for assistance)

```php

    Route::group(['prefix' => '/mcplugins'], function () {
        Route::get('/', [Client\Servers\MCPlugins\PluginsManagerController::class, 'index']);
        Route::get('/version', [Client\Servers\MCPlugins\PluginVersionsController::class, 'index']);
        Route::post('/install', [Client\Servers\MCPlugins\InstallPluginsController::class, 'index']);
        Route::get('/settings', [Client\Servers\MCPlugins\MCPluginsSettingsController::class, 'index']);
    });
```

4. Open the file `routes/admin.php`

- Put this code in the last line: (refer to help-3.png for assistance)

```php

Route::group(['prefix' => 'mcplugins'], function () {
    Route::get('/', [Admin\MCPlugins\MCPluginsController::class, 'index'])->name('admin.mcplugins');
    Route::post('/', [Admin\MCPlugins\MCPluginsController::class, 'update'])->name('admin.mcplugins.update');
});
```

5. Open the file `resources/views/layouts/admin.blade.php`

- Find this code:

```php

                        <li class="{{ ! starts_with(Route::currentRouteName(), 'admin.nests') ?: 'active' }}">
                            <a href="{{ route('admin.nests') }}">
                                <i class="fa fa-th-large"></i> <span>Nests</span>
                            </a>
                        </li>
```

- Add this code below: (refer to help-4.png for assistance)

```php

                        <li class="{{ ! starts_with(Route::currentRouteName(), 'admin.mcplugins') ?: 'active' }}">
                            <a href="{{ route('admin.mcplugins') }}">
                                <i class="fa fa-cubes"></i> <span>MC Plugins</span>
                            </a>
                        </li>
```

6. Run these commands in your pterodactyl directory:

   1. `php artisan route:clear`
   2. `php artisan cache:clear`
   3. `php artisan migrate --seed --force`
   4. `chmod -R 777 /var/www/pterodactyl`

7. Build the Panel: Refer to the [Pterodactyl Docs](https://pterodactyl.io/community/customization/panel.html#building-assets)

8. **Set up CurseForge API**: For a vast library of Minecraft plugins, MC Plugins uses CurseForge API which requires an API key. To obtain your key, create a account at CurseForge Console (https://console.curseforge.com), generate an API key, and enter it in the extension's settings.

That's it! You're ready to start using the MC Plugins Extension.

# Need help?

If you have any questions or need assistance with the installation, feel free to contact me through the following:

- Support Server: https://discord.gg/sQjuWcDxBY
- Discord Username: @sarthak77
- Discord UserID: 877064899065446461

# Terms of Service

1. No refunds will be made.
2. You cannot resell or redistribute.
3. Chargebacks are strictly forbidden.
4. Uploading MC Plugins to third-party sites is not allowed.
5. Support is provided on our Discord.
6. Updates are not guaranteed.
7. You may not install MC Plugins on more than one server without consent.
