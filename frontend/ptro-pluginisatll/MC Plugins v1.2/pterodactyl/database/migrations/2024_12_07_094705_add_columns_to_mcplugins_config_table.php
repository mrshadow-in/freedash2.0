<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('mcplugins_config', function (Blueprint $table) {
            $table->string('default_page_size')->nullable();
            $table->string('default_provider')->nullable();
            $table->string('text_install_button')->nullable();
            $table->string('text_versions_button')->nullable();
            $table->string('text_download_button')->nullable();
            $table->string('text_search')->nullable();
            $table->string('text_search_box')->nullable();
            $table->string('text_version')->nullable();
            $table->string('text_loader')->nullable();
            $table->string('text_sort_by')->nullable();
            $table->string('text_provider')->nullable();
            $table->string('text_page_size')->nullable();
            $table->string('text_not_found')->nullable();
            $table->string('text_showing')->nullable();
            $table->string('text_version_list')->nullable();
            $table->string('text_versions_not_found')->nullable();
            $table->string('text_version_downloads')->nullable();
            $table->string('text_redirect_url')->nullable();
            $table->string('text_download_url')->nullable();
            $table->string('text_install_success')->nullable();
            $table->string('text_install_failed')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mcplugins_config', function (Blueprint $table) {
            $table->dropColumn([
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
            ]);
        });
    }
};
