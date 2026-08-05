'use client';

import { useState, useEffect } from 'react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Facebook, Twitter, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ShareButtonProps = {
    title: string;
    url: string;
};

export function ShareButton({ title, url }: ShareButtonProps) {
    const { toast } = useToast();
    const [shareUrl, setShareUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setShareUrl(url.startsWith('http') ? url : `${window.location.origin}${url}`);
        }
    }, [url]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        toast({
            title: "Link Copied",
            description: "The link has been copied to your clipboard.",
        });
    };

    const handleShare = (platform: 'facebook' | 'twitter' | 'whatsapp') => {
        let externalUrl = '';
        const encodedUrl = encodeURIComponent(shareUrl);
        const encodedTitle = encodeURIComponent(title);

        switch (platform) {
            case 'facebook':
                externalUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;
            case 'twitter':
                externalUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
                break;
            case 'whatsapp':
                externalUrl = `https://wa.me/?text=${encodedTitle} ${encodedUrl}`;
                break;
        }

        if (externalUrl) {
            window.open(externalUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="lg" variant="secondary">
                    <Share2 className="mr-2 h-5 w-5" />
                    Share
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyLink}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('facebook')}>
                    <Facebook className="mr-2 h-4 w-4" />
                    Facebook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('twitter')}>
                    <Twitter className="mr-2 h-4 w-4" />
                    Twitter
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
