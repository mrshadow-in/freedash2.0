import tw from 'twin.macro';
import { Formik, Form } from 'formik';
import Field from '@/components/elements/Field';
import Select from '@/components/elements/Select';
import React, { useEffect, useState } from 'react';

export const SearchRow = ({
    onSearch,
    minecraftVersion,
    setMinecraftVersion,
    provider,
    setProvider,
    sortBy,
    setSortBy,
    loader,
    setLoader,
    pageSize,
    setPageSize,
    textSearch,
    textSearchBox,
    textVersion,
    textLoader,
    textSortBy,
    textProvider,
    textPageSize,
}: {
    onSearch: (searchQuery: string) => void;
    minecraftVersion: string;
    setMinecraftVersion: React.Dispatch<React.SetStateAction<string>>;
    provider: string;
    setProvider: React.Dispatch<React.SetStateAction<string>>;
    sortBy: string;
    setSortBy: React.Dispatch<React.SetStateAction<string>>;
    loader: string;
    setLoader: React.Dispatch<React.SetStateAction<string>>;
    pageSize: number;
    setPageSize: React.Dispatch<React.SetStateAction<number>>;
    textSearch: string;
    textSearchBox: string;
    textVersion: string;
    textLoader: string;
    textSortBy: string;
    textProvider: string;
    textPageSize: string;
}) => {
    const [minecraftVersions, setMinecraftVersions] = useState<string[]>([]);

    useEffect(() => {
        const fetchMinecraftVersions = async () => {
            const response = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest.json');
            const data = await response.json();

            interface MinecraftVersions {
                id: string;
                type: string;
            }

            const versions = data.versions
                .filter((versionList: MinecraftVersions) => versionList.type === 'release')
                .map((versionList: MinecraftVersions) => versionList.id);

            setMinecraftVersions(versions);
        };

        fetchMinecraftVersions();
    }, []);

    const getSortOptions = (selectedProvider: string) => {
        switch (selectedProvider) {
            case 'modrinth':
                return [
                    { value: 'downloads', label: 'Downloads' },
                    { value: 'newest', label: 'Newest' },
                    { value: 'updated', label: 'Updated' },
                    { value: 'relevance', label: 'Relevance' },
                ];
            case 'curseforge':
                return [
                    { value: '6', label: 'Downloads' },
                    { value: '12', label: 'Ratings' },
                    { value: '2', label: 'Popularity' },
                    { value: '11', label: 'Newest' },
                    { value: '3', label: 'Updated' },
                ];
            case 'hangar':
                return [
                    { value: '-downloads', label: 'Downloads' },
                    { value: '-stars', label: 'Stars' },
                    { value: '-views', label: 'Views' },
                    { value: '-newest', label: 'Newest' },
                    { value: '-updated', label: 'Updated' },
                ];
            case 'spigotmc':
                return [
                    { value: '-downloads', label: 'Downloads' },
                    { value: '-rating', label: 'Ratings' },
                    { value: '-likes', label: 'Likes' },
                    { value: '-updateDate', label: 'Updated' },
                    { value: '-releaseDate', label: 'Latest' },
                ];
            case 'polymart':
                return [
                    { value: 'downloads', label: 'Downloads' },
                    { value: 'updated', label: 'Updated' },
                    { value: 'created', label: 'Created' },
                    { value: 'relevant', label: 'Relevant' },
                    { value: 'random', label: 'Random' },
                ];
            default:
                return [];
        }
    };

    const sortOptions = getSortOptions(provider);

    return (
        <Formik
            initialValues={{ searchQuery: '' }}
            onSubmit={(values) => {
                onSearch(values.searchQuery);
            }}
        >
            {({ values, handleChange }) => (
                <Form css={tw`w-full`}>
                    <div css={tw`flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4`}>
                        <div css={tw`flex-grow`}>
                            <label css={tw`block mb-1 text-sm`} htmlFor='searchQuery'>
                                {textSearch}
                            </label>
                            <Field
                                name={'searchQuery'}
                                placeholder={textSearchBox}
                                value={values.searchQuery}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    handleChange(e);
                                    onSearch(e.target.value);
                                }}
                                css={tw`w-full`}
                            />
                        </div>
                        <div css={tw`flex space-x-4`}>
                            {(provider === 'modrinth' || provider === 'curseforge' || provider === 'hangar') && (
                                <div css={tw`w-full lg:w-24`}>
                                    <label css={tw`block mb-1 text-sm`} htmlFor='mcVersion'>
                                        {textVersion}
                                    </label>
                                    <Select
                                        id='mcVersion'
                                        value={minecraftVersion}
                                        onChange={(e) => setMinecraftVersion(e.target.value)}
                                    >
                                        <option value=''>Any</option>
                                        {provider === 'hangar'
                                            ? Array.from(
                                                  new Set(
                                                      minecraftVersions.map((versionList) =>
                                                          versionList.split('.').slice(0, 2).join('.')
                                                      )
                                                  )
                                              ).map((uniqueVersion) => (
                                                  <option key={uniqueVersion} value={uniqueVersion}>
                                                      {`${uniqueVersion}`}
                                                  </option>
                                              ))
                                            : minecraftVersions.map((versionList) => (
                                                  <option key={versionList} value={versionList}>
                                                      {versionList}
                                                  </option>
                                              ))}
                                    </Select>
                                </div>
                            )}
                            {provider === 'modrinth' && (
                                <div css={tw`w-full lg:w-32`}>
                                    <label css={tw`block mb-1 text-sm`} htmlFor='serverLoader'>
                                        {textLoader}
                                    </label>
                                    <Select
                                        id='serverLoader'
                                        value={loader}
                                        onChange={(e) => setLoader(e.target.value)}
                                    >
                                        <option value='paper'>PaperMC</option>
                                        <option value='spigot'>Spigot</option>
                                        <option value='bukkit'>Bukkit</option>
                                        <option value='purpur'>Purpur</option>
                                        <option value='bungeecord'>Bungeecord</option>
                                        <option value='velocity'>Velocity</option>
                                        <option value='waterfall'>Waterfall</option>
                                    </Select>
                                </div>
                            )}
                        </div>
                        <div css={tw`flex space-x-4`}>
                            <div css={tw`w-2/5 lg:w-32`}>
                                <label css={tw`block mb-1 text-sm`} htmlFor='sortBy'>
                                    {textSortBy}
                                </label>
                                <Select id='sortBy' value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    {sortOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div css={tw`w-2/5 lg:w-32`}>
                                <label css={tw`block mb-1 text-sm`} htmlFor='provider'>
                                    {textProvider}
                                </label>
                                <Select
                                    id='provider'
                                    value={provider}
                                    onChange={(e) => {
                                        const newProvider = e.target.value;
                                        setProvider(newProvider);
                                        setSortBy(getSortOptions(newProvider)[0].value);
                                        if (newProvider === 'modrinth') {
                                            setLoader('paper');
                                        } else {
                                            setMinecraftVersion('');
                                            setLoader('');
                                        }
                                    }}
                                >
                                    <option value='modrinth'>Modrinth</option>
                                    <option value='curseforge'>CurseForge</option>
                                    <option value='spigotmc'>SpigotMC</option>
                                    <option value='hangar'>Hangar</option>
                                    <option value='polymart'>Polymart</option>
                                </Select>
                            </div>
                            <div css={tw`w-1/5 lg:w-16`}>
                                <label css={tw`block mb-1 text-sm`} htmlFor='pageSize'>
                                    {textPageSize}
                                </label>
                                <Select
                                    id='pageSize'
                                    value={pageSize}
                                    onChange={(e) => setPageSize(parseInt(e.target.value))}
                                >
                                    <option value={6}>6</option>
                                    <option value={12}>12</option>
                                    <option value={24}>24</option>
                                    <option value={48}>48</option>
                                </Select>
                            </div>
                        </div>
                    </div>
                </Form>
            )}
        </Formik>
    );
};

type VersionSearchRowProps = {
    onSearch: (search: string) => void;
    provider: string;
    minecraftVersion: string;
    setMinecraftVersion: React.Dispatch<React.SetStateAction<string>>;
    loader: string;
    setLoader: React.Dispatch<React.SetStateAction<string>>;
    textSearch: string;
    textSearchBox: string;
    textVersion: string;
    textLoader: string;
};

export const VersionSearchRow: React.FC<VersionSearchRowProps> = ({
    onSearch,
    provider,
    minecraftVersion,
    setMinecraftVersion,
    loader,
    setLoader,
    textSearch,
    textSearchBox,
    textVersion,
    textLoader,
}) => {
    const [minecraftVersions, setMinecraftVersions] = useState<string[]>([]);

    useEffect(() => {
        const fetchMinecraftVersions = async () => {
            const response = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest.json');
            const data = await response.json();

            interface MinecraftVersions {
                id: string;
                type: string;
            }

            const versions = data.versions
                .filter((versionList: MinecraftVersions) => versionList.type === 'release')
                .map((versionList: MinecraftVersions) => versionList.id);

            setMinecraftVersions(versions);
        };

        fetchMinecraftVersions();
    }, []);

    return (
        <Formik
            initialValues={{ search: '' }}
            onSubmit={(values) => {
                onSearch(values.search);
            }}
        >
            {({ values, handleChange }) => (
                <Form css={tw`w-full`}>
                    <div css={tw`flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4`}>
                        <div css={tw`flex-grow`}>
                            <label css={tw`block mb-1 text-sm`} htmlFor='search'>
                                {textSearch}
                            </label>
                            <Field
                                name={'search'}
                                placeholder={textSearchBox}
                                value={values.search}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    handleChange(e);
                                    onSearch(e.target.value);
                                }}
                                css={tw`w-full`}
                            />
                        </div>
                        {provider === 'modrinth' && (
                            <div css={tw`flex space-x-4`}>
                                <div css={tw`w-full lg:w-24`}>
                                    <label css={tw`block mb-1 text-sm`} htmlFor='mcVersion'>
                                        {textVersion}
                                    </label>
                                    <Select
                                        id='mcVersion'
                                        value={minecraftVersion}
                                        onChange={(e) => setMinecraftVersion(e.target.value)}
                                    >
                                        <option value=''>Any</option>
                                        {minecraftVersions.map((versionList) => (
                                            <option key={versionList} value={versionList}>
                                                {versionList}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                                <div css={tw`w-full lg:w-32`}>
                                    <label css={tw`block mb-1 text-sm`} htmlFor='serverLoader'>
                                        {textLoader}
                                    </label>
                                    <Select
                                        id='serverLoader'
                                        value={loader}
                                        onChange={(e) => setLoader(e.target.value)}
                                    >
                                        <option value=''>Any</option>
                                        <option value='paper'>PaperMC</option>
                                        <option value='spigot'>Spigot</option>
                                        <option value='bukkit'>Bukkit</option>
                                        <option value='purpur'>Purpur</option>
                                        <option value='bungeecord'>Bungeecord</option>
                                        <option value='velocity'>Velocity</option>
                                        <option value='waterfall'>Waterfall</option>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>
                </Form>
            )}
        </Formik>
    );
};
