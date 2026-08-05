
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DisclaimerPage() {
    return (
        <div className="container mx-auto py-10 px-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">Disclaimer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>
                        Moovie does not host any file on its servers. All files or contents hosted on third-party websites.
                        Moovie accepts no responsibility for content hosted on third-party websites.
                        We are just indexing those links which are already available on the internet.
                    </p>
                    <p>
                        If you have any legal issues please contact the appropriate media file owners or host sites.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
