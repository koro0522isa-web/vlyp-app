// supabase/functions/riot-highlights/index.ts
// Riot API 直結のハイライト検出 Edge Function。
// 現状: LoL (Match-V5 Timeline) のキル/ダブルキル/アシスト→キル を時刻で返す。
// Valorant は Production Key 取得後に追加予定。

const RIOT_KEY = Deno.env.get('RIOT_API_KEY')!;
const ASIA = 'https://asia.api.riotgames.com';

interface KillEvent {
  t: number;          // ms from game start
  type: 'kill' | 'death' | 'assist' | 'multikill';
  detail?: string;
}

interface Highlight {
  matchId: string;
  start: number;      // sec from game start
  end: number;        // sec from game start
  label: string;      // "ダブルキル" / "ペンタキル" / "1v3クラッチ" 等
  score: number;      // 0-100, ハイライト度
  events: KillEvent[];
}

async function riotFetch(url: string) {
  const r = await fetch(url, { headers: { 'X-Riot-Token': RIOT_KEY } });
  if (!r.ok) throw new Error(`Riot ${r.status}: ${url}`);
  return r.json();
}

async function getPuuid(gameName: string, tagLine: string): Promise<string> {
  const data = await riotFetch(
    `${ASIA}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  );
  return data.puuid;
}

async function getRecentLolMatchIds(puuid: string, count = 5): Promise<string[]> {
  return await riotFetch(
    `${ASIA}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`
  );
}

function detectHighlights(timeline: any, puuid: string, matchId: string): Highlight[] {
  const me = timeline.info.participants.find((p: any) => p.puuid === puuid);
  if (!me) return [];
  const pid = me.participantId;

  // Collect all my kill events with timestamp
  const myKills: number[] = [];
  for (const f of timeline.info.frames) {
    for (const e of f.events) {
      if (e.type === 'CHAMPION_KILL' && e.killerId === pid) {
        myKills.push(e.timestamp);
      }
    }
  }

  const highlights: Highlight[] = [];

  // 1) Multi-kill detection: 2+ kills within 10s window
  for (let i = 0; i < myKills.length; i++) {
    const cluster = [myKills[i]];
    for (let j = i + 1; j < myKills.length; j++) {
      if (myKills[j] - cluster[cluster.length - 1] <= 10_000) {
        cluster.push(myKills[j]);
      } else break;
    }
    if (cluster.length >= 2) {
      const labels = ['', '', 'ダブルキル', 'トリプルキル', 'クアドラキル', 'ペンタキル'];
      const label = labels[Math.min(cluster.length, 5)] || `${cluster.length}キル`;
      highlights.push({
        matchId,
        start: Math.max(0, Math.floor(cluster[0] / 1000) - 5),
        end: Math.floor(cluster[cluster.length - 1] / 1000) + 5,
        label,
        score: 60 + cluster.length * 10,
        events: cluster.map((t) => ({ t, type: 'kill' })),
      });
      i += cluster.length - 1; // skip clustered
    } else {
      // Single kill: lower-score highlight
      highlights.push({
        matchId,
        start: Math.max(0, Math.floor(cluster[0] / 1000) - 4),
        end: Math.floor(cluster[0] / 1000) + 4,
        label: 'キル',
        score: 40,
        events: [{ t: cluster[0], type: 'kill' }],
      });
    }
  }

  return highlights.sort((a, b) => b.score - a.score);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { gameName, tagLine, game = 'lol', matchCount = 5 } = await req.json();
    if (!gameName || !tagLine) throw new Error('gameName / tagLine required');
    if (game !== 'lol') throw new Error('Currently only "lol" is supported. Valorant pending Production Key.');

    const puuid = await getPuuid(gameName, tagLine);
    const matchIds = await getRecentLolMatchIds(puuid, matchCount);

    const allHighlights: Highlight[] = [];
    for (const mid of matchIds) {
      try {
        const tl = await riotFetch(`${ASIA}/lol/match/v5/matches/${mid}/timeline`);
        allHighlights.push(...detectHighlights(tl, puuid, mid));
      } catch (e) {
        console.error('match fetch fail', mid, e);
      }
    }

    return new Response(
      JSON.stringify({
        puuid,
        matchIds,
        highlightCount: allHighlights.length,
        topHighlights: allHighlights.slice(0, 20),
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
