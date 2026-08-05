'use client';

import type { CastMember } from "@/lib/definitions";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface CastSectionProps {
    cast: CastMember[];
}

export function CastSection({ cast }: CastSectionProps) {
    return (
        <section>
            <h2 className="text-2xl font-bold mb-4">Cast</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-x-2 gap-y-4 sm:gap-x-4">
                {cast.map(member => (
                    <div key={member.id} className="flex flex-col items-center text-center">
                        <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                            <AvatarImage src={member.profilePath} alt={member.name} />
                            <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <p className="font-semibold text-sm mt-2 truncate w-full">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate w-full">{member.character}</p>
                    </div>
                ))}
            </div>
        </section>
    )
}
