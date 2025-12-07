import { useState, useEffect } from 'react';
import { Instagram, Twitter, Facebook, Youtube, Github, Globe, MessageCircle } from 'lucide-react';
import api from '../api/client';

interface SocialMediaLinks {
    discord?: string;
    instagram?: string;
    twitter?: string;
    facebook?: string;
    youtube?: string;
    github?: string;
    website?: string;
}

const SocialLinks = () => {
    const [socialMedia, setSocialMedia] = useState<SocialMediaLinks>({});

    useEffect(() => {
        fetchSocialLinks();
    }, []);

    const fetchSocialLinks = async () => {
        try {
            const res = await api.get('/settings');
            if (res.data?.socialMedia) {
                setSocialMedia(res.data.socialMedia);
            }
        } catch (error) {
            console.error('Failed to fetch social links');
        }
    };

    const socialPlatforms = [
        { key: 'discord', icon: MessageCircle, url: socialMedia.discord, color: 'hover:text-[#5865F2]' },
        { key: 'instagram', icon: Instagram, url: socialMedia.instagram, color: 'hover:text-[#E4405F]' },
        { key: 'twitter', icon: Twitter, url: socialMedia.twitter, color: 'hover:text-[#1DA1F2]' },
        { key: 'facebook', icon: Facebook, url: socialMedia.facebook, color: 'hover:text-[#1877F2]' },
        { key: 'youtube', icon: Youtube, url: socialMedia.youtube, color: 'hover:text-[#FF0000]' },
        { key: 'github', icon: Github, url: socialMedia.github, color: 'hover:text-white' },
        { key: 'website', icon: Globe, url: socialMedia.website, color: 'hover:text-purple-400' }
    ];

    // Filter out empty links
    const activeLinks = socialPlatforms.filter(platform => platform.url);

    if (activeLinks.length === 0) return null;

    return (
        <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">Follow us:</span>
            <div className="flex gap-3">
                {activeLinks.map((platform) => {
                    const Icon = platform.icon;
                    return (
                        <a
                            key={platform.key}
                            href={platform.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-2 bg-white/5 rounded-lg border border-white/10 transition duration-300 ${platform.color} hover:bg-white/10 hover:scale-110 transform`}
                            title={platform.key.charAt(0).toUpperCase() + platform.key.slice(1)}
                        >
                            <Icon size={20} />
                        </a>
                    );
                })}
            </div>
        </div>
    );
};

export default SocialLinks;
