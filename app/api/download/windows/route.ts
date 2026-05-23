import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const GITHUB_API = 'https://api.github.com/repos/koro0522isa-web/vlyp-app/releases/latest';

export async function GET() {
  try {
    const res = await fetch(GITHUB_API, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'vlyp-app' },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('GitHub API ' + res.status);
    const release = await res.json();
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const exeAsset =
      assets.find(a => /VLYP\.Clips\.Setup\..+\.exe$/i.test(a.name)) ||
      assets.find(a => /VLYP-Clips-Setup-.+\.exe$/i.test(a.name)) ||
      assets.find(a => /Setup.+\.exe$/i.test(a.name)) ||
      assets.find(a => /\.exe$/i.test(a.name));
    if (!exeAsset?.browser_download_url) throw new Error('exe asset not found');
    return NextResponse.redirect(exeAsset.browser_download_url, 302);
  } catch (err) {
    console.error('[download/windows] fallback:', err);
    return NextResponse.redirect('https://github.com/koro0522isa-web/vlyp-app/releases', 302);
  }
}
